import { createHash } from 'node:crypto';
import {
  cleanProfile,
  branchFor,
  activeRoles,
  object,
  reconcile,
  profileFields,
  readonlyFields,
} from './orgo-profile';
import { MembersService } from './members.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CurrentUser } from '../users/users.types';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { OrgoConnection } from '../users/entities/orgo-connection.entity';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import {
  ScoutMember,
  ScoutUnit,
  LocalStructure,
  ScoutAssignment,
  MemberSettings,
  MemberSync,
} from './entities/member.entity';
import { bodyObject, stringValue } from './members.service';
import { emptyProfile, targetYear, branches } from './member.types';

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
function withoutPatrols(units: Record<string, unknown>[]) {
  const excluded = new Set<number>();
  for (const unit of units) {
    const type = obj(unit.unitType);
    const labels = [type.name, type.namePlural].map((label) =>
      typeof label === 'string'
        ? label
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase()
        : '',
    );
    if (labels.some((label) => /^patrul/.test(label)))
      excluded.add(Number(unit.id));
  }
  // Never retain descendants whose imported parent would be a patrol.
  let previousSize = -1;
  while (previousSize !== excluded.size) {
    previousSize = excluded.size;
    for (const unit of units)
      if (excluded.has(Number(obj(unit.parent).id)))
        excluded.add(Number(unit.id));
  }
  return units.filter((unit) => !excluded.has(Number(unit.id)));
}
const remoteFields = (
  raw: Record<string, unknown>,
): Record<string, unknown> => ({
  name:
    typeof raw.fullName === 'string'
      ? raw.fullName
      : [raw.firstName, raw.lastName]
          .filter((v) => typeof v === 'string')
          .join(' '),
  status: raw.status,
  email: raw.email ?? '',
  phone: raw.phoneNumber ?? '',
});

@Injectable()
export class MemberOrgoService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
    @Optional() private readonly members?: MembersService,
  ) {}
  private definitions: Record<string, unknown>[] = [];
  private cached?: { at: number; rows: Record<string, unknown>[] };
  private async detailedRoster() {
    if (this.cached && Date.now() - this.cached.at < 120000)
      return this.cached.rows;
    const tenants = await this.request(
      '/api/v1/tenants?appHost=' +
        encodeURIComponent(new URL(this.settings().base).hostname),
    );
    const tenantRows = tenants['hydra:member'];
    if (Array.isArray(tenantRows) && tenantRows.length === 1)
      this.definitions = (
        Array.isArray(object(tenantRows[0]).customFields)
          ? (object(tenantRows[0]).customFields as unknown[])
          : []
      )
        .map(object)
        .map((d) => ({
          id: d.id,
          name: d.name ?? d.label,
          type: d.type,
          visibility: d.visibility,
          options: d.options,
        }));
    const roster = await this.roster(),
      rows: Record<string, unknown>[] = [];
    let index = 0;
    await Promise.all(
      Array.from({ length: 6 }, async () => {
        while (index < roster.length) {
          const row = roster[index++];
          const detail = await this.request('/api/v1/users/' + Number(row.id));
          if (
            Number(detail.id) !== Number(row.id) ||
            Number(object(detail.localCenter).id) !== this.settings().center
          )
            throw new BadGatewayException('Fișă Orgo din alt centru.');
          rows.push(detail);
        }
      }),
    );
    rows.sort((a, b) => Number(a.id) - Number(b.id));
    this.cached = { at: Date.now(), rows };
    return rows;
  }
  private projectProfile(m: ScoutMember) {
    const p = m.orgoProfile ?? {};
    if (typeof p.firstName === 'string' && typeof p.lastName === 'string')
      m.name = [p.firstName, p.middleName, p.lastName]
        .filter(Boolean)
        .join(' ');
    if (
      typeof p.dateBirth === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(p.dateBirth)
    )
      m.birthDate = p.dateBirth.slice(0, 10);
    m.profile = {
      ...m.profile,
      ...(typeof p.email === 'string' ? { email: p.email } : {}),
      ...(typeof p.phoneNumber === 'string' ? { phone: p.phoneNumber } : {}),
    };
  }
  private rolePreview(raw: Record<string, unknown>) {
    return activeRoles(raw).map((r) => ({
      id: Number(object(r.role).id),
      name: object(r.role).name,
      unitId: Number(object(r.unit).id) || null,
      unitName: object(r.unit).name ?? null,
    }));
  }
  private version(rows: Record<string, unknown>[]) {
    return createHash('sha256')
      .update(
        JSON.stringify(
          rows.map((r) => ({
            id: r.id,
            status: r.status,
            profile: cleanProfile(r),
            roles: this.rolePreview(r),
          })),
        ),
      )
      .digest('hex');
  }
  private async applyImportedRoles(
    tx: EntityManager,
    m: ScoutMember,
    r: Record<string, unknown>,
    actorId: number,
  ) {
    const incomingBranch = branchFor(r);
    if (m.branch && incomingBranch && m.branch !== incomingBranch) {
      const ids: Record<string, number> = {
        lupisori: 38,
        temerari: 39,
        exploratori: 40,
        seniori: 41,
      };
      const local = { id: ids[m.branch], name: m.branch };
      m.orgoProfile = { ...m.orgoProfile, type: local };
      m.orgoConflicts = {
        ...m.orgoConflicts,
        type: { local, remote: cleanProfile(r).type },
      };
      return;
    }
    if (!m.branch) m.branch = incomingBranch;
    if (Number(object(r.type).id) === 42) m.promiseSource = 'orgo-leader';
    if (Number(object(r.type).id) === 44) m.adultKind = 'scouter';
    else if (!m.branch) m.adultKind = 'volunteer';
    if (m.status !== 'active') return;
    const adult =
      !!m.birthDate &&
      m.birthDate <=
        new Date(new Date().setUTCFullYear(new Date().getUTCFullYear() - 18))
          .toISOString()
          .slice(0, 10);
    const units = await tx.find(ScoutUnit, { archived: false, parentId: null });
    const roles = this.rolePreview(r);
    for (const old of await tx.find(ScoutAssignment, {
      memberId: m.id,
      endedAt: null,
      orgoRoleId: { $ne: null },
    })) {
      const oldUnit = units.find((u) => u.id === old.unitId);
      if (
        !roles.some(
          (role) =>
            role.id === old.orgoRoleId &&
            (old.unitId
              ? role.unitId === oldUnit?.orgoId
              : !role.unitId || role.unitId === this.settings().center),
        )
      )
        old.endedAt = new Date();
    }
    await tx.flush();
    if (m.branch && !m.unitId) {
      const candidates = units.filter(
        (u) =>
          u.branch === m.branch &&
          (u.structureId ?? 'cluj') === (m.structureId ?? 'cluj') &&
          roles.some((a) => a.unitId === u.orgoId),
      );
      if (candidates.length === 1) {
        m.unitId = candidates[0].id;
        m.groupId = null;
        tx.create(ScoutAssignment, {
          memberId: m.id,
          unitId: m.unitId,
          groupId: null,
          role: 'beneficiary',
          actorId,
        });
      }
    }
    for (const role of roles) {
      const unit = units.find((u) => u.orgoId === role.unitId);
      const mapped =
        role.id === 8 || role.id === 3
          ? 'council'
          : role.id === 7
            ? 'chief'
            : [1, 18].includes(role.id)
              ? 'leader'
              : [6, 19].includes(role.id)
                ? 'helper'
                : null;
      if (!mapped || !adult || (mapped !== 'council' && !unit)) continue;
      if (
        ['chief', 'leader'].includes(mapped) &&
        ((!m.promiseDate && m.promiseSource !== 'orgo-leader') ||
          m.branch === 'seniori')
      )
        continue;
      if (
        mapped === 'council' &&
        role.unitId &&
        role.unitId !== this.settings().center
      )
        continue;
      if (
        mapped === 'chief' &&
        (await tx.findOne(ScoutAssignment, {
          unitId: unit!.id,
          role: 'chief',
          endedAt: null,
          memberId: { $ne: m.id },
        }))
      )
        continue;
      const unitId = mapped === 'council' ? null : unit!.id;
      if (
        !(await tx.findOne(ScoutAssignment, {
          memberId: m.id,
          unitId,
          role: mapped,
        }))
      )
        tx.create(ScoutAssignment, {
          memberId: m.id,
          unitId,
          groupId: null,
          role: mapped,
          orgoRoleId: role.id,
          actorId,
        });
      if (mapped === 'council' && m.accountId) {
        const account = await tx.findOne(User, { id: m.accountId });
        if (account && !account.memberAccessDisabled)
          account.councilAdmin = true;
      }
    }
    if (m.accountId) {
      await tx.flush();
      const account = await tx.findOne(User, { id: m.accountId });
      if (account)
        account.councilAdmin =
          !account.memberAccessDisabled &&
          !!(await tx.findOne(ScoutAssignment, {
            memberId: m.id,
            role: 'council',
            endedAt: null,
          }));
    }
  }
  async refresh(user: CurrentUser) {
    await this.admin(user);
    this.cached = undefined;
    return this.refreshProfiles();
  }
  async refreshProfiles() {
    const em = this.em.fork(),
      existing = await em.find(ScoutMember, { orgoId: { $ne: null } });
    let updated = 0;
    for (const initial of existing) {
      const r = await this.request('/api/v1/users/' + initial.orgoId);
      if (
        Number(r.id) !== initial.orgoId ||
        Number(object(r.localCenter).id) !== this.settings().center
      )
        throw new BadGatewayException('Identitate Orgo invalidă.');
      await em.fork().transactional(async (tx) => {
        await tx.execute('select pg_advisory_xact_lock(19102026)');
        const m = await tx.findOneOrFail(
          ScoutMember,
          { id: initial.id },
          { refresh: true },
        );
        const result = reconcile(
          m.orgoBase ?? {},
          m.orgoProfile ?? {},
          cleanProfile(r),
        );
        const before = JSON.stringify({
          profile: m.orgoProfile,
          conflicts: m.orgoConflicts,
        });
        m.orgoProfile = {
          ...result.values,
          customDefinitions: m.orgoProfile?.customDefinitions ?? [],
          rolesPending: this.rolePreview(r),
        };
        m.orgoBase = result.base;
        m.orgoConflicts = result.conflicts;
        this.projectProfile(m);
        if (
          before !==
          JSON.stringify({ profile: m.orgoProfile, conflicts: m.orgoConflicts })
        ) {
          m.revision++;
          m.updatedAt = new Date();
          updated++;
        }
      });
    }
    await em.transactional(async (tx) => {
      const settings =
        (await tx.findOne(MemberSettings, { id: 'default' })) ??
        tx.create(MemberSettings, { id: 'default' });
      settings.lastOrgoRefresh = new Date();
    });
    return { updated };
  }
  async daily() {
    const em = this.em.fork();
    const settings = await em.findOne(MemberSettings, { id: 'default' });
    if (
      !settings?.lastOrgoRefresh ||
      Date.now() - settings.lastOrgoRefresh.getTime() > 86400000
    ) {
      if (await em.count(ScoutMember, { orgoId: { $ne: null } }))
        await this.refreshProfiles();
    }
  }
  async saveProfile(user: CurrentUser, id: string, input: unknown) {
    if (!this.members) throw new ServiceUnavailableException();
    const detail = await this.members.detail(user, id);
    if (!detail.access.edit && !detail.access.own)
      throw new ForbiddenException();
    const b = bodyObject(input),
      values = bodyObject(b.values ?? {});
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const m = await tx.findOneOrFail(ScoutMember, { id }, { refresh: true });
      const grant = await this.members!.access(tx, user, m);
      if (!grant.edit && !grant.own) throw new ForbiddenException();
      if (m.revision !== Number(b.revision))
        throw new ConflictException('Fișa s-a schimbat. Reîncarcă.');
      const patch: Record<string, unknown> = {};
      const custom: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(values)) {
        if (key.startsWith('custom:')) {
          const fieldId = Number(key.slice(7)),
            definitions = Array.isArray(m.orgoProfile?.customDefinitions)
              ? m.orgoProfile.customDefinitions.map(object)
              : [],
            definition = definitions.find((d) => Number(d.id) === fieldId);
          if (
            !definition ||
            (definition.visibility === 'admin' && !grant.identity)
          )
            throw new ForbiddenException('Câmp Orgo protejat.');
          const fields = Array.isArray(m.orgoProfile.customFieldValues)
            ? m.orgoProfile.customFieldValues.map(object)
            : [];
          const previous = fields.find(
            (v) => Number(v.field) === fieldId,
          )?.value;
          if (typeof value !== 'string' || value.length > 4000)
            throw new BadRequestException('Valoare invalidă.');
          custom[String(fieldId)] =
            typeof previous === 'boolean'
              ? value === 'true'
              : typeof previous === 'number'
                ? Number(value)
                : value;
          if (
            typeof previous === 'number' &&
            !Number.isFinite(custom[String(fieldId)])
          )
            throw new BadRequestException('Număr invalid.');
          continue;
        }
        if (!(key in profileFields) || readonlyFields.has(key))
          throw new BadRequestException('Câmp nemodificabil.');
        if (
          [
            'firstName',
            'lastName',
            'middleName',
            'dateBirth',
            'dateJoined',
            'dateJoinedFullMember',
          ].includes(key) &&
          !grant.identity
        )
          throw new ForbiddenException();
        if (typeof value !== 'string' || value.length > 4000)
          throw new BadRequestException('Valoare invalidă.');
        patch[key] = value.trim() || null;
      }
      if (Object.keys(custom).length) {
        const fields = Array.isArray(m.orgoProfile.customFieldValues)
          ? m.orgoProfile.customFieldValues.map(object)
          : [];
        for (const [id, value] of Object.entries(custom)) {
          const field = fields.find((f) => Number(f.field) === Number(id));
          if (field) field.value = value;
          else fields.push({ field: Number(id), value, media: null });
        }
        m.orgoProfile = { ...m.orgoProfile, customFieldValues: fields };
        patch.rawUserCustomFieldsValues = Object.fromEntries(
          fields.map((f) => [String(f.field), f.value]),
        );
      }
      m.orgoProfile = {
        ...m.orgoProfile,
        ...Object.fromEntries(
          Object.entries(patch).filter(
            ([key]) => key !== 'rawUserCustomFieldsValues',
          ),
        ),
      };
      this.projectProfile(m);
      m.revision++;
      tx.create(MemberSync, {
        memberId: id,
        revision: m.revision,
        actorId: user.id,
        kind: 'orgo-profile',
        payload: patch,
        baseline: m.orgoBase ?? {},
        message: 'În așteptarea sincronizării.',
      });
      tx.create(AuditEntry, {
        actorId: user.id,
        action: 'members.orgo-profile',
        entityType: 'Member',
        entityId: id,
        metadata: { fields: Object.keys(patch) },
      });
      return { ok: true };
    });
  }
  async photo(user: CurrentUser, id: string) {
    if (!this.members) throw new ServiceUnavailableException();
    const detail = await this.members.detail(user, id),
      logo = detail.member.orgoProfile.logo;
    if (typeof logo !== 'string' || !logo)
      throw new BadRequestException('Fotografie indisponibilă.');
    if (logo.startsWith('data:')) return this.decodePhoto(logo);
    const origin = 'https://orgostatic.s3.eu-central-1.amazonaws.com';
    const url = new URL(
      logo.startsWith('https://')
        ? logo
        : '/media/user/' + encodeURIComponent(logo),
      origin,
    );
    if (url.origin !== origin || !url.pathname.startsWith('/media/'))
      throw new BadRequestException('Referință de fotografie invalidă.');
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new BadGatewayException('Fotografia Orgo nu este disponibilă.');
    const reader = response.body?.getReader();
    if (!reader) throw new BadGatewayException();
    const parts: Buffer[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 2097152) {
        await reader.cancel();
        throw new BadRequestException('Imagine prea mare.');
      }
      parts.push(Buffer.from(part.value));
    }
    const bytes = Buffer.concat(parts);
    return this.decodePhoto(
      'data:' +
        String(response.headers.get('content-type')).split(';')[0] +
        ';base64,' +
        bytes.toString('base64'),
    );
  }
  private decodePhoto(value: string) {
    const match =
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (!match || value.length > 2800000)
      throw new BadRequestException(
        'Alege o fotografie JPG, PNG sau WebP de maximum 2 MB.',
      );
    const bytes = Buffer.from(match[2], 'base64');
    const good =
      match[1] === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : match[1] === 'image/png'
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes.toString('ascii', 0, 4) === 'RIFF' &&
            bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!good || bytes.length > 2097152)
      throw new BadRequestException('Fișierul nu este o fotografie validă.');
    return { bytes, type: match[1] };
  }
  async savePhoto(user: CurrentUser, id: string, input: unknown) {
    if (!this.members) throw new ServiceUnavailableException();
    const detail = await this.members.detail(user, id);
    if (!detail.access.edit && !detail.access.own)
      throw new ForbiddenException();
    const b = bodyObject(input),
      data = stringValue(b.data, 2800000);
    this.decodePhoto(data);
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const m = await tx.findOneOrFail(ScoutMember, { id }, { refresh: true });
      const grant = await this.members!.access(tx, user, m);
      if (!grant.edit && !grant.own) throw new ForbiddenException();
      if (m.revision !== Number(b.revision))
        throw new ConflictException('Reîncarcă fișa.');
      m.orgoProfile = { ...m.orgoProfile, logo: data };
      m.revision++;
      tx.create(MemberSync, {
        memberId: id,
        revision: m.revision,
        actorId: user.id,
        kind: 'photo',
        payload: {},
        baseline: { logo: m.orgoBase?.logo ?? null },
        message: 'Fotografie salvată local; sincronizare în așteptare.',
      });
      tx.create(AuditEntry, {
        actorId: user.id,
        action: 'members.photo',
        entityType: 'Member',
        entityId: id,
        metadata: {},
      });
      return { ok: true };
    });
  }
  async resolve(user: CurrentUser, id: string, input: unknown) {
    if (!this.members) throw new ServiceUnavailableException();
    const detail = await this.members.detail(user, id),
      b = bodyObject(input),
      key = stringValue(b.key);
    if (!detail.access.edit && !detail.access.own)
      throw new ForbiddenException();
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const m = await tx.findOneOrFail(ScoutMember, { id }, { refresh: true });
      const grant = await this.members!.access(tx, user, m);
      if (!grant.edit && !grant.own) throw new ForbiddenException();
      if (m.revision !== Number(b.revision))
        throw new ConflictException('Reîncarcă fișa.');
      const conflict = m.orgoConflicts?.[key];
      if (!conflict) throw new ConflictException('Conflict deja rezolvat.');
      if (!grant.identity)
        throw new ForbiddenException(
          'Rezolvarea diferențelor este rezervată șefului sau consiliului.',
        );
      const local = b.choice === 'local';
      if (!local && b.choice !== 'remote') throw new BadRequestException();
      m.orgoProfile = {
        ...m.orgoProfile,
        [key]: local ? conflict.local : conflict.remote,
      };
      m.orgoBase = { ...m.orgoBase, [key]: conflict.remote };
      const conflicts = { ...m.orgoConflicts };
      delete conflicts[key];
      m.orgoConflicts = conflicts;
      this.projectProfile(m);
      m.revision++;
      if (local)
        tx.create(MemberSync, {
          memberId: id,
          revision: m.revision,
          actorId: user.id,
          kind: key === 'logo' ? 'photo' : 'orgo-profile',
          payload:
            key === 'customFieldValues'
              ? {
                  rawUserCustomFieldsValues: Object.fromEntries(
                    (Array.isArray(conflict.local) ? conflict.local : [])
                      .map(object)
                      .map((f) => [String(f.field), f.value]),
                  ),
                }
              : { [key]: conflict.local },
          baseline: m.orgoBase,
          message: 'Rezolvare locală în așteptare.',
        });
      tx.create(AuditEntry, {
        actorId: user.id,
        action: 'members.conflict-resolved',
        entityType: 'Member',
        entityId: id,
        metadata: { key, choice: b.choice },
      });
      return { ok: true };
    });
  }
  private async admin(user: CurrentUser, em = this.em) {
    const account = await em.findOneOrFail(
      User,
      { id: user.id },
      { refresh: true },
    );
    if (
      account.memberAccessDisabled ||
      (!account.councilAdmin &&
        !account.roles.some((r) =>
          [UserRole.Admin, UserRole.SuperAdmin].includes(r),
        ))
    )
      throw new ForbiddenException('Acces rezervat administratorilor.');
  }
  private settings() {
    const token = this.config.get<string>('ORGO_API_TOKEN')?.trim();
    const center = Number(this.config.get<string>('ORGO_LOCAL_CENTER_ID'));
    const base = this.config.getOrThrow<string>('ORGO_OAUTH_BASE_URL');
    if (!token || !Number.isInteger(center) || center <= 0)
      throw new ServiceUnavailableException(
        'Configurează tokenul server-to-server și ID-ul centrului local Orgo.',
      );
    if (new URL(base).protocol !== 'https:')
      throw new ServiceUnavailableException(
        'Adresa Orgo trebuie să folosească HTTPS.',
      );
    return { token, center, base };
  }
  private async request(path: string, patch?: Record<string, unknown>) {
    const s = this.settings(),
      url = new URL(path, s.base);
    if (
      url.origin !== new URL(s.base).origin ||
      !url.pathname.startsWith('/api/v1/')
    )
      throw new BadGatewayException('Adresă Orgo invalidă.');
    const response = await fetch(url, {
      method: patch ? 'PATCH' : 'GET',
      headers: {
        'Api-Token': s.token,
        Accept: 'application/ld+json, application/json',
        ...(patch ? { 'Content-Type': 'application/merge-patch+json' } : {}),
      },
      ...(patch ? { body: JSON.stringify(patch) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new ServiceUnavailableException(
        [401, 403].includes(response.status)
          ? 'Tokenul server-to-server nu permite operațiunea Orgo.'
          : `Orgo nu a confirmat operațiunea (${response.status}).`,
      );
    return obj(await response.json());
  }
  private async collection(path: string) {
    const rows: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    let next: string | undefined = path;
    let total: number | undefined;
    while (next) {
      const url = new URL(next, this.settings().base),
        initial = new URL(path, this.settings().base);
      if (
        url.origin !== initial.origin ||
        url.pathname !== initial.pathname ||
        url.searchParams.get('localCenter') !==
          initial.searchParams.get('localCenter') ||
        seen.has(url.href) ||
        seen.size >= 1000
      )
        throw new BadGatewayException('Paginare Orgo invalidă.');
      seen.add(url.href);
      const payload = await this.request(url.pathname + url.search);
      const page = payload['hydra:member'];
      if (!Array.isArray(page))
        throw new BadGatewayException('Colecție Orgo invalidă.');
      if (typeof payload['hydra:totalItems'] === 'number') {
        if (total !== undefined && total !== payload['hydra:totalItems'])
          throw new BadGatewayException(
            'Registrul s-a schimbat în timpul citirii.',
          );
        total = payload['hydra:totalItems'];
      }
      rows.push(...page.map(obj));
      const candidate = obj(payload['hydra:view'])['hydra:next'];
      next = typeof candidate === 'string' ? candidate : undefined;
    }
    if (total !== undefined && rows.length !== total)
      throw new BadGatewayException('Registru Orgo incomplet.');
    return rows;
  }
  private async roster() {
    const { center } = this.settings();
    const rows = await this.collection(
      `/api/v1/users?localCenter=${center}&page=1`,
    );
    if (rows.some((r) => Number(obj(r.localCenter).id) !== center))
      throw new BadGatewayException('Orgo a returnat membri din alt centru.');
    if (
      new Set(rows.map((r) => r.id)).size !== rows.length ||
      rows.some((r) => !Number.isInteger(r.id) || Number(r.id) <= 0)
    )
      throw new BadGatewayException('Identități Orgo invalide.');
    return rows;
  }
  async discover(user: CurrentUser) {
    await this.admin(user);
    const { center } = this.settings();
    const members = await this.detailedRoster();
    const units = await this.collection(
      `/api/v1/units?localCenter=${center}&page=1`,
    );
    return {
      version: this.version(members),
      serverToken: true,
      writesEnabled:
        this.config.get<string>('ORGO_MEMBER_WRITES_ENABLED') === 'true',
      inactiveMembers: members
        .filter((r) => r.status === 'INACTIVE')
        .map((r) => ({
          id: r.id,
          name: remoteFields(r).name,
        })),
      members: members
        .filter((r) => r.status !== 'INACTIVE')
        .map((r) => ({
          id: r.id,
          ...remoteFields(r),
          birthDate: r.dateBirth ?? null,
          type: object(r.type).name ?? null,
          roles: this.rolePreview(r),
        })),
      importedUnitIds: (
        await this.em.find(ScoutUnit, { orgoId: { $ne: null } })
      ).map((u) => u.orgoId),
      units: withoutPatrols(units).map((r) => ({
        id: r.id,
        name: r.name,
        parent: obj(r.parent).id ?? null,
        type: obj(r.unitType).name ?? null,
      })),
      message:
        'Selectează importul numai după verificarea registrului. Clasele și rolurile locale se repartizează explicit; nu sunt ghicite din vârstă sau nume.',
    };
  }
  async import(user: CurrentUser, input: unknown) {
    await this.admin(user);
    const b = bodyObject(input);
    if (b.confirm !== true)
      throw new BadRequestException('Confirmă importul după previzualizare.');
    const rows = await this.detailedRoster();
    if (b.version && b.version !== this.version(rows))
      throw new ConflictException(
        'Registrul Orgo s-a schimbat. Reîncarcă previzualizarea.',
      );
    const selectedUnits = b.units === undefined ? [] : b.units;
    if (!Array.isArray(selectedUnits) || selectedUnits.length > 100)
      throw new BadRequestException('Unități invalide.');
    const remoteUnits = selectedUnits.length
      ? withoutPatrols(
          await this.collection(
            `/api/v1/units?localCenter=${this.settings().center}&page=1`,
          ),
        )
      : [];
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      await this.admin(user, tx);
      let unitsAdded = 0;
      for (const selected of selectedUnits) {
        const row = bodyObject(selected),
          remote = remoteUnits.find((u) => u.id === Number(row.orgoId));
        if (
          !remote ||
          (remote.localCenter &&
            Number(obj(remote.localCenter).id) !== this.settings().center)
        )
          throw new BadRequestException(
            'Unitatea nu poate fi importată din centrul configurat.',
          );
        if (await tx.findOne(ScoutUnit, { orgoId: Number(remote.id) }))
          continue;
        const branch = stringValue(row.branch);
        if (!branches.includes(branch as (typeof branches)[number]))
          throw new BadRequestException(
            'Alege ramura fiecărei unități importate.',
          );
        const structureId = stringValue(row.structureId);
        await tx.findOneOrFail(LocalStructure, { id: structureId });
        tx.create(ScoutUnit, {
          orgoId: Number(remote.id),
          name: stringValue(remote.name),
          branch: branch as (typeof branches)[number],
          structureId,
          structureConfirmed: true,
        });
        unitsAdded++;
      }
      await tx.flush();
      let added = 0,
        conflicts = 0;
      for (const r of rows) {
        const fields = remoteFields(r),
          name = stringValue(fields.name);
        if (!name)
          throw new BadGatewayException('Orgo a returnat un membru fără nume.');
        const connection = await tx.findOne(
          OrgoConnection,
          { orgoUserId: Number(r.id) },
          { populate: ['user'] },
        );
        let member = await tx.findOne(ScoutMember, { orgoId: Number(r.id) });
        if (!member) {
          // Never automatically merge a provisional local identity by name or shared email.
          if (
            await tx.count(ScoutMember, {
              name: { $ilike: name },
              orgoId: null,
            })
          ) {
            conflicts++;
            continue;
          }
          member = tx.create(ScoutMember, {
            orgoId: Number(r.id),
            accountId: connection?.user.id ?? null,
            name,
            birthDate:
              typeof r.dateBirth === 'string' &&
              /^\d{4}-\d{2}-\d{2}/.test(r.dateBirth)
                ? r.dateBirth.slice(0, 10)
                : null,
            profile: {
              ...emptyProfile(),
              email: typeof fields.email === 'string' ? fields.email : '',
              phone: typeof fields.phone === 'string' ? fields.phone : '',
            },
            status:
              r.status ===
              (this.config.get<string>('ORGO_ACTIVE_STATUS') ?? 'ACTIVE')
                ? 'active'
                : this.config.get<string>('ORGO_WITHDRAWN_STATUS') &&
                    r.status ===
                      this.config.get<string>('ORGO_WITHDRAWN_STATUS')
                  ? 'withdrawn'
                  : 'review',
            remote: fields,
            lastProgressionYear: targetYear(new Date()),
          });
          await tx.flush();
          added++;
        } else {
          if (connection && !member.accountId)
            member.accountId = connection.user.id;
          if (JSON.stringify(member.remote) !== JSON.stringify(fields)) {
            const pending = await tx.count(MemberSync, {
              memberId: member.id,
              state: {
                $in: [
                  'pending',
                  'running',
                  'conflict',
                  'unsupported',
                  'uncertain',
                  'permission-required',
                  'review',
                ],
              },
            });
            if (pending) {
              conflicts++;
              continue;
            }
            // Imported snapshots never change local lifecycle or assignments implicitly.
            member.remote = fields;
            member.name = name;
            member.revision++;
          }
        }
        const result = reconcile(
          member.orgoBase ?? {},
          member.orgoProfile ?? {},
          cleanProfile(r),
        );
        member.orgoProfile = {
          ...result.values,
          customDefinitions: this.definitions,
        };
        member.orgoBase = result.base;
        member.orgoConflicts = result.conflicts;
        await this.applyImportedRoles(tx, member, r, user.id);
      }
      tx.create(AuditEntry, {
        actorId: user.id,
        action: 'members.orgo-import',
        entityType: 'MemberRegistry',
        entityId: 'orgo',
        metadata: { added, conflicts },
      });
      return { added, conflicts, unitsAdded };
    });
  }
  async retry(user: CurrentUser, id: string, input: unknown = {}) {
    await this.admin(user);
    const b = bodyObject(input);
    let acceptedRemote: Record<string, unknown> | undefined;
    if (b.keepLocal === true) {
      const job = await this.em.findOneOrFail(MemberSync, { id });
      const member = await this.em.findOneOrFail(ScoutMember, {
        id: job.memberId,
      });
      if (!member.orgoId)
        throw new BadRequestException('Identitatea Orgo nu este confirmată.');
      const remote = await this.request(`/api/v1/users/${member.orgoId}`);
      if (
        Number(remote.id) !== member.orgoId ||
        Number(obj(remote.localCenter).id) !== this.settings().center
      )
        throw new BadRequestException('Identitatea Orgo nu corespunde.');
      acceptedRemote = ['orgo-profile', 'photo'].includes(job.kind)
        ? cleanProfile(remote)
        : remoteFields(remote);
    }
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      await this.admin(user, tx);
      const operation = await tx.findOneOrFail(MemberSync, { id });
      if (operation.state === 'synced' || operation.state === 'running')
        throw new BadRequestException(
          'Operațiunea este finalizată sau în curs.',
        );
      if (operation.state === 'conflict' && !acceptedRemote)
        throw new BadRequestException(
          'Rezolvă diferența din Orgo și fișa locală înainte de reluare.',
        );
      operation.state = 'pending';
      if (acceptedRemote) operation.baseline = acceptedRemote;
      const current = await tx.findOneOrFail(ScoutMember, {
        id: operation.memberId,
      });
      operation.revision = current.revision;
      if (operation.kind === 'status')
        operation.payload = { status: current.status };
      if (operation.kind === 'profile' && operation.payload.contact)
        operation.payload = {
          ...operation.payload,
          contact: {
            email: current.profile.email,
            phone: current.profile.phone,
          },
        };
      if (operation.kind === 'orgo-profile')
        operation.payload = Object.fromEntries(
          Object.keys(operation.payload).map((key) => [
            key,
            key === 'rawUserCustomFieldsValues'
              ? Object.fromEntries(
                  (Array.isArray(current.orgoProfile?.customFieldValues)
                    ? current.orgoProfile.customFieldValues
                    : []
                  )
                    .map(object)
                    .map((f) => [String(f.field), f.value]),
                )
              : (current.orgoProfile?.[key] ?? null),
          ]),
        );
      operation.message = 'Verificarea a fost programată.';
      tx.create(AuditEntry, {
        actorId: user.id,
        action: acceptedRemote
          ? 'members.sync-keep-local'
          : 'members.sync-retry',
        entityType: 'MemberSync',
        entityId: id,
        metadata: {},
      });
      return { ok: true };
    });
  }
  async link(user: CurrentUser, id: string, input: unknown) {
    await this.admin(user);
    const b = bodyObject(input),
      orgoId = Number(b.orgoId);
    if (!Number.isInteger(orgoId) || orgoId <= 0)
      throw new BadRequestException('ID Orgo invalid.');
    const remote = await this.request(`/api/v1/users/${orgoId}`);
    if (
      Number(remote.id) !== orgoId ||
      Number(obj(remote.localCenter).id) !== this.settings().center
    )
      throw new BadRequestException(
        'Identitatea Orgo nu aparține centrului configurat.',
      );
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      await this.admin(user, tx);
      const member = await tx.findOneOrFail(ScoutMember, { id });
      if (member.orgoId && member.orgoId !== orgoId)
        throw new BadRequestException('Membrul are deja o identitate Orgo.');
      const other = await tx.findOne(ScoutMember, { orgoId });
      if (other && other.id !== id)
        throw new BadRequestException(
          'Identitatea este deja asociată altui membru.',
        );
      member.orgoId = orgoId;
      member.remote = remoteFields(remote);
      member.revision++;
      const connection = await tx.findOne(
        OrgoConnection,
        { orgoUserId: orgoId },
        { populate: ['user'] },
      );
      if (connection) member.accountId = connection.user.id;
      tx.create(AuditEntry, {
        actorId: user.id,
        action: 'members.orgo-link',
        entityType: 'Member',
        entityId: id,
        metadata: { orgoId },
      });
      return { ok: true };
    });
  }
  async run() {
    const em = this.em.fork();
    const jobs = await em.find(
      MemberSync,
      { state: { $in: ['pending', 'running'] } },
      { orderBy: { createdAt: 'asc' }, limit: 30 },
    );
    for (const job of jobs) {
      if (
        job.state === 'running' &&
        job.claimedAt &&
        Date.now() - job.claimedAt.getTime() < 120000
      )
        continue;
      const claim = await em.fork().transactional(async (tx) => {
        await tx.execute('select pg_advisory_xact_lock(19102026)');
        const operation = await tx.findOneOrFail(
          MemberSync,
          { id: job.id },
          { refresh: true },
        );
        if (
          operation.state !== 'pending' &&
          !(
            operation.state === 'running' &&
            (!operation.claimedAt ||
              Date.now() - operation.claimedAt.getTime() >= 120000)
          )
        )
          return null;
        operation.state = 'running';
        operation.claimedAt = new Date();
        operation.message = 'Se verifică în Orgo.';
        return { ...operation };
      });
      if (!claim) continue;
      let state = 'unsupported',
        message =
          'Operațiunea necesită o mapare Orgo verificată. Schimbarea locală este păstrată.';
      let snapshot: Record<string, unknown> | null = null;
      let attemptedWrite = false;
      try {
        const m = await em.findOneOrFail(
          ScoutMember,
          { id: claim.memberId },
          { refresh: true },
        );
        if (m.revision !== claim.revision) {
          state = 'review';
          message =
            'Există o versiune locală mai nouă. Modificările nesincronizate trebuie revizuite.';
        } else if (!m.orgoId) {
          state = 'permission-required';
          message =
            'Crearea și asocierea identității Orgo nu sunt încă confirmate.';
        } else {
          const remote = await this.request(`/api/v1/users/${m.orgoId}`);
          if (
            Number(remote.id) !== m.orgoId ||
            Number(obj(remote.localCenter).id) !== this.settings().center
          )
            throw new BadGatewayException(
              'Membrul Orgo nu aparține centrului configurat.',
            );
          if (claim.kind === 'photo') {
            if (
              remote.logo !== claim.baseline.logo &&
              remote.logo !== m.orgoBase?.logo
            ) {
              state = 'conflict';
              message = 'Fotografia a fost modificată și în Orgo.';
            } else if (
              this.config.get<string>('ORGO_MEMBER_WRITES_ENABLED') !== 'true'
            ) {
              state = 'permission-required';
              message =
                'Fotografie păstrată local; scrierile Orgo nu sunt activate.';
            } else {
              const data =
                  typeof m.orgoProfile?.logo === 'string'
                    ? m.orgoProfile.logo
                    : '',
                photo = this.decodePhoto(data),
                form = new FormData();
              form.append(
                'file',
                new Blob([new Uint8Array(photo.bytes)], { type: photo.type }),
                'profile.' + photo.type.split('/')[1],
              );
              form.append('type', 'user');
              form.append('entity_id', String(m.orgoId));
              attemptedWrite = true;
              const response = await fetch(
                new URL('/api/v1/media_objects', this.settings().base),
                {
                  method: 'POST',
                  headers: { 'Api-Token': this.settings().token },
                  body: form,
                  redirect: 'error',
                  signal: AbortSignal.timeout(30000),
                },
              );
              if (!response.ok) throw new Error('Orgo photo rejected');
              const uploaded = object(await response.json()),
                verified = await this.request('/api/v1/users/' + m.orgoId);
              if (
                uploaded.contentUrl &&
                verified.logo === uploaded.contentUrl
              ) {
                state = 'synced';
                message = 'Fotografia a fost confirmată în Orgo.';
                snapshot = { logo: verified.logo };
              } else {
                state = 'uncertain';
                message = 'Verifică fotografia din Orgo înainte de reluare.';
              }
            }
          }
          const fields =
            claim.kind === 'orgo-profile'
              ? cleanProfile(remote)
              : remoteFields(remote);
          const patch: Record<string, unknown> = {};
          if (
            claim.kind === 'profile' &&
            Object.keys(claim.payload).every((k) => k === 'contact')
          ) {
            const contact = obj(claim.payload.contact);
            patch.email = contact.email;
            patch.phoneNumber = contact.phone;
          }
          if (claim.kind === 'orgo-profile') {
            for (const [key, value] of Object.entries(claim.payload))
              if (
                key === 'rawUserCustomFieldsValues' ||
                (key in profileFields && !readonlyFields.has(key))
              )
                patch[key] = value;
          }
          if (claim.kind === 'status') {
            const configured = this.config.get<string>(
              m.status === 'withdrawn'
                ? 'ORGO_WITHDRAWN_STATUS'
                : 'ORGO_ACTIVE_STATUS',
            );
            if (configured) patch.status = configured;
          }
          const tracked: Record<string, unknown> = {
            ...(claim.kind === 'orgo-profile'
              ? Object.fromEntries(
                  Object.entries(patch).filter(
                    ([key]) => key !== 'rawUserCustomFieldsValues',
                  ),
                )
              : {}),
            ...(patch.email !== undefined ? { email: patch.email } : {}),
            ...(patch.phoneNumber !== undefined
              ? { phone: patch.phoneNumber }
              : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
          };
          if (
            claim.kind === 'orgo-profile' &&
            patch.rawUserCustomFieldsValues
          ) {
            const custom = object(patch.rawUserCustomFieldsValues);
            const values = Array.isArray(m.orgoProfile?.customFieldValues)
              ? m.orgoProfile.customFieldValues
              : [];
            tracked.customFieldValues = values;
            if (Object.keys(custom).some((k) => !/^\d+$/.test(k)))
              throw new BadRequestException('Câmp personalizat invalid.');
          }
          const equal = (a: unknown, b: unknown) =>
            JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
          if (Object.keys(patch).length) {
            if (
              Object.entries(tracked).some(
                ([k, v]) =>
                  !equal(fields[k], claim.baseline[k]) && !equal(fields[k], v),
              )
            ) {
              state = 'conflict';
              message =
                'Datele au fost modificate și în Orgo. Este necesară rezolvarea conflictului.';
            } else if (
              Object.entries(tracked).every(([k, v]) => equal(fields[k], v))
            ) {
              state = 'synced';
              message = 'Orgo confirmă aceleași date.';
              snapshot = fields;
            } else if (
              this.config.get<string>('ORGO_MEMBER_WRITES_ENABLED') !== 'true'
            ) {
              state = 'permission-required';
              message =
                'Scrierile Orgo nu sunt activate; verifică tokenul și mapările înainte de activare.';
            } else {
              attemptedWrite = true;
              await this.request(`/api/v1/users/${m.orgoId}`, patch);
              const rawReadback = await this.request(
                `/api/v1/users/${m.orgoId}`,
              );
              const readback =
                claim.kind === 'orgo-profile'
                  ? cleanProfile(rawReadback)
                  : remoteFields(rawReadback);
              if (
                Object.entries(tracked).every(([k, v]) => equal(readback[k], v))
              ) {
                state = 'synced';
                message = 'Modificarea a fost confirmată în Orgo.';
                snapshot = readback;
              } else {
                state = 'uncertain';
                message =
                  'Orgo nu confirmă toate câmpurile. Verifică înainte de reluare.';
              }
            }
          }
        }
      } catch {
        state = attemptedWrite ? 'uncertain' : 'permission-required';
        message = attemptedWrite
          ? 'Orgo poate să fi primit modificarea. Reverifică înainte de reluare.'
          : 'Sincronizarea nu a putut fi verificată. Verifică tokenul server-to-server, centrul și accesul Orgo.';
      }
      await em.fork().transactional(async (tx) => {
        await tx.execute('select pg_advisory_xact_lock(19102026)');
        const operation = await tx.findOneOrFail(MemberSync, { id: claim.id });
        const m = await tx.findOneOrFail(ScoutMember, { id: claim.memberId });
        if (operation.claimedAt?.getTime() !== claim.claimedAt?.getTime())
          return;
        if (m.revision !== claim.revision) {
          operation.state = 'review';
          operation.message =
            'Există o versiune locală mai nouă; verifică toate modificările nesincronizate.';
        } else {
          operation.state = state;
          operation.message = message;
          if (snapshot) {
            if (claim.kind === 'orgo-profile' || claim.kind === 'photo') {
              m.orgoBase = { ...m.orgoBase, ...snapshot };
              if (claim.kind === 'photo')
                m.orgoProfile = { ...m.orgoProfile, ...snapshot };
            } else m.remote = snapshot;
          }
        }
        operation.completedAt = new Date();
      });
    }
  }
}

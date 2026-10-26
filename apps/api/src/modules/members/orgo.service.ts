import { orgoPlan } from '../membership/orgo-fee-plan';
import { feePriceReference } from './orgo-sync';
import {
  equalValue,
  flattenFields,
  localStatus,
  OrgoRequestError,
  retryDelay,
} from './orgo-sync';
import { createHash, randomUUID } from 'node:crypto';
import {
  cleanProfile,
  branchFor,
  activeRoles,
  object,
  reconcile,
  profileFields,
  readonlyFields,
  projectCustomProfile,
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
import { OrgoConnection } from '../users/entities/orgo-connection.entity';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import {
  ScoutMember,
  ScoutUnit,
  ScoutSubunit,
  ScoutUnitSource,
  LocalStructure,
  ScoutAssignment,
  MemberSettings,
  MemberSync,
} from './entities/member.entity';
import { bodyObject, stringValue } from './members.service';
import {
  emptyProfile,
  targetYear,
  branches,
  proposedStructure,
} from './member.types';

import { importedCategory, categoryLabels, categories } from './organization';

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
  private async detailedRoster(fresh = false) {
    if (!fresh && this.cached && Date.now() - this.cached.at < 120000)
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
          type: d.fieldType,
          visibility: d.visibility,
          options: d.fieldOptions,
          isOnlyAdmin: d.isOnlyAdmin === true,
          isEncrypted: d.isEncrypted === true,
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
    if (typeof p.fullName === 'string' && p.fullName.trim())
      m.name = p.fullName;
    else if (typeof p.firstName === 'string' && typeof p.lastName === 'string')
      m.name = [p.firstName, p.middleName, p.lastName]
        .filter(Boolean)
        .join(' ');
    if (
      typeof p.dateBirth === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(p.dateBirth)
    )
      m.birthDate = p.dateBirth.slice(0, 10);
    if (p.dateBirth === null) m.birthDate = null;
    m.profile = projectCustomProfile(
      {
        ...m.profile,
        ...(typeof p.email === 'string' ? { email: p.email } : {}),
        ...(typeof p.phoneNumber === 'string' ? { phone: p.phoneNumber } : {}),
      },
      p,
    );
  }
  private rolePreview(raw: Record<string, unknown>) {
    return activeRoles(raw)
      .filter(
        (r) =>
          ![2, 18, 19, 22].includes(Number(object(r.role).id)) &&
          Number(object(object(r.role).unitType).id) !== 4,
      )
      .map((r) => ({
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
  private async projectCategory(
    tx: EntityManager,
    m: ScoutMember,
    r: Record<string, unknown>,
  ) {
    const incomingCategory = importedCategory(r);
    if (m.category && incomingCategory && m.category !== incomingCategory) {
      m.categoryReview = true;
      m.orgoProfile = {
        ...m.orgoProfile,
        type: {
          id: 38 + categories.indexOf(m.category),
          name: categoryLabels[m.category],
        },
      };
      m.orgoConflicts = {
        ...m.orgoConflicts,
        type: {
          local: {
            id: 38 + categories.indexOf(m.category),
            name: categoryLabels[m.category],
          },
          remote: cleanProfile(r).type,
        },
      };
    } else if (!m.category && incomingCategory && !m.categoryReview) {
      m.category = incomingCategory;
    }
    if (!incomingCategory) m.categoryReview = true;
    const fixedUnit = m.category
      ? await tx.findOne(ScoutUnit, {
          fixed: true,
          structureId: m.structureId,
          branch: m.category,
        })
      : null;
    if (fixedUnit && m.unitId !== fixedUnit.id) {
      m.unitId = fixedUnit.id;
      m.groupId = null;
    }
  }
  private async applyImportedRoles(
    tx: EntityManager,
    m: ScoutMember,
    r: Record<string, unknown>,
    actorId: number,
  ) {
    await this.projectCategory(tx, m, r);
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
    const units = await tx.find(ScoutUnit, { archived: false, fixed: true });
    const sources = await tx.find(ScoutUnitSource, {});
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
              ? sources.some(
                  (s) => s.id === role.unitId && s.unitId === oldUnit?.id,
                )
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
      const unit = units.find((u) =>
        sources.some((s) => s.id === role.unitId && s.unitId === u.id),
      );
      const mapped =
        role.id === 8 || role.id === 3
          ? 'council'
          : role.id === 7
            ? 'chief'
            : role.id === 1
              ? 'leader'
              : role.id === 6
                ? 'helper'
                : null;
      if (!mapped || !adult || (mapped !== 'council' && !unit)) continue;
      if (mapped === 'council' && m.structureId !== 'cluj') continue;
      if (unit && unit.structureId !== m.structureId) continue;
      // Imported leader/helper roles without a verified subunit do not grant unit-wide rights.
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
    await this.members!.requireRosterAccess(user);
    const token = await this.claimRefresh();
    if (token) void this.performRefresh(token).catch(() => undefined);
    return this.refreshStatus(user);
  }
  async refreshStatus(user: CurrentUser) {
    await this.members!.requireRosterAccess(user);
    const settings = await this.em
      .fork()
      .findOne(MemberSettings, { id: 'default' });
    const expired =
      settings?.refreshState === 'running' &&
      (!settings.refreshClaimedAt ||
        Date.now() - settings.refreshClaimedAt.getTime() > 120000);
    return {
      state: expired ? 'failed' : (settings?.refreshState ?? 'idle'),
      message: expired
        ? 'Actualizarea a fost întreruptă. Reîncearcă.'
        : (settings?.refreshMessage ?? null),
      lastSucceededAt: settings?.lastOrgoRefresh ?? null,
    };
  }
  private async claimRefresh() {
    return this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const settings =
        (await tx.findOne(MemberSettings, { id: 'default' })) ??
        tx.create(MemberSettings, { id: 'default' });
      if (
        settings.refreshState === 'running' &&
        settings.refreshClaimedAt &&
        Date.now() - settings.refreshClaimedAt.getTime() < 120000
      )
        return null;
      settings.refreshToken = randomUUID();
      settings.refreshClaimedAt = new Date();
      settings.refreshState = 'running';
      settings.refreshMessage = 'Se actualizează din Orgo…';
      return settings.refreshToken;
    });
  }
  private async performRefresh(token: string) {
    const heartbeat = setInterval(() => {
      void this.em
        .fork()
        .nativeUpdate(
          MemberSettings,
          { id: 'default', refreshToken: token, refreshState: 'running' },
          { refreshClaimedAt: new Date() },
        )
        .catch(() => undefined);
    }, 30000);
    heartbeat.unref();
    try {
      // Read and validate every page/detail before applying any roster changes.
      const rows = await this.detailedRoster(true);
      return await this.em.fork().transactional(async (tx) => {
        await tx.execute('select pg_advisory_xact_lock(9212026)');
        await tx.execute('select pg_advisory_xact_lock(19102026)');
        const settings = await tx.findOneOrFail(
          MemberSettings,
          { id: 'default' },
          { refresh: true },
        );
        if (settings.refreshToken !== token) return { updated: 0 };
        let updated = 0;
        for (const raw of rows) {
          const orgoId = Number(raw.id),
            rawName = remoteFields(raw).name,
            name = typeof rawName === 'string' ? rawName.trim() : '';
          if (!name) throw new BadGatewayException('Membru Orgo fără nume.');
          let m = await tx.findOne(ScoutMember, { orgoId });
          if (!m) {
            // Never merge a provisional identity by a shared name/email.
            if (
              await tx.count(ScoutMember, {
                name: { $ilike: name },
                orgoId: null,
              })
            ) {
              tx.create(AuditEntry, {
                actorId: null,
                action: 'members.orgo-identity-review',
                entityType: 'MemberRegistry',
                entityId: 'orgo',
                metadata: { orgoId },
              });
              continue;
            }
            const connection = await tx.findOne(
              OrgoConnection,
              { orgoUserId: orgoId },
              { populate: ['user'] },
            );
            const category = importedCategory(raw);
            m = tx.create(ScoutMember, {
              orgoId,
              accountId: connection?.user.id ?? null,
              name,
              structureId: proposedStructure(name),
              structureConfirmed: false,
              category,
              categoryReview: !category,
              profile: emptyProfile(),
              status:
                raw.status ===
                (this.config.get<string>('ORGO_ACTIVE_STATUS') ?? 'ACTIVE')
                  ? 'active'
                  : 'review',
              remote: {},
              lastProgressionYear: targetYear(new Date()),
            });
            if (category) {
              const unit = await tx.findOne(ScoutUnit, {
                fixed: true,
                structureId: m.structureId,
                branch: category,
              });
              if (unit) {
                m.unitId = unit.id;
                m.branch = category;
              }
            }
            await tx.flush();
          }
          await this.reconcileMember(tx, m, raw);
          updated++;
        }
        settings.lastOrgoRefresh = new Date();
        settings.refreshState = 'succeeded';
        settings.refreshMessage = null;
        return { updated };
      });
    } catch (error) {
      await this.em.fork().nativeUpdate(
        MemberSettings,
        { id: 'default', refreshToken: token },
        {
          refreshState: 'failed',
          refreshMessage:
            error instanceof OrgoRequestError &&
            [401, 403].includes(error.status)
              ? 'Accesul Orgo nu permite actualizarea. Contactează administratorul.'
              : 'Actualizarea din Orgo a eșuat. Datele salvate sunt păstrate. Reîncearcă.',
        },
      );
      throw error;
    } finally {
      clearInterval(heartbeat);
    }
  }
  private recordConfirmedBase(m: ScoutMember, values: Record<string, unknown>) {
    for (const [key, value] of Object.entries(values)) {
      if (key === 'status') m.remote = { ...m.remote, status: value };
      else if (key.startsWith('custom:')) {
        const fields = (
          Array.isArray(m.orgoBase?.customFieldValues)
            ? m.orgoBase.customFieldValues
            : []
        ).map((f) => ({ ...object(f) }));
        const id = Number(key.slice(7)),
          field = fields.find((f) => Number(f.field) === id);
        if (field) field.value = value;
        else fields.push({ field: id, value, media: null });
        m.orgoBase = { ...m.orgoBase, customFieldValues: fields };
      } else m.orgoBase = { ...m.orgoBase, [key]: value };
    }
  }
  private async reconcileMember(
    tx: EntityManager,
    m: ScoutMember,
    raw: Record<string, unknown>,
  ) {
    const before = JSON.stringify({
      profile: m.orgoProfile,
      base: m.orgoBase,
      remote: m.remote,
      status: m.status,
      name: m.name,
      birthDate: m.birthDate,
    });
    let statusAcknowledged = false;
    const observed = {
      ...flattenFields(cleanProfile(raw)),
      status: raw.status,
    } as Record<string, unknown>;
    const inFlight = await tx.find(MemberSync, {
      memberId: m.id,
      state: { $in: ['running', 'uncertain'] },
    });
    for (const operation of inFlight) {
      const intent = this.intentions(operation, m);
      for (const [key, expected] of Object.entries(intent.expected)) {
        if (
          equalValue(observed[key], expected) &&
          !equalValue(intent.local[key], expected)
        ) {
          // Recognize our preceding write before applying Orgo-wins to a newer edit.
          this.recordConfirmedBase(m, { [key]: observed[key] });
          if (key === 'status') statusAcknowledged = true;
        }
      }
    }
    const result = reconcile(
      m.orgoBase ?? {},
      m.orgoProfile ?? {},
      cleanProfile(raw),
    );
    m.orgoProfile = {
      ...result.values,
      customDefinitions: this.definitions.length
        ? this.definitions
        : (m.orgoProfile?.customDefinitions ?? []),
    };
    m.orgoBase = result.base;
    m.orgoConflicts = {};
    this.projectProfile(m);
    const statusJobs = await tx.find(
      MemberSync,
      {
        memberId: m.id,
        kind: 'status',
        state: {
          $in: [
            'pending',
            'running',
            'uncertain',
            'permission-required',
            'unsupported',
            'review',
            'conflict',
          ],
        },
      },
      { orderBy: { createdAt: 'desc' } },
    );
    const pending = statusJobs[0];
    const baseline = pending?.baseline.status ?? m.remote?.status;
    if (
      !statusAcknowledged &&
      (!pending || !equalValue(raw.status, baseline))
    ) {
      await this.members!.applyOrgoStatus(
        tx,
        m,
        localStatus(
          raw.status,
          this.config.get<string>('ORGO_ACTIVE_STATUS') ?? 'ACTIVE',
          this.config.get<string>('ORGO_WITHDRAWN_STATUS'),
        ),
      );
    }
    m.remote = { ...m.remote, ...remoteFields(raw) };
    if (Object.keys(result.conflicts).length)
      tx.create(AuditEntry, {
        actorId: null,
        action: 'members.orgo-superseded',
        entityType: 'Member',
        entityId: m.id,
        metadata: { fields: Object.keys(result.conflicts) },
      });
    if (
      before !==
      JSON.stringify({
        profile: m.orgoProfile,
        base: m.orgoBase,
        remote: m.remote,
        status: m.status,
        name: m.name,
        birthDate: m.birthDate,
      })
    ) {
      m.revision++;
      m.updatedAt = new Date();
    }
  }
  async refreshProfiles() {
    const token = await this.claimRefresh();
    return token ? this.performRefresh(token) : { updated: 0 };
  }
  async daily() {
    const settings = await this.em
      .fork()
      .findOne(MemberSettings, { id: 'default' });
    if (
      !settings?.lastOrgoRefresh ||
      Date.now() - settings.lastOrgoRefresh.getTime() > 86400000
    )
      await this.refreshProfiles();
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
          if (!grant.sensitive)
            throw new ForbiddenException(
              'Informațiile suplimentare necesită acces la fișa protejată.',
            );
          const fieldId = Number(key.slice(7)),
            definitions = Array.isArray(m.orgoProfile?.customDefinitions)
              ? m.orgoProfile.customDefinitions.map(object)
              : [],
            definition = definitions.find((d) => Number(d.id) === fieldId);
          if (
            !definition ||
            ((definition.visibility === 'admin' ||
              definition.isOnlyAdmin === true) &&
              !grant.identity)
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
      if (['firstName', 'lastName', 'middleName'].some((key) => key in patch)) {
        const fullName = [
          m.orgoProfile.firstName,
          m.orgoProfile.middleName,
          m.orgoProfile.lastName,
        ]
          .filter((v) => typeof v === 'string' && v.trim())
          .join(' ');
        if (!fullName)
          throw new BadRequestException('Numele este obligatoriu.');
        m.orgoProfile = { ...m.orgoProfile, fullName };
      }
      this.projectProfile(m);
      m.revision++;
      tx.create(MemberSync, {
        memberId: id,
        revision: m.revision,
        actorId: user.id,
        kind: 'orgo-profile',
        payload: patch,
        baseline: {
          email: m.remote?.email,
          phoneNumber: m.remote?.phone,
          ...m.orgoBase,
        },
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
      if (b.choice !== 'remote')
        throw new BadRequestException('Se păstrează valoarea Orgo.');
      m.orgoProfile = { ...m.orgoProfile, [key]: conflict.remote };
      m.orgoBase = { ...m.orgoBase, [key]: conflict.remote };
      const conflicts = { ...m.orgoConflicts };
      delete conflicts[key];
      m.orgoConflicts = conflicts;
      this.projectProfile(m);
      m.revision++;
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
    if (!this.members) throw new ServiceUnavailableException();
    await this.members.requireCentral(em, user);
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
    if (!response.ok) {
      const retry = response.headers.get('retry-after');
      const seconds = retry ? Number(retry) : NaN;
      const delay = Number.isFinite(seconds)
        ? seconds * 1000
        : retry
          ? Math.max(0, Date.parse(retry) - Date.now())
          : 0;
      throw new OrgoRequestError(
        response.status,
        Number.isFinite(delay) ? delay : 0,
      );
    }
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
      importedUnitIds: (await this.em.find(ScoutUnitSource, {})).map(
        (u) => u.id,
      ),
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
        if (await tx.findOne(ScoutUnitSource, { id: Number(remote.id) }))
          continue;
        const branch = stringValue(row.branch);
        if (!branches.includes(branch as (typeof branches)[number]))
          throw new BadRequestException(
            'Alege ramura fiecărei unități importate.',
          );
        const structureId = stringValue(row.structureId);
        await tx.findOneOrFail(LocalStructure, { id: structureId });
        const parent = await tx.findOneOrFail(ScoutUnit, {
          fixed: true,
          structureId,
          branch: branch as (typeof branches)[number],
        });
        const group = tx.create(ScoutSubunit, {
          name: stringValue(remote.name),
          parentId: parent.id,
          branch: parent.branch,
          structureId,
          orgoId: Number(remote.id),
          structureConfirmed: true,
        });
        await tx.flush();
        tx.create(ScoutUnitSource, {
          id: Number(remote.id),
          unitId: parent.id,
          groupId: group.id,
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
        const newlyImported = !member;
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
            structureId: proposedStructure(name),
            category: importedCategory(r),
            categoryReview: !importedCategory(r),
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
            status: localStatus(
              r.status,
              this.config.get<string>('ORGO_ACTIVE_STATUS') ?? 'ACTIVE',
              this.config.get<string>('ORGO_WITHDRAWN_STATUS'),
            ),
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
        this.projectProfile(member);
        if (newlyImported)
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
    if (b.keepLocal === true)
      throw new BadRequestException(
        'La diferențe concurente se păstrează valoarea Orgo.',
      );
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      await this.admin(user, tx);
      const operation = await tx.findOneOrFail(MemberSync, { id });
      if (
        ['synced', 'running', 'superseded', 'local-only'].includes(
          operation.state,
        )
      )
        throw new BadRequestException(
          'Operațiunea este finalizată sau în curs.',
        );
      operation.nextAttemptAt = null;
      operation.attempts = 0;
      operation.state = 'pending';
      operation.completedAt = null;
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
        action: 'members.sync-retry',
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
  async feePlanContext(orgoId: number) {
    const settings = this.settings();
    const raw = await this.request('/api/v1/users/' + orgoId);
    if (
      Number(raw.id) !== orgoId ||
      Number(object(raw.localCenter).id) !== settings.center
    )
      throw new BadGatewayException('Identitate Orgo invalidă.');
    const tenants = await this.request(
      '/api/v1/tenants?appHost=' +
        encodeURIComponent(new URL(settings.base).hostname),
    );
    const rows = tenants['hydra:member'];
    if (!Array.isArray(rows) || rows.length !== 1)
      throw new BadGatewayException('Catalog Orgo ambiguu.');
    const productId = object(
      object(object(rows[0]).settingFeatures).fees,
    ).productUuid;
    if (typeof productId !== 'string' || !/^[a-zA-Z0-9-]+$/.test(productId))
      throw new BadGatewayException('Catalog Orgo invalid.');
    const product = await this.request('/api/v1/products/' + productId);
    const now = Date.now();
    const choices = (
      Array.isArray(product.productPrices) ? product.productPrices : []
    )
      .map(object)
      .filter(
        (price) =>
          !price.isArchived &&
          !price.isCompanyPrice &&
          !price.isHidden &&
          (!price.validFrom ||
            (typeof price.validFrom === 'string' &&
              Date.parse(price.validFrom) <= now)) &&
          (!price.validTo ||
            (typeof price.validTo === 'string' &&
              Date.parse(price.validTo) >= now)) &&
          (!Array.isArray(price.allowedLocalCenters) ||
            !price.allowedLocalCenters.length ||
            price.allowedLocalCenters.some(
              (center) =>
                Number(object(center).id ?? center) === settings.center,
            )),
      )
      .map((price) => ({
        plan: orgoPlan(price),
        reference: feePriceReference(price),
      }))
      .filter((price) => price.plan && price.reference);
    const member = await this.em.fork().findOne(ScoutMember, { orgoId });
    return {
      baseline: feePriceReference(raw.feeTenantProductPrice),
      choices,
      memberRevision: member?.revision ?? null,
    };
  }
  async queueFeePlan(
    tx: EntityManager,
    user: CurrentUser,
    orgoId: number,
    plan: string,
    reference: string,
    baseline: string | null,
    revision: number | null,
  ) {
    await tx.execute('select pg_advisory_xact_lock(19102026)');
    const member = await tx.findOne(ScoutMember, { orgoId }, { refresh: true });
    if (!member || member.revision !== revision)
      throw new ConflictException(
        'Reîncarcă registrul de membri și previzualizarea.',
      );
    member.orgoBase = { ...member.orgoBase, feeTenantProductPrice: baseline };
    member.orgoProfile = {
      ...member.orgoProfile,
      feeTenantProductPrice: reference,
    };
    member.revision++;
    member.updatedAt = new Date();
    tx.create(MemberSync, {
      memberId: member.id,
      actorId: user.id,
      revision: member.revision,
      kind: 'fee-plan',
      payload: { plan, feeTenantProductPrice: reference },
      baseline: { feeTenantProductPrice: baseline },
      message: 'Tipul cotizației așteaptă sincronizarea cu Orgo.',
    });
  }
  private processing = false;
  private intentions(
    job: MemberSync,
    m: ScoutMember,
  ): {
    expected: Record<string, unknown>;
    local: Record<string, unknown>;
    baseline: Record<string, unknown>;
  } {
    const expected: Record<string, unknown> = {},
      baseline = { ...job.baseline };
    const local = flattenFields(m.orgoProfile ?? {});
    if (job.kind === 'status') {
      const code = this.config.get<string>(
        job.payload.status === 'withdrawn'
          ? 'ORGO_WITHDRAWN_STATUS'
          : 'ORGO_ACTIVE_STATUS',
      );
      if (
        code &&
        ['active', 'withdrawn'].includes(String(job.payload.status))
      ) {
        expected.status = code;
        local.status =
          m.status === 'active'
            ? this.config.get<string>('ORGO_ACTIVE_STATUS')
            : m.status === 'withdrawn'
              ? this.config.get<string>('ORGO_WITHDRAWN_STATUS')
              : m.remote?.status;
      }
    } else if (job.kind === 'fee-plan') {
      expected.feeTenantProductPrice = job.payload.feeTenantProductPrice;
    } else if (job.kind === 'photo') expected.logo = job.payload.logo;
    else if (job.kind === 'profile') {
      const contact = object(job.payload.contact);
      for (const [source, key] of [
        ['email', 'email'],
        ['phone', 'phoneNumber'],
      ]) {
        if (source in contact) {
          expected[key] = contact[source];
          baseline[key] = job.baseline[source];
          local[key] = source === 'email' ? m.profile.email : m.profile.phone;
        }
      }
    } else if (job.kind === 'orgo-profile') {
      Object.assign(
        expected,
        Object.fromEntries(
          Object.entries(job.payload).filter(
            ([key]) => key in profileFields && !readonlyFields.has(key),
          ),
        ),
      );
      for (const [id, value] of Object.entries(
        object(job.payload.rawUserCustomFieldsValues),
      )) {
        if (!/^\d+$/.test(id))
          throw new BadRequestException('Câmp personalizat invalid.');
        expected['custom:' + id] = value;
      }
    }
    return {
      expected,
      local,
      baseline: {
        ...flattenFields(baseline),
        ...flattenFields(m.orgoBase ?? {}),
        ...(job.kind === 'status'
          ? { status: m.remote?.status ?? baseline.status }
          : {}),
      },
    };
  }
  async run() {
    if (this.processing) return;
    this.processing = true;
    try {
      const em = this.em.fork();
      const states = ['pending', 'running', 'uncertain'];
      if (this.config.get<string>('ORGO_MEMBER_WRITES_ENABLED') === 'true')
        states.push('permission-required');
      const jobs = await em.find(
        MemberSync,
        {
          state: { $in: states },
          $or: [
            { nextAttemptAt: null },
            { nextAttemptAt: { $lte: new Date() } },
          ],
        },
        { orderBy: { createdAt: 'asc' }, limit: 30 },
      );
      for (const job of jobs) await this.deliver(job.id);
    } finally {
      this.processing = false;
    }
  }
  private async deliver(id: string) {
    const claim = await this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const operation = await tx.findOneOrFail(
        MemberSync,
        { id },
        { refresh: true },
      );
      if (
        !['pending', 'running', 'uncertain', 'permission-required'].includes(
          operation.state,
        ) ||
        (operation.nextAttemptAt &&
          operation.nextAttemptAt.getTime() > Date.now()) ||
        (operation.state === 'running' &&
          operation.claimedAt &&
          Date.now() - operation.claimedAt.getTime() < 120000)
      )
        return null;
      operation.state = 'running';
      operation.claimedAt = new Date();
      operation.attempts = (operation.attempts ?? 0) + 1;
      operation.message = 'Se sincronizează cu Orgo.';
      return { ...operation };
    });
    if (!claim) return;
    const em = this.em.fork();
    const member = await em.findOneOrFail(
      ScoutMember,
      { id: claim.memberId },
      { refresh: true },
    );
    const revision = member.revision;
    let state = 'unsupported',
      message = 'Operațiunea nu are o mapare Orgo verificată.';
    let nextAttemptAt: Date | null = null;
    const accepted: Record<string, unknown> = {};
    const superseded: string[] = [];
    const confirmedWrites: Record<string, unknown> = {};
    let attemptedWrite = false;
    try {
      if (!member.orgoId) {
        state = 'permission-required';
        message = 'Asociază o identitate Orgo înainte de sincronizare.';
      } else {
        const read = async () => {
          const raw = await this.request('/api/v1/users/' + member.orgoId);
          if (
            Number(raw.id) !== member.orgoId ||
            Number(object(raw.localCenter).id) !== this.settings().center
          )
            throw new BadGatewayException('Identitate Orgo invalidă.');
          return raw;
        };
        const raw = await read();
        const remote: Record<string, unknown> = {
          ...flattenFields(cleanProfile(raw)),
          status: raw.status,
        };
        const intent = this.intentions(claim, member);
        const patch: Record<string, unknown> = {};
        for (const [key, expected] of Object.entries(intent.expected)) {
          const current = intent.local[key];
          if (!equalValue(current, expected)) {
            // A refresh or a newer local edit superseded this field's old intent.
            superseded.push(key);
          } else if (equalValue(remote[key], expected))
            accepted[key] = remote[key];
          else if (!equalValue(remote[key], intent.baseline[key])) {
            accepted[key] = remote[key];
            superseded.push(key);
          } else patch[key] = expected;
        }
        if (!Object.keys(intent.expected).length) {
          state = 'unsupported';
          message = 'Câmpul sau statusul necesită o mapare Orgo verificată.';
        } else if (!Object.keys(patch).length) {
          state = superseded.length ? 'superseded' : 'synced';
          message = superseded.length
            ? 'Se păstrează datele curente; modificările vechi au fost înlocuite.'
            : 'Date confirmate în Orgo.';
        } else if (
          this.config.get<string>('ORGO_MEMBER_WRITES_ENABLED') !== 'true'
        ) {
          state = 'permission-required';
          message = 'Salvat local. Scrierile Orgo nu sunt activate.';
        } else {
          attemptedWrite = true;
          if (claim.kind === 'photo') {
            const photo = this.decodePhoto(String(patch.logo));
            const form = new FormData();
            form.append(
              'file',
              new Blob([new Uint8Array(photo.bytes)], { type: photo.type }),
              'profile.' + photo.type.split('/')[1],
            );
            form.append('type', 'user');
            form.append('entity_id', String(member.orgoId));
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
            if (!response.ok) throw new OrgoRequestError(response.status);
            const uploaded = object(await response.json());
            if (typeof uploaded.contentUrl !== 'string')
              throw new BadGatewayException('Fotografie neconfirmată.');
            patch.logo = uploaded.contentUrl;
          } else {
            const outgoing: Record<string, unknown> = {};
            const custom = Object.fromEntries(
              (Array.isArray(raw.customFieldValues)
                ? (cleanProfile(raw).customFieldValues as Record<
                    string,
                    unknown
                  >[])
                : []
              ).map((f) => [String(f.field), f.value]),
            );
            for (const [key, value] of Object.entries(patch)) {
              if (key.startsWith('custom:')) custom[key.slice(7)] = value;
              else outgoing[key] = value;
            }
            if (Object.keys(patch).some((key) => key.startsWith('custom:')))
              outgoing.rawUserCustomFieldsValues = custom;
            await this.request('/api/v1/users/' + member.orgoId, outgoing);
          }
          const verified = await read();
          const values: Record<string, unknown> = {
            ...flattenFields(cleanProfile(verified)),
            status: verified.status,
          };
          if (
            Object.entries(patch).every(([key, value]) =>
              equalValue(values[key], value),
            )
          ) {
            Object.assign(accepted, patch);
            Object.assign(confirmedWrites, patch);
            state = 'synced';
            message = 'Modificarea a fost confirmată în Orgo.';
          } else {
            state = 'uncertain';
            message =
              'Orgo nu a confirmat toate câmpurile. Se va verifica din nou.';
            nextAttemptAt = new Date(Date.now() + retryDelay(claim.attempts));
          }
        }
      }
    } catch (error) {
      if (
        error instanceof OrgoRequestError &&
        [401, 403].includes(error.status)
      ) {
        state = 'permission-required';
        message = 'Tokenul serverului nu permite scrierea în Orgo.';
        nextAttemptAt = new Date(Date.now() + 900000);
      } else if (error instanceof ServiceUnavailableException) {
        state = 'permission-required';
        message = 'Configurează tokenul serverului și centrul Orgo.';
        nextAttemptAt = new Date(Date.now() + 900000);
      } else if (
        error instanceof BadGatewayException ||
        error instanceof BadRequestException ||
        (error instanceof OrgoRequestError && !error.temporary)
      ) {
        state = 'unsupported';
        message = 'Orgo a respins operațiunea. Verifică maparea și datele.';
      } else {
        state = attemptedWrite ? 'uncertain' : 'pending';
        message = 'Orgo nu este disponibil. Sincronizarea se reia automat.';
        nextAttemptAt = new Date(
          Date.now() +
            retryDelay(
              claim.attempts,
              error instanceof OrgoRequestError ? error.retryAfterMs : 0,
            ),
        );
      }
    }
    await this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(9212026)');
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const operation = await tx.findOneOrFail(
        MemberSync,
        { id: claim.id },
        { refresh: true },
      );
      const m = await tx.findOneOrFail(
        ScoutMember,
        { id: claim.memberId },
        { refresh: true },
      );
      if (operation.claimedAt?.getTime() !== claim.claimedAt?.getTime()) return;
      if (m.revision !== revision) {
        // A successful write by this worker is a new common baseline, not an
        // independent Orgo edit that should defeat a newer local intention.
        this.recordConfirmedBase(m, confirmedWrites);
        operation.state = 'pending';
        operation.nextAttemptAt = null;
        operation.message =
          'Datele au fost actualizate. Se verifică ultima versiune.';
        return;
      }
      const custom = (
        Array.isArray(m.orgoProfile?.customFieldValues)
          ? m.orgoProfile.customFieldValues
          : []
      ).map((f) => ({ ...object(f) }));
      const baseCustom = (
        Array.isArray(m.orgoBase?.customFieldValues)
          ? m.orgoBase.customFieldValues
          : []
      ).map((f) => ({ ...object(f) }));
      for (const [key, value] of Object.entries(accepted)) {
        if (key === 'status') {
          await this.members!.applyOrgoStatus(
            tx,
            m,
            localStatus(
              value,
              this.config.get<string>('ORGO_ACTIVE_STATUS') ?? 'ACTIVE',
              this.config.get<string>('ORGO_WITHDRAWN_STATUS'),
            ),
          );
          m.remote = { ...m.remote, status: value };
        } else if (key.startsWith('custom:')) {
          const field = Number(key.slice(7));
          for (const fields of [custom, baseCustom]) {
            const existing = fields.find((f) => Number(f.field) === field);
            if (existing) existing.value = value;
            else fields.push({ field, value, media: null });
          }
        } else {
          m.orgoProfile = { ...m.orgoProfile, [key]: value };
          m.orgoBase = { ...m.orgoBase, [key]: value };
        }
      }
      if (Object.keys(accepted).some((key) => key.startsWith('custom:'))) {
        m.orgoProfile = { ...m.orgoProfile, customFieldValues: custom };
        m.orgoBase = { ...m.orgoBase, customFieldValues: baseCustom };
      }
      this.projectProfile(m);
      if (Object.keys(accepted).length) {
        m.revision++;
        m.updatedAt = new Date();
      }
      operation.state = state;
      operation.message = message;
      operation.nextAttemptAt = nextAttemptAt;
      operation.completedAt = [
        'synced',
        'superseded',
        'unsupported',
        'permission-required',
      ].includes(state)
        ? new Date()
        : null;
      if (superseded.length)
        tx.create(AuditEntry, {
          actorId: null,
          action: 'members.orgo-superseded',
          entityType: 'Member',
          entityId: m.id,
          metadata: { fields: superseded },
        });
    });
  }
}

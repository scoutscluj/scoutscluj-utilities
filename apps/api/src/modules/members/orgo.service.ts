import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CurrentUser } from '../users/users.types';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { OrgoConnection } from '../users/entities/orgo-connection.entity';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import { ScoutMember, MemberSync } from './entities/member.entity';
import { bodyObject, stringValue } from './members.service';
import { emptyProfile, targetYear } from './member.types';

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
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
  ) {}
  private async admin(user: CurrentUser) {
    const account = await this.em.findOneOrFail(
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
    const members = await this.roster();
    const units = await this.collection(
      `/api/v1/units?localCenter=${center}&page=1`,
    );
    return {
      serverToken: true,
      writesEnabled:
        this.config.get<string>('ORGO_MEMBER_WRITES_ENABLED') === 'true',
      members: members.map((r) => ({
        id: r.id,
        ...remoteFields(r),
        birthDate: r.dateBirth ?? null,
      })),
      units: units.map((r) => ({
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
    const rows = await this.roster();
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
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
          added++;
        } else {
          if (connection && !member.accountId)
            member.accountId = connection.user.id;
          if (JSON.stringify(member.remote) !== JSON.stringify(fields)) {
            const pending = await tx.count(MemberSync, {
              memberId: member.id,
              state: { $ne: 'synced' },
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
      }
      tx.create(AuditEntry, {
        actorId: user.id,
        action: 'members.orgo-import',
        entityType: 'MemberRegistry',
        entityId: 'orgo',
        metadata: { added, conflicts },
      });
      return { added, conflicts };
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
      acceptedRemote = remoteFields(remote);
    }
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
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
          const fields = remoteFields(remote);
          const patch: Record<string, unknown> = {};
          if (
            claim.kind === 'profile' &&
            Object.keys(claim.payload).every((k) => k === 'contact')
          ) {
            const contact = obj(claim.payload.contact);
            patch.email = contact.email;
            patch.phoneNumber = contact.phone;
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
            ...(patch.email !== undefined ? { email: patch.email } : {}),
            ...(patch.phoneNumber !== undefined
              ? { phone: patch.phoneNumber }
              : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
          };
          if (Object.keys(patch).length) {
            if (
              Object.entries(tracked).some(
                ([k, v]) => fields[k] !== claim.baseline[k] && fields[k] !== v,
              )
            ) {
              state = 'conflict';
              message =
                'Datele au fost modificate și în Orgo. Este necesară rezolvarea conflictului.';
            } else if (
              Object.entries(tracked).every(([k, v]) => fields[k] === v)
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
              const readback = remoteFields(
                await this.request(`/api/v1/users/${m.orgoId}`),
              );
              if (
                Object.entries(tracked).every(([k, v]) => readback[k] === v)
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
          if (snapshot) m.remote = snapshot;
        }
        operation.completedAt = new Date();
      });
    }
  }
}

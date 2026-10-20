import { admissionEvidence } from '../membership/admission-ledger';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CurrentUser } from '../users/users.types';
import { UserRole } from '../users/entities/user-role.enum';
import { User } from '../users/entities/user.entity';
import { OrgoConnection } from '../users/entities/orgo-connection.entity';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import {
  MembershipObligation,
  MembershipAllocation,
  MembershipPeriod,
  MembershipCheckout,
} from '../membership/entities/membership.entity';
import {
  ScoutMember,
  ScoutUnit,
  ScoutAssignment,
  ScoutNote,
  MemberSync,
  MemberTransition,
  MemberSettings,
  MemberNotice,
  LocalStructure,
} from './entities/member.entity';
import {
  adultRoles,
  branches,
  emptyProfile,
  permissions,
  targetYear,
  progression,
  localDate,
  isImportedInactive,
  structureOf,
  proposedStructure,
  type AssignmentRole,
} from './member.types';

export function bodyObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Date invalide.');
  return input as Record<string, unknown>;
}
export function stringValue(value: unknown, max = 255) {
  if (typeof value !== 'string' || value.length > max)
    throw new BadRequestException('Text invalid sau prea lung.');
  return value.trim();
}
export function dateValue(value: unknown) {
  const date = stringValue(value);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new BadRequestException('Dată invalidă.');
  return date;
}
const denied = () => {
  throw new ForbiddenException('Nu ai dreptul să modifici acești membri.');
};

@Injectable()
export class MembersService {
  constructor(private readonly em: EntityManager) {}

  private async context(tx: EntityManager, user: CurrentUser) {
    const account = await tx.findOneOrFail(
      User,
      { id: user.id },
      { refresh: true },
    );
    const connection = await tx.findOne(OrgoConnection, { user: user.id });
    const member = connection?.orgoUserId
      ? await tx.findOne(ScoutMember, { orgoId: connection.orgoUserId })
      : await tx.findOne(ScoutMember, { accountId: user.id });
    if (member && !member.accountId) member.accountId = user.id;
    const assignments =
      member?.status === 'active' && !account.memberAccessDisabled
        ? await tx.find(ScoutAssignment, { memberId: member.id, endedAt: null })
        : [];
    const admin =
      !account.memberAccessDisabled &&
      (account.roles.includes(UserRole.Admin) ||
        account.roles.includes(UserRole.SuperAdmin) ||
        assignments.some((a) => a.role === 'council'));
    const structureIds = assignments
      .filter((a) => a.role === 'structure_admin' && a.structureId)
      .map((a) => a.structureId!);
    return { admin, member, assignments, structureIds };
  }
  private async access(
    tx: EntityManager,
    user: CurrentUser,
    member: ScoutMember,
    snapshot?: {
      ctx: Awaited<ReturnType<MembersService['context']>>;
      assignments: ScoutAssignment[];
      units: ScoutUnit[];
    },
  ) {
    const ctx = snapshot?.ctx ?? (await this.context(tx, user));
    const responsibilities = snapshot
      ? snapshot.assignments.filter(
          (a) => a.memberId === member.id && a.role !== 'beneficiary',
        )
      : await tx.find(ScoutAssignment, {
          memberId: member.id,
          endedAt: null,
          role: { $ne: 'beneficiary' },
        });
    const basicAdultRead = responsibilities.some((target) =>
      ctx.assignments.some(
        (actor) =>
          actor.unitId &&
          actor.unitId === target.unitId &&
          (['leader', 'chief'].includes(actor.role) ||
            (actor.role === 'helper' && actor.groupId === target.groupId)),
      ),
    );
    const scoped = permissions(
      ctx.admin || ctx.structureIds.includes(structureOf(member)),
      ctx.member?.id === member.id,
      ctx.assignments,
      member,
    );
    if (!member.unitId)
      for (const target of responsibilities) {
        const targetUnit = target.unitId
          ? snapshot
            ? snapshot.units.find((u) => u.id === target.unitId)
            : await tx.findOne(ScoutUnit, { id: target.unitId })
          : null;
        const grant = permissions(
          ctx.admin ||
            (!!targetUnit &&
              ctx.structureIds.includes(structureOf(targetUnit))),
          ctx.member?.id === member.id,
          ctx.assignments,
          { id: member.id, unitId: target.unitId, groupId: target.groupId },
        );
        for (const key of Object.keys(scoped) as (keyof typeof scoped)[])
          scoped[key] = scoped[key] || grant[key];
      }
    // Visiting adults keep their primary identity and global lifecycle under their home structure.
    const actorUnits =
      snapshot?.units ??
      (await tx.find(ScoutUnit, {
        id: {
          $in: ctx.assignments.filter((a) => a.unitId).map((a) => a.unitId!),
        },
      }));
    const homeAssignments = ctx.assignments.filter((a) =>
      actorUnits.some(
        (u) => u.id === a.unitId && structureOf(u) === structureOf(member),
      ),
    );
    const homeAdmin =
      ctx.admin || ctx.structureIds.includes(structureOf(member));
    const home = permissions(homeAdmin, false, homeAssignments, member);
    if (!member.unitId)
      for (const target of responsibilities) {
        const grant = permissions(homeAdmin, false, homeAssignments, {
          id: member.id,
          unitId: target.unitId,
          groupId: target.groupId,
        });
        home.identity ||= grant.identity;
        home.transfer ||= grant.transfer;
        home.edit ||= grant.edit;
      }
    scoped.identity &&= home.identity;
    scoped.transfer &&= home.transfer;
    return {
      ...scoped,
      ...(basicAdultRead ? { read: true } : {}),
      own: ctx.member?.id === member.id,
      withdraw: scoped.edit && home.edit,
    };
  }
  private async chief(tx: EntityManager, user: CurrentUser, unitId: string) {
    const ctx = await this.context(tx, user);
    const unit = await tx.findOne(ScoutUnit, { id: unitId });
    return (
      ctx.admin ||
      (!!unit && ctx.structureIds.includes(structureOf(unit))) ||
      ctx.assignments.some((a) => a.role === 'chief' && a.unitId === unitId)
    );
  }
  private async admin(tx: EntityManager, user: CurrentUser) {
    if (!(await this.context(tx, user)).admin) denied();
  }
  private async unit(
    tx: EntityManager,
    unitId: string | null,
    groupId: string | null,
  ) {
    if (!unitId) {
      if (groupId) throw new BadRequestException('Grupa necesită o unitate.');
      return null;
    }
    const unit = await tx.findOne(ScoutUnit, {
      id: unitId,
      archived: false,
      parentId: null,
    });
    if (!unit) throw new BadRequestException('Unitate invalidă.');
    if (
      groupId &&
      !(await tx.findOne(ScoutUnit, {
        id: groupId,
        parentId: unitId,
        archived: false,
      }))
    )
      throw new BadRequestException('Grupa nu aparține unității.');
    return unit;
  }
  private get(tx: EntityManager, id: string) {
    return tx.findOneOrFail(
      ScoutMember,
      { id },
      { failHandler: () => new NotFoundException('Membrul nu există.') },
    );
  }
  private async mutate<T>(
    user: CurrentUser,
    action: string,
    work: (tx: EntityManager) => Promise<{ id: string; result: T }>,
  ) {
    return this.em.transactional(async (tx) => {
      if (['lifecycle', 'transfer', 'classify'].includes(action))
        await tx.execute('select pg_advisory_xact_lock(9212026)');
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      tx.clear();
      const { id, result } = await work(tx);
      tx.create(AuditEntry, {
        actorId: user.id,
        action: `members.${action}`,
        entityType: 'MemberManagement',
        entityId: id,
        metadata: {},
      });
      return result;
    });
  }
  queue(
    tx: EntityManager,
    member: ScoutMember,
    actorId: number | null,
    kind: string,
    payload: Record<string, unknown>,
  ) {
    member.revision++;
    member.updatedAt = new Date();
    tx.create(MemberSync, {
      memberId: member.id,
      revision: member.revision,
      actorId,
      kind,
      payload,
      baseline: member.remote,
      state: kind === 'local-profile' ? 'local-only' : 'pending',
      message:
        kind === 'local-profile'
          ? 'Date păstrate în fișa locală; nu sunt trimise în Orgo.'
          : 'În așteptarea sincronizării.',
    });
  }
  async dashboard(user: CurrentUser) {
    const ctx = await this.context(this.em, user);
    const all = await this.em.find(
      ScoutMember,
      {},
      { orderBy: { name: 'asc' } },
    );
    const allAssignments = await this.em.find(ScoutAssignment, {
      endedAt: null,
    });
    const allUnits = await this.em.find(
      ScoutUnit,
      {},
      { orderBy: { name: 'asc' } },
    );
    const visible: ScoutMember[] = [];
    for (const m of all)
      if (
        (
          await this.access(this.em, user, m, {
            ctx,
            assignments: allAssignments,
            units: allUnits,
          })
        ).read
      )
        visible.push(m);
    const unitIds = new Set(ctx.assignments.map((a) => a.unitId));
    if (ctx.member?.unitId) unitIds.add(ctx.member.unitId);
    const units = allUnits
      .filter(
        (u) =>
          ctx.admin ||
          ctx.structureIds.includes(structureOf(u)) ||
          unitIds.has(u.parentId ?? u.id),
      )
      .map((u) => ({
        id: u.id,
        name: u.name,
        structureId: structureOf(u),
        branch: u.branch,
        parentId: u.parentId ?? null,
        orgoId: u.orgoId ?? null,
        archived: u.archived,
        grades: [
          ...new Set(
            all
              .filter(
                (m) => m.status === 'active' && m.groupId === u.id && m.grade,
              )
              .map((m) => m.grade!),
          ),
        ].sort((a, b) => a - b),
      }));
    const settings = await this.em.findOne(MemberSettings, { id: 'default' });
    const sync = ctx.admin
      ? await this.em.find(
          MemberSync,
          {},
          { orderBy: { createdAt: 'desc' }, limit: 100 },
        )
      : [];
    const transitions =
      ctx.admin || ctx.structureIds.length
        ? await this.em.find(
            MemberTransition,
            ctx.admin ? {} : { memberId: { $in: visible.map((m) => m.id) } },
            { orderBy: { createdAt: 'desc' }, limit: 100 },
          )
        : [];
    const chiefUnits = [
      ...units
        .filter((u) => !u.parentId && ctx.structureIds.includes(u.structureId))
        .map((u) => u.id),
      ...ctx.assignments
        .filter((a) => a.role === 'chief' && a.unitId)
        .map((a) => a.unitId!),
    ];
    const notices = ctx.admin
      ? await this.em.find(
          MemberNotice,
          {},
          { orderBy: { createdAt: 'desc' }, limit: 50 },
        )
      : chiefUnits.length
        ? await this.em.find(
            MemberNotice,
            { unitId: { $in: chiefUnits } },
            { orderBy: { createdAt: 'desc' }, limit: 50 },
          )
        : [];
    return {
      structures: (await this.em.find(LocalStructure, {})).filter(
        (s) =>
          ctx.admin ||
          ctx.structureIds.includes(s.id) ||
          structureOf(ctx.member ?? {}) === s.id ||
          units.some((u) => u.structureId === s.id),
      ),
      manageableStructureIds: ctx.admin
        ? (await this.em.find(LocalStructure, {})).map((s) => s.id)
        : ctx.structureIds,
      notices,
      admin: ctx.admin,
      canManage:
        ctx.admin ||
        ctx.structureIds.length > 0 ||
        ctx.assignments.some(
          (a) => ['chief', 'leader'].includes(a.role) || a.canEdit,
        ),
      chiefUnitIds: [
        ...units
          .filter(
            (u) => !u.parentId && ctx.structureIds.includes(u.structureId),
          )
          .map((u) => u.id),
        ...ctx.assignments
          .filter((a) => a.role === 'chief')
          .map((a) => a.unitId),
      ],
      units,
      inactiveMembers: visible.filter(isImportedInactive).map((m) => ({
        id: m.id,
        name: m.name,
        orgoId: m.orgoId,
        structureId: structureOf(m),
      })),
      members: visible
        .filter((m) => !isImportedInactive(m))
        .map((m) => ({
          responsibilityUnitIds: [
            ...new Set(
              allAssignments
                .filter((a) => a.memberId === m.id && a.unitId)
                .map((a) => a.unitId!),
            ),
          ],
          responsibilityGroupIds: [
            ...new Set(
              allAssignments
                .filter((a) => a.memberId === m.id && a.groupId)
                .map((a) => a.groupId!),
            ),
          ],
          id: m.id,
          name: m.name,
          structureId: structureOf(m),
          orgoId: m.orgoId,
          grade: m.grade,
          unitId: m.unitId,
          groupId: m.groupId,
          status: m.status,
          adultKind: m.adultKind,
        })),
      ownMemberId: ctx.member?.id ?? null,
      progressionEnabled: settings?.progressionEnabled ?? false,
      sync: sync.map((s) => ({
        id: s.id,
        memberId: s.memberId,
        kind: s.kind,
        state: s.state,
        message: s.message,
        createdAt: s.createdAt,
      })),
      transitions,
    };
  }
  async detail(user: CurrentUser, id: string) {
    const m = await this.get(this.em, id);
    const access = await this.access(this.em, user, m);
    if (!access.read) denied();
    const profile = { ...m.profile };
    if (!access.sensitive) {
      profile.medical = '';
      profile.allergies = '';
      profile.medication = '';
      profile.dietary = '';
    }
    const notes = access.notes
      ? await this.em.find(
          ScoutNote,
          { memberId: id },
          { orderBy: { createdAt: 'desc' } },
        )
      : [];
    const assignments = await this.em.find(
      ScoutAssignment,
      { memberId: id },
      { orderBy: { startedAt: 'desc' } },
    );
    const fees = access.fees ? await this.fees(m) : [];
    const sync = await this.em.find(
      MemberSync,
      { memberId: id },
      { orderBy: { createdAt: 'desc' }, limit: 20 },
    );
    return {
      member: {
        id: m.id,
        orgoId: m.orgoId,
        name: m.name,
        structureId: structureOf(m),
        birthDate: m.birthDate,
        grade: m.grade,
        unitId: m.unitId,
        groupId: m.groupId,
        status: m.status,
        adultKind: m.adultKind,
        promiseDate: m.promiseDate,
        profile,
        revision: m.revision,
        skipProgressionYear: m.skipProgressionYear,
      },
      access,
      notes,
      assignments,
      fees,
      admission:
        access.fees && m.orgoId
          ? await admissionEvidence(this.em, m.orgoId)
          : null,
      sync: sync.map((s) => ({
        id: s.id,
        kind: s.kind,
        state: s.state,
        message: s.message,
        createdAt: s.createdAt,
      })),
    };
  }
  private async fees(member: ScoutMember) {
    if (!member.orgoId) return [];
    const obligations = await this.em.find(MembershipObligation, {
      orgoUserId: member.orgoId,
    });
    const periods = await this.em.find(MembershipPeriod, {});
    const allocations = obligations.length
      ? await this.em.find(MembershipAllocation, {
          obligationId: { $in: obligations.map((o) => o.id) },
          reversed: false,
        })
      : [];
    return obligations.map((o) => {
      const paid = allocations
        .filter((a) => a.obligationId === o.id)
        .reduce((s, a) => s + a.amountBani, 0);
      const period = periods.find((p) => p.id === o.periodId);
      const collectible =
        member.status === 'active' &&
        (!member.feeResumePeriod ||
          (period?.startsOn ?? '') >= member.feeResumePeriod);
      return {
        period: period?.name ?? '',
        totalBani: o.totalBani,
        paidBani: paid,
        remainingBani: collectible ? Math.max(0, o.totalBani - paid) : 0,
        collectible,
      };
    });
  }
  async createUnit(user: CurrentUser, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'structure', async (tx) => {
      const parentId = b.parentId ? stringValue(b.parentId) : null;
      if (parentId) {
        if (!(await this.chief(tx, user, parentId))) denied();
      }
      const parent = parentId ? await this.unit(tx, parentId, null) : null;
      const structureId = parent
        ? structureOf(parent)
        : stringValue(b.structureId ?? 'cluj');
      const ctx = await this.context(tx, user);
      if (!parent && !ctx.admin && !ctx.structureIds.includes(structureId))
        denied();
      await tx.findOneOrFail(LocalStructure, { id: structureId });
      const branch = parent?.branch ?? stringValue(b.branch);
      if (!branches.includes(branch as (typeof branches)[number]))
        throw new BadRequestException('Ramură invalidă.');
      const name = stringValue(b.name);
      if (!name) throw new BadRequestException('Numele este obligatoriu.');
      const unit = tx.create(ScoutUnit, {
        name,
        branch: branch as (typeof branches)[number],
        parentId,
        structureId,
        structureConfirmed: true,
      });
      return { id: unit.id, result: unit };
    });
  }
  async archiveUnit(user: CurrentUser, id: string) {
    return this.mutate(user, 'archive', async (tx) => {
      const u = await tx.findOneOrFail(ScoutUnit, { id });
      if (u.parentId) {
        if (!(await this.chief(tx, user, u.parentId))) denied();
      } else if (!(await this.chief(tx, user, id))) denied();
      if (
        (await tx.count(
          ScoutMember,
          u.parentId
            ? { groupId: id, status: 'active' }
            : { unitId: id, status: 'active' },
        )) ||
        (await tx.count(ScoutAssignment, {
          unitId: u.parentId ?? id,
          ...(u.parentId ? { groupId: id } : {}),
          endedAt: null,
        })) ||
        (await tx.count(ScoutUnit, { parentId: id, archived: false }))
      )
        throw new ConflictException(
          'Repartizează membrii și adulții și arhivează subgrupele înainte de arhivare.',
        );
      u.archived = true;
      return { id, result: { ok: true } };
    });
  }
  async createMember(user: CurrentUser, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'create', async (tx) => {
      const unitId = b.unitId ? stringValue(b.unitId) : null,
        groupId = b.groupId ? stringValue(b.groupId) : null;
      const destination = await this.unit(tx, unitId, groupId);
      const structureId = destination
        ? structureOf(destination)
        : stringValue(b.structureId ?? 'cluj');
      if (b.structureId && b.structureId !== structureId)
        throw new BadRequestException('Unitatea aparține altei structuri.');
      await tx.findOneOrFail(LocalStructure, { id: structureId });
      if (b.kind === 'beneficiary' && !unitId)
        throw new BadRequestException('Alege unitatea beneficiarului.');
      const ctx = await this.context(tx, user);
      if (
        !permissions(
          ctx.admin || ctx.structureIds.includes(structureId),
          false,
          ctx.assignments,
          {
            id: '',
            unitId,
            groupId,
          },
        ).edit
      )
        denied();
      const name = stringValue(b.name);
      if (!name) throw new BadRequestException('Numele este obligatoriu.');
      const birthDate = b.birthDate ? dateValue(b.birthDate) : null;
      const adult = b.kind === 'adult' || !unitId;
      if (
        adult &&
        birthDate &&
        birthDate >
          `${Number(localDate(new Date()).slice(0, 4)) - 18}${localDate(new Date()).slice(4)}`
      )
        throw new BadRequestException(
          'Voluntarul adult trebuie să aibă cel puțin 18 ani.',
        );
      const candidates = await tx.find(ScoutMember, { name: { $ilike: name } });
      if (candidates.length)
        throw new ConflictException(
          'Există deja un membru cu acest nume. Verifică registrul înainte de adăugare.',
        );
      const grade = b.grade == null || b.grade === '' ? null : Number(b.grade);
      if (
        grade !== null &&
        (!Number.isInteger(grade) || grade < 1 || grade > 12)
      )
        throw new BadRequestException('Clasa trebuie să fie între 1 și 12.');
      const m = tx.create(ScoutMember, {
        name,
        structureId,
        structureConfirmed: true,
        birthDate,
        grade: adult ? null : grade,
        unitId: adult ? null : unitId,
        groupId: adult ? null : groupId,
        profile: emptyProfile(),
        adultKind: adult ? 'volunteer' : null,
        lastProgressionYear: targetYear(new Date()),
      });
      // Scalar foreign keys do not give the ORM an insert dependency graph.
      // Persist the identity before its assignments and outbox, in this same transaction.
      await tx.flush();
      if (unitId)
        tx.create(ScoutAssignment, {
          memberId: m.id,
          unitId,
          groupId,
          role: adult ? 'helper' : 'beneficiary',
          actorId: user.id,
        });
      this.queue(tx, m, user.id, 'create', { name, birthDate });
      return { id: m.id, result: { id: m.id } };
    });
  }
  async updateMember(user: CurrentUser, id: string, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'update', async (tx) => {
      const m = await this.get(tx, id),
        access = await this.access(tx, user, m);
      if (!access.edit && !access.own) denied();
      if (Number(b.revision) !== m.revision)
        throw new ConflictException(
          'Fișa s-a schimbat. Reîncarcă înainte de salvare.',
        );
      const allowed = [
        'revision',
        'profile',
        ...(access.edit ? ['grade', 'skipProgressionYear'] : []),
        ...(access.identity ? ['name', 'birthDate'] : []),
      ];
      if (Object.keys(b).some((k) => !allowed.includes(k))) denied();
      const payload: Record<string, unknown> = {};
      if ('name' in b) {
        const name = stringValue(b.name);
        if (!name) throw new BadRequestException('Numele este obligatoriu.');
        if (m.name !== name) payload.name = name;
        m.name = name;
      }
      if ('birthDate' in b) {
        const date = b.birthDate ? dateValue(b.birthDate) : null;
        if (m.birthDate !== date) payload.birthDate = date;
        m.birthDate = date;
      }
      if ('grade' in b) {
        const grade =
          b.grade == null || b.grade === '' ? null : Number(b.grade);
        if (
          grade !== null &&
          (!Number.isInteger(grade) || grade < 1 || grade > 12)
        )
          throw new BadRequestException('Clasă invalidă.');
        if (m.grade !== grade) payload.grade = grade;
        m.grade = grade;
        m.lastProgressionYear = targetYear(new Date());
      }
      if ('skipProgressionYear' in b) {
        const year = b.skipProgressionYear
          ? Number(b.skipProgressionYear)
          : null;
        if (
          year !== null &&
          (!Number.isInteger(year) ||
            year < targetYear(new Date()) ||
            year > targetYear(new Date()) + 2)
        )
          throw new BadRequestException('An invalid.');
        m.skipProgressionYear = year;
      }
      if ('profile' in b) {
        const profile = bodyObject(b.profile);
        const prior = m.profile;
        for (const [key, value] of Object.entries(profile)) {
          if (!(key in emptyProfile()))
            throw new BadRequestException('Câmp de fișă necunoscut.');
          if (
            ['medical', 'allergies', 'medication', 'dietary'].includes(key) &&
            !access.sensitive
          )
            denied();
          m.profile = { ...m.profile, [key]: stringValue(value, 4000) };
        }
        // Medical fields are intentionally local until an equivalent protected remote field is verified.
        if (prior.email !== m.profile.email || prior.phone !== m.profile.phone)
          payload.contact = { email: m.profile.email, phone: m.profile.phone };
      }
      this.queue(
        tx,
        m,
        user.id,
        Object.keys(payload).length ? 'profile' : 'local-profile',
        payload,
      );
      return { id, result: { ok: true } };
    });
  }
  async note(user: CurrentUser, id: string, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'note', async (tx) => {
      const m = await this.get(tx, id),
        a = await this.access(tx, user, m);
      if (!a.edit || !a.notes) denied();
      const body = stringValue(b.body, 8000);
      if (!body) throw new BadRequestException('Notița este goală.');
      tx.create(ScoutNote, { memberId: id, authorId: user.id, body });
      return { id, result: { ok: true } };
    });
  }
  async transfer(user: CurrentUser, id: string, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'transfer', async (tx) => {
      const m = await this.get(tx, id),
        a = await this.access(tx, user, m);
      const unitId = b.unitId ? stringValue(b.unitId) : null,
        groupId = b.groupId ? stringValue(b.groupId) : null;
      const destination = await this.unit(tx, unitId, groupId);
      const structureId = b.structureId
        ? stringValue(b.structureId)
        : destination
          ? structureOf(destination)
          : structureOf(m);
      const ctx = await this.context(tx, user);
      if (structureId !== structureOf(m) && !ctx.admin) denied();
      if (destination && structureOf(destination) !== structureId)
        throw new BadRequestException('Unitatea aparține altei structuri.');
      await tx.findOneOrFail(LocalStructure, { id: structureId });
      if (
        (!m.unitId && !a.transfer) ||
        (m.unitId !== unitId ? !a.transfer : !a.edit)
      )
        denied();
      if (m.status !== 'active')
        throw new BadRequestException('Reactivează membrul înainte de mutare.');
      if (structureOf(m) !== structureId) {
        tx.create(AuditEntry, {
          actorId: user.id,
          action: 'members.structure-transfer',
          entityType: 'Member',
          entityId: m.id,
          metadata: { from: structureOf(m), to: structureId },
        });
        m.structureId = structureId;
        m.structureConfirmed = true;
        if (m.orgoId) {
          const obligations = await tx.find(MembershipObligation, {
            orgoUserId: m.orgoId,
          });
          for (const o of obligations)
            for (const c of await tx.find(MembershipCheckout, {
              obligationId: o.id,
              purpose: 'admission',
              state: { $in: ['starting', 'pending', 'unknown'] },
            }))
              c.reviewRequired = true;
        }
      }
      if (!unitId) {
        if (
          !m.birthDate ||
          m.birthDate >
            `${Number(localDate(new Date()).slice(0, 4)) - 18}${localDate(new Date()).slice(4)}`
        )
          throw new BadRequestException(
            'Trecerea la voluntar adult necesită o dată a nașterii verificată și vârsta de minimum 18 ani.',
          );
        m.adultKind = 'volunteer';
        m.grade = null;
        if (m.unitId)
          for (const assignment of await tx.find(ScoutAssignment, {
            memberId: id,
            role: 'helper',
            endedAt: null,
          }))
            assignment.endedAt = new Date();
      }
      await this.place(tx, m, unitId, groupId, user.id);
      if (unitId) tx.create(MemberNotice, { unitId, memberId: m.id });
      this.queue(tx, m, user.id, 'assignment', {
        unitId,
        groupId,
        structureId,
      });
      return { id, result: { ok: true } };
    });
  }
  async place(
    tx: EntityManager,
    m: ScoutMember,
    unitId: string | null,
    groupId: string | null,
    actorId: number,
  ) {
    const old = await tx.find(ScoutAssignment, {
      memberId: m.id,
      role: 'beneficiary',
      endedAt: null,
    });
    for (const assignment of old) assignment.endedAt = new Date();
    // Close the old row before inserting a replacement under the partial unique index.
    await tx.flush();
    m.unitId = unitId;
    m.groupId = groupId;
    if (unitId)
      tx.create(ScoutAssignment, {
        memberId: m.id,
        unitId,
        groupId,
        role: 'beneficiary',
        actorId,
      });
  }
  async lifecycle(user: CurrentUser, id: string, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'lifecycle', async (tx) => {
      const m = await this.get(tx, id);
      const action = stringValue(b.action);
      if (action === 'withdraw') {
        if (!(await this.access(tx, user, m)).withdraw) denied();
        for (const a of await tx.find(ScoutAssignment, {
          memberId: id,
          endedAt: null,
        }))
          a.endedAt = new Date();
        m.status = 'withdrawn';
        if (m.orgoId) {
          const obligations = await tx.find(MembershipObligation, {
            orgoUserId: m.orgoId,
          });
          for (const obligation of obligations)
            for (const checkout of await tx.find(MembershipCheckout, {
              obligationId: obligation.id,
              state: { $in: ['starting', 'pending', 'unknown'] },
            }))
              checkout.reviewRequired = true;
        }
        const account = m.accountId
          ? await tx.findOne(User, { id: m.accountId })
          : null;
        if (account) {
          account.councilAdmin = false;
          account.memberAccessDisabled = true;
        }
      } else if (action === 'reactivate') {
        const unitId = b.unitId ? stringValue(b.unitId) : null,
          groupId = b.groupId ? stringValue(b.groupId) : null;
        const destination = await this.unit(tx, unitId, groupId);
        if (destination && structureOf(destination) !== structureOf(m))
          throw new BadRequestException(
            'Reactivează în aceeași structură, apoi folosește transferul.',
          );
        const ctx = await this.context(tx, user);
        if (
          !permissions(
            ctx.admin || ctx.structureIds.includes(structureOf(m)),
            false,
            ctx.assignments,
            {
              id,
              unitId,
              groupId,
            },
          ).edit
        )
          denied();
        if (!['withdrawn', 'review'].includes(m.status))
          throw new BadRequestException('Membrul este deja activ.');
        const wasWithdrawn = m.status === 'withdrawn';
        m.status = 'active';
        m.adultKind = unitId ? null : 'volunteer';
        if (wasWithdrawn) m.feeResumePeriod = `${targetYear(new Date())}-09-01`;
        await this.place(tx, m, unitId, groupId, user.id);
        const current = await tx.findOne(MembershipPeriod, {
          startsOn: m.feeResumePeriod,
        });
        if (current && m.orgoId) {
          const existing = await tx.findOne(MembershipObligation, {
            orgoUserId: m.orgoId,
            periodId: current.id,
          });
          if (existing) {
            if (
              ['orgo_review', 'missing_from_orgo'].includes(
                existing.reviewState ?? '',
              )
            ) {
              existing.reviewState = null;
              existing.reviewReason = null;
            }
          } else {
            const prior = await tx.find(
              MembershipObligation,
              { orgoUserId: m.orgoId },
              { orderBy: { createdAt: 'desc' }, limit: 1 },
            );
            const previousPlan = prior[0]?.plan;
            const price = previousPlan
              ? current.prices[previousPlan as keyof typeof current.prices]
              : null;
            if (previousPlan && price)
              tx.create(MembershipObligation, {
                orgoUserId: m.orgoId,
                periodId: current.id,
                memberName: m.name,
                plan: previousPlan,
                totalBani: price.totalBani,
                nationalBani: price.nationalBani,
                verificationNote:
                  'Reactivare: cotizația anului curent; fără recuperarea anilor anteriori.',
              });
          }
        }
        // Old manual global access must not spring back on return.
        if (m.accountId && wasWithdrawn) {
          const account = await tx.findOne(User, { id: m.accountId });
          if (account) {
            account.roles = [];
            account.memberAccessDisabled = false;
            account.councilAdmin = false;
          }
        }
      } else throw new BadRequestException('Acțiune necunoscută.');
      this.queue(tx, m, user.id, 'status', { status: m.status });
      return { id, result: { ok: true } };
    });
  }
  async assignment(user: CurrentUser, id: string, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'responsibility', async (tx) => {
      const m = await this.get(tx, id);
      if (m.status !== 'active')
        throw new BadRequestException('Membrul este retras.');
      const role = stringValue(b.role) as AssignmentRole;
      if (!adultRoles.includes(role as (typeof adultRoles)[number]))
        throw new BadRequestException('Rol invalid.');
      const unitId = b.unitId ? stringValue(b.unitId) : null,
        groupId = b.groupId ? stringValue(b.groupId) : null;
      const unit = await this.unit(tx, unitId, groupId);
      const structureId =
        role === 'structure_admin' ? stringValue(b.structureId) : null;
      if (structureId)
        await tx.findOneOrFail(LocalStructure, { id: structureId });
      const ctx = await this.context(tx, user);
      if (unit && structureOf(unit) !== structureOf(m) && !ctx.admin) denied();
      if (
        role === 'chief' &&
        !ctx.admin &&
        (!unit || !ctx.structureIds.includes(structureOf(unit)))
      )
        denied();
      if (['council', 'scouter', 'structure_admin'].includes(role))
        await this.admin(tx, user);
      else if (!unitId || !(await this.chief(tx, user, unitId))) denied();
      if (['chief', 'leader', 'helper'].includes(role) && !unit)
        throw new BadRequestException('Selectează unitatea.');
      if (
        ['council', 'scouter', 'structure_admin'].includes(role) &&
        (unitId || groupId)
      )
        throw new BadRequestException('Acest rol este la nivel de centru.');
      if (role === 'chief' && groupId)
        throw new BadRequestException('Șeful răspunde de întreaga unitate.');
      const ownUnit = m.unitId
        ? await tx.findOne(ScoutUnit, { id: m.unitId })
        : null;
      if (
        !m.birthDate ||
        m.birthDate >
          `${Number(localDate(new Date()).slice(0, 4)) - 18}${localDate(new Date()).slice(4)}`
      )
        throw new BadRequestException(
          'Responsabilitățile de adult necesită o dată a nașterii verificată și vârsta de cel puțin 18 ani.',
        );
      if (['leader', 'chief'].includes(role)) {
        const promise = b.promiseDate
          ? dateValue(b.promiseDate)
          : m.promiseDate;
        if (
          !promise ||
          promise > localDate(new Date()) ||
          !m.birthDate ||
          m.birthDate >
            `${Number(localDate(new Date()).slice(0, 4)) - 18}${localDate(new Date()).slice(4)}` ||
          ownUnit?.branch === 'seniori'
        )
          throw new BadRequestException(
            'Rolul cere un adult cu promisiunea de lider, care nu este beneficiar la Seniori.',
          );
        m.promiseDate = promise;
      }
      if (role === 'council' && !m.accountId)
        throw new BadRequestException(
          'Membrul trebuie să aibă un cont autentificat asociat prin Orgo.',
        );
      if (role === 'chief') {
        for (const old of await tx.find(ScoutAssignment, {
          unitId,
          role,
          endedAt: null,
        }))
          old.endedAt = new Date();
        await tx.flush();
      }
      const existing = await tx.findOne(ScoutAssignment, {
        memberId: id,
        unitId,
        groupId,
        role,
        structureId,
        endedAt: null,
      });
      const a =
        existing ??
        tx.create(ScoutAssignment, {
          memberId: id,
          unitId,
          groupId,
          role,
          structureId,
          actorId: user.id,
        });
      a.canEdit = b.canEdit === true;
      a.canSeeFees = b.canSeeFees === true;
      a.canSeeSensitive = b.canSeeSensitive === true;
      if (role === 'council' && m.accountId) {
        const account = await tx.findOneOrFail(User, { id: m.accountId });
        account.councilAdmin = true;
      }
      if (role === 'scouter') m.adultKind = 'scouter';
      else if (!m.unitId) m.adultKind = 'volunteer';
      this.queue(tx, m, user.id, 'roles', { assignmentId: a.id });
      return { id, result: { ok: true } };
    });
  }
  async endAssignment(user: CurrentUser, id: string, assignmentId: string) {
    return this.mutate(user, 'end-responsibility', async (tx) => {
      const m = await this.get(tx, id);
      const a = await tx.findOneOrFail(ScoutAssignment, {
        id: assignmentId,
        memberId: id,
        endedAt: null,
      });
      if (a.role === 'beneficiary')
        throw new BadRequestException(
          'Folosește mutarea sau retragerea membrului.',
        );
      if (a.role === 'chief') {
        const ctx = await this.context(tx, user);
        const unit = a.unitId
          ? await tx.findOne(ScoutUnit, { id: a.unitId })
          : null;
        if (
          !ctx.admin &&
          (!unit || !ctx.structureIds.includes(structureOf(unit)))
        )
          denied();
      } else if (['council', 'scouter', 'structure_admin'].includes(a.role))
        await this.admin(tx, user);
      else if (!a.unitId || !(await this.chief(tx, user, a.unitId))) denied();
      a.endedAt = new Date();
      if (a.role === 'council' && m.accountId) {
        const account = await tx.findOneOrFail(User, { id: m.accountId });
        account.councilAdmin = false;
      }
      this.queue(tx, m, user.id, 'roles', { endedAssignmentId: a.id });
      return { id, result: { ok: true } };
    });
  }
  async progressionSettings(user: CurrentUser, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'progression-settings', async (tx) => {
      await this.admin(tx, user);
      const settings =
        (await tx.findOne(MemberSettings, { id: 'default' })) ??
        tx.create(MemberSettings, { id: 'default' });
      settings.progressionEnabled = b.enabled === true;
      return { id: 'default', result: { ok: true } };
    });
  }
  async structurePreview(user: CurrentUser) {
    await this.admin(this.em, user);
    return {
      structures: await this.em.find(LocalStructure, {}),
      units: (
        await this.em.find(ScoutUnit, {
          parentId: null,
          structureConfirmed: false,
        })
      ).map((u) => ({
        id: u.id,
        name: u.name,
        structureId: proposedStructure(u.name),
      })),
      members: (
        await this.em.find(
          ScoutMember,
          { structureConfirmed: false },
          { orderBy: { name: 'asc' } },
        )
      ).map((m) => ({
        id: m.id,
        name: m.name,
        revision: m.revision,
        unitId: m.unitId,
        inactive: isImportedInactive(m),
        structureId: proposedStructure(m.name),
      })),
    };
  }
  async confirmStructures(user: CurrentUser, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'classify', async (tx) => {
      await this.admin(tx, user);
      if (
        b.confirm !== true ||
        !Array.isArray(b.members) ||
        !Array.isArray(b.units)
      )
        throw new BadRequestException('Verifică și confirmă repartizarea.');
      const structures = new Set(
        (await tx.find(LocalStructure, {})).map((s) => s.id),
      );
      const units = await tx.find(ScoutUnit, {});
      const seenUnits = new Set<string>(),
        seenMembers = new Set<string>();
      for (const input of b.units) {
        const row = bodyObject(input),
          u = units.find((u) => u.id === row.id && !u.parentId);
        if (
          !u ||
          u.structureConfirmed ||
          seenUnits.has(u.id) ||
          !structures.has(String(row.structureId))
        )
          throw new ConflictException(
            'Unitățile s-au schimbat. Reîncarcă previzualizarea.',
          );
        seenUnits.add(u.id);
        u.structureId = String(row.structureId);
        u.structureConfirmed = true;
        for (const g of units.filter((g) => g.parentId === u.id)) {
          g.structureId = u.structureId;
          g.structureConfirmed = true;
        }
      }
      for (const input of b.members) {
        const row = bodyObject(input),
          m = await this.get(tx, stringValue(row.id));
        if (
          m.structureConfirmed ||
          m.revision !== Number(row.revision) ||
          seenMembers.has(m.id) ||
          !structures.has(String(row.structureId))
        )
          throw new ConflictException(
            'Membrii s-au schimbat. Reîncarcă previzualizarea.',
          );
        seenMembers.add(m.id);
        const unitId = row.unitId ? stringValue(row.unitId) : null;
        if (m.unitId && !unitId)
          throw new BadRequestException(
            'Păstrează o unitate pentru beneficiar.',
          );
        if (
          unitId &&
          structureOf(units.find((u) => u.id === unitId) ?? {}) !==
            row.structureId
        )
          throw new BadRequestException(
            `Unitatea și apartenența trebuie să coincidă pentru ${m.name}.`,
          );
        if (unitId !== (m.unitId ?? null)) {
          await this.unit(tx, unitId, null);
          if (m.status === 'active')
            await this.place(tx, m, unitId, null, user.id);
          else {
            m.unitId = unitId;
            m.groupId = null;
          }
        }
        if (!m.structureConfirmed && m.orgoId) {
          const obligations = await tx.find(MembershipObligation, {
            orgoUserId: m.orgoId,
          });
          for (const o of obligations)
            for (const c of await tx.find(MembershipCheckout, {
              obligationId: o.id,
              purpose: 'admission',
              state: { $in: ['starting', 'pending', 'unknown'] },
            }))
              c.reviewRequired = true;
        }
        m.structureId = String(row.structureId);
        m.structureConfirmed = true;
        this.queue(tx, m, user.id, 'local-profile', {
          structureId: m.structureId,
        });
      }
      for (const m of await tx.find(ScoutMember, { unitId: { $ne: null } })) {
        const u = units.find((u) => u.id === m.unitId);
        if (u && structureOf(u) !== structureOf(m))
          throw new BadRequestException(
            `Repartizarea lui ${m.name} nu corespunde unității.`,
          );
      }
      return { id: 'structures', result: { ok: true } };
    });
  }
  async annual(now = new Date()) {
    const em = this.em.fork();
    if (
      !(await em.findOne(MemberSettings, { id: 'default' }))?.progressionEnabled
    )
      return;
    const year = targetYear(now);
    const members = await em.find(ScoutMember, {
      status: 'active',
      unitId: { $ne: null },
    });
    for (const row of members)
      await em.fork().transactional(async (tx) => {
        await tx.execute('select pg_advisory_xact_lock(19102026)');
        const m = await this.get(tx, row.id);
        if (
          m.status !== 'active' ||
          !m.unitId ||
          (m.lastProgressionYear ?? year) >= year ||
          (await tx.count(MemberTransition, {
            memberId: m.id,
            year,
            state: { $in: ['done', 'skipped'] },
          }))
        )
          return;
        const unit = await tx.findOneOrFail(ScoutUnit, { id: m.unitId });
        const result = progression(m.grade, unit.branch, m.birthDate, year);
        const transition =
          (await tx.findOne(MemberTransition, { memberId: m.id, year })) ??
          tx.create(MemberTransition, {
            memberId: m.id,
            year,
            state: 'review',
            message: '',
          });
        if (m.skipProgressionYear === year) {
          transition.state = 'skipped';
          transition.message = 'Excepție individuală.';
          m.lastProgressionYear = year;
          return;
        }
        if ((m.lastProgressionYear ?? year) < year - 1) {
          transition.message =
            'Sunt mai mulți ani neprocesați. Verifică manual clasa.';
          return;
        }
        if ('review' in result) {
          transition.message = result.review ?? '';
          return;
        }
        if (result.branch !== unit.branch) {
          const destinations = result.branch
            ? await tx.find(ScoutUnit, {
                branch: result.branch,
                structureId: structureOf(m),
                parentId: null,
                archived: false,
              })
            : [];
          if (result.branch && destinations.length !== 1) {
            transition.message =
              'Unitatea de destinație nu poate fi identificată unic.';
            return;
          }
          if (unit.branch === 'temerari' && m.groupId) {
            const group = await tx.findOneOrFail(ScoutUnit, { id: m.groupId });
            group.graduationYear = year;
          }
          await this.place(tx, m, destinations[0]?.id ?? null, null, 0);
          if (!result.branch) {
            m.adultKind = 'volunteer';
            for (const a of await tx.find(ScoutAssignment, {
              memberId: m.id,
              endedAt: null,
              role: 'helper',
            }))
              a.endedAt = now;
          }
        }
        m.grade = result.grade;
        m.lastProgressionYear = year;
        transition.state = 'done';
        transition.message = 'Actualizare anuală aplicată.';
        this.queue(tx, m, null, 'progression', {
          grade: m.grade,
          unitId: m.unitId,
          groupId: m.groupId,
          adultKind: m.adultKind,
        });
        tx.create(AuditEntry, {
          action: 'members.annual',
          entityType: 'Member',
          entityId: m.id,
          metadata: { year },
        });
      });
    // Empty graduated cohorts can close only after all beneficiaries have moved.
    await em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      for (const group of await tx.find(ScoutUnit, {
        parentId: { $ne: null },
        branch: 'temerari',
        archived: false,
        graduationYear: { $ne: null },
      })) {
        if (
          await tx.count(ScoutMember, { groupId: group.id, status: 'active' })
        )
          continue;
        const graduated = await tx.count(ScoutAssignment, {
          groupId: group.id,
          role: 'beneficiary',
          endedAt: { $ne: null },
        });
        if (!graduated) continue;
        group.archived = true;
        for (const a of await tx.find(ScoutAssignment, {
          groupId: group.id,
          endedAt: null,
        })) {
          a.endedAt = now;
          const adult = await this.get(tx, a.memberId);
          this.queue(tx, adult, null, 'roles', { endedAssignmentId: a.id });
        }
      }
    });
  }
}

import { admissionEvidence } from '../membership/admission-ledger';
import {
  profileFields,
  readonlyFields,
  customProfilePatch,
} from './orgo-profile';
import { createHash } from 'node:crypto';
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
  ScoutSubunit,
  ScoutUnitSource,
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
  hasSchoolGrade,
  emptyProfile,
  permissions,
  targetYear,
  progression,
  localDate,
  isImportedInactive,
  structureOf,
  type AssignmentRole,
} from './member.types';

import {
  activeMandates,
  importedCategory,
  isYouth,
  type Category,
} from './organization';

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

  async authorizeSyncActor(
    actorId: number,
    memberId: string,
    kind: string,
    fields: string[],
  ) {
    const tx = this.em.fork();
    const account = await tx.findOneOrFail(
      User,
      { id: actorId },
      { refresh: true },
    );
    if (account.memberAccessDisabled) denied();
    const user: CurrentUser = {
      id: account.id,
      displayName: account.displayName,
      roles: [
        ...new Set([
          ...account.roles,
          ...(account.councilAdmin ? [UserRole.Admin] : []),
        ]),
      ],
    };
    if (kind === 'fee-plan') {
      if (
        !user.roles.some((role) =>
          [
            UserRole.Admin,
            UserRole.SuperAdmin,
            UserRole.FinanceManager,
          ].includes(role),
        )
      )
        denied();
      return;
    }
    const member = await this.get(tx, memberId),
      grant = await this.access(tx, user, member);
    if (kind === 'status' ? !grant.withdraw : !grant.edit && !grant.own)
      denied();
    if (
      fields.some((field) =>
        [
          'firstName',
          'lastName',
          'middleName',
          'dateBirth',
          'dateJoined',
          'dateJoinedFullMember',
        ].includes(field),
      ) &&
      !grant.identity
    )
      denied();
    if (fields.some((field) => field.startsWith('custom:')) && !grant.sensitive)
      denied();
    for (const field of fields.filter((key) => key.startsWith('custom:'))) {
      const id = Number(field.slice(7));
      const definitions = Array.isArray(member.orgoProfile?.customDefinitions)
        ? member.orgoProfile.customDefinitions
        : [];
      const definition = definitions.find(
        (item) => Number((item as { id?: number }).id) === id,
      ) as { visibility?: string; isOnlyAdmin?: boolean } | undefined;
      if (
        !definition ||
        ((definition.visibility === 'admin' || definition.isOnlyAdmin) &&
          !grant.identity)
      )
        denied();
    }
  }

  async requireRosterAccess(user: CurrentUser) {
    const ctx = await this.context(this.em.fork(), user);
    if (!ctx.member || ctx.member.status !== 'active') denied();
  }

  async applyOrgoStatus(tx: EntityManager, m: ScoutMember, status: string) {
    if (m.status === status && status === 'active') return;
    let changed = m.status !== status;
    const wasInactive = m.status !== 'active';
    if (status !== 'active') {
      for (const a of await tx.find(ScoutAssignment, {
        memberId: m.id,
        endedAt: null,
      })) {
        a.endedAt = new Date();
        changed = true;
      }
      if (m.orgoId) {
        for (const obligation of await tx.find(MembershipObligation, {
          orgoUserId: m.orgoId,
        }))
          for (const checkout of await tx.find(MembershipCheckout, {
            obligationId: obligation.id,
            state: { $in: ['starting', 'pending', 'unknown'] },
          }))
            checkout.reviewRequired = true;
      }
    } else if (wasInactive) {
      m.feeResumePeriod = `${targetYear(new Date())}-09-01`;
      const current = await tx.findOne(MembershipPeriod, {
        startsOn: m.feeResumePeriod,
      });
      if (current && m.orgoId) {
        const obligation = await tx.findOne(MembershipObligation, {
          orgoUserId: m.orgoId,
          periodId: current.id,
        });
        if (
          obligation &&
          ['orgo_review', 'missing_from_orgo'].includes(
            obligation.reviewState ?? '',
          )
        ) {
          obligation.reviewState = null;
          obligation.reviewReason = null;
        }
      }
    }
    if (m.accountId) {
      const account = await tx.findOne(User, { id: m.accountId });
      if (account) {
        if (
          account.memberAccessDisabled !== (status !== 'active') ||
          account.councilAdmin
        )
          changed = true;
        account.councilAdmin = false;
        account.memberAccessDisabled = status !== 'active';
        if (status === 'active' && wasInactive) account.roles = [];
      }
    }
    if (!changed) return;
    const previous = m.status;
    m.status = status;
    tx.create(AuditEntry, {
      actorId: null,
      action: 'members.orgo-status',
      entityType: 'Member',
      entityId: m.id,
      metadata: { from: previous, to: status },
    });
  }

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
    const enabled =
      !account.memberAccessDisabled && member?.status === 'active';
    const allAssignments = enabled ? await tx.find(ScoutAssignment, {}) : [];
    // A manually delegated root remains valid only while its issuer has a central mandate.
    // Imported Orgo mandates are trusted source roots; all local descendants retain parent links.
    const accounts = enabled ? await tx.find(User, {}) : [];
    const identities = enabled ? await tx.find(ScoutMember, {}) : [];
    const centralActors = new Set(
      accounts
        .filter(
          (a) =>
            !a.memberAccessDisabled &&
            a.centralMemberAdmin &&
            a.roles.some((r) =>
              [UserRole.Admin, UserRole.SuperAdmin].includes(r),
            ) &&
            identities.some(
              (m) =>
                m.accountId === a.id &&
                m.status === 'active' &&
                structureOf(m) === 'cluj',
            ),
        )
        .map((a) => a.id),
    );
    const validByTime = activeMandates(allAssignments);
    let previousSize = -1;
    while (previousSize !== centralActors.size) {
      previousSize = centralActors.size;
      for (const mandate of validByTime.filter((a) => a.role === 'council')) {
        if (mandate.orgoRoleId == null && !centralActors.has(mandate.actorId))
          continue;
        const identity = identities.find(
          (m) =>
            m.id === mandate.memberId &&
            m.status === 'active' &&
            structureOf(m) === 'cluj',
        );
        if (
          identity?.accountId &&
          accounts.some(
            (a) => a.id === identity.accountId && !a.memberAccessDisabled,
          )
        )
          centralActors.add(identity.accountId);
      }
    }
    const activeAssignments = activeMandates(
      allAssignments.filter(
        (a) =>
          a.parentAssignmentId ||
          a.role === 'beneficiary' ||
          a.orgoRoleId != null ||
          centralActors.has(a.actorId),
      ),
    );
    let assignments = activeAssignments.filter(
      (a) => a.memberId === member?.id,
    );
    const homeStructureId = enabled && member ? structureOf(member) : null;
    const admin =
      homeStructureId === 'cluj' &&
      ((account.centralMemberAdmin &&
        account.roles.some((r) =>
          [UserRole.Admin, UserRole.SuperAdmin].includes(r),
        )) ||
        assignments.some((a) => a.role === 'council'));
    const assignedUnits = await tx.find(ScoutUnit, {});
    assignments = assignments.filter(
      (a) =>
        !a.unitId ||
        admin ||
        assignedUnits.some(
          (u) => u.id === a.unitId && structureOf(u) === homeStructureId,
        ),
    );
    const structureIds = assignments
      .filter(
        (a) =>
          a.role === 'structure_admin' && a.structureId === homeStructureId,
      )
      .map((a) => a.structureId!);
    const adult =
      !!enabled &&
      !!member &&
      (['lideri', 'voluntari', 'scouteri'].includes(member.category ?? '') ||
        (!!member.birthDate &&
          member.birthDate <=
            `${Number(localDate(new Date()).slice(0, 4)) - 18}${localDate(new Date()).slice(4)}`));
    return {
      admin,
      member,
      assignments,
      structureIds,
      homeStructureId,
      adult,
      activeAssignments,
    };
  }
  private inStructure(
    ctx: Awaited<ReturnType<MembersService['context']>>,
    structureId: string,
  ) {
    return ctx.admin || ctx.homeStructureId === structureId;
  }
  async access(
    tx: EntityManager,
    user: CurrentUser,
    member: ScoutMember,
    snapshot?: {
      ctx: Awaited<ReturnType<MembersService['context']>>;
      assignments: ScoutAssignment[];
      units: { id: string; structureId: string }[];
    },
  ) {
    const ctx = snapshot?.ctx ?? (await this.context(tx, user));
    const own = ctx.member?.id === member.id;
    const allowed = this.inStructure(ctx, structureOf(member));
    const scoped = permissions(
      allowed && (ctx.admin || ctx.structureIds.includes(structureOf(member))),
      allowed && own,
      allowed ? ctx.assignments : [],
      member,
    );
    for (const key of Object.keys(scoped) as (keyof typeof scoped)[])
      scoped[key] &&= allowed;
    return {
      ...scoped,
      read: allowed && (ctx.admin || ctx.adult || own),
      detail: allowed && scoped.read,
      delegate:
        !!member.birthDate &&
        member.birthDate <=
          `${Number(localDate(new Date()).slice(0, 4)) - 18}${localDate(new Date()).slice(4)}` &&
        allowed &&
        (ctx.admin ||
          ctx.structureIds.includes(structureOf(member)) ||
          ctx.assignments.some((a) => a.role === 'chief')),
      own: allowed && own,
      withdraw: scoped.edit,
    };
  }
  private async chief(tx: EntityManager, user: CurrentUser, unitId: string) {
    const ctx = await this.context(tx, user);
    const unit = await tx.findOne(ScoutUnit, { id: unitId });
    return (
      !!unit &&
      this.inStructure(ctx, structureOf(unit)) &&
      (ctx.admin ||
        (!!unit && ctx.structureIds.includes(structureOf(unit))) ||
        ctx.assignments.some((a) => a.role === 'chief' && a.unitId === unitId))
    );
  }
  async requireCentral(tx: EntityManager, user: CurrentUser) {
    await this.admin(tx, user);
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
      fixed: true,
    });
    if (!unit) throw new BadRequestException('Unitate invalidă.');
    if (
      groupId &&
      !(await tx.findOne(ScoutSubunit, {
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
      if (['lifecycle', 'transfer', 'classify', 'bulk'].includes(action))
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
      baseline:
        kind === 'orgo-profile'
          ? {
              email: member.remote?.email,
              phoneNumber: member.remote?.phone,
              ...member.orgoBase,
            }
          : member.remote,
      state: ['local-profile', 'assignment', 'roles', 'progression'].includes(
        kind,
      )
        ? 'local-only'
        : 'pending',
      message: ['local-profile', 'assignment', 'roles', 'progression'].includes(
        kind,
      )
        ? 'Date păstrate în fișa locală; nu sunt trimise în Orgo.'
        : 'În așteptarea sincronizării.',
    });
  }
  async bulk(user: CurrentUser, input: unknown) {
    const b = bodyObject(input);
    if (
      !Array.isArray(b.members) ||
      !b.members.length ||
      b.members.length > 1500
    )
      throw new BadRequestException('Selectează între 1 și 1500 de membri.');
    const rows = b.members.map((value) => {
      const r = bodyObject(value);
      return { id: stringValue(r.id), revision: Number(r.revision) };
    });
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new BadRequestException('Selecție duplicată.');
    const changes = bodyObject(b.changes);
    const allowed = [
      'grade',
      'transfer',
      'withdraw',
      'reactivate',
      'structure',
    ];
    if (!allowed.includes(String(changes.kind)))
      throw new BadRequestException('Operație invalidă.');
    const em = this.em.fork();
    const run = async (tx: EntityManager) => {
      await tx.execute('select pg_advisory_xact_lock(9212026)');
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      tx.clear();
      const members: ScoutMember[] = [];
      for (const row of rows) {
        const m = await this.get(tx, row.id);
        if (m.revision !== row.revision)
          throw new ConflictException(
            'Selecția s-a schimbat. Reîncarcă registrul.',
          );
        if (!(await this.access(tx, user, m)).read) denied();
        members.push(m);
      }
      const version = createHash('sha256')
        .update(JSON.stringify({ actor: user.id, rows, changes }))
        .digest('hex');
      if (b.confirm === true && b.version !== version)
        throw new ConflictException('Reîncarcă previzualizarea.');
      const preview = members.map((m) => ({
        id: m.id,
        name: m.name,
        revision: m.revision,
        from: structureOf(m),
        unitId: m.unitId,
      }));
      for (const m of members) {
        const kind = String(changes.kind);
        if (kind === 'structure') {
          await this.admin(tx, user);
          const structureId = stringValue(changes.structureId);
          await tx.findOneOrFail(LocalStructure, { id: structureId });
          if (structureOf(m) !== structureId) {
            const previous = structureOf(m);
            const category = m.category;
            if (m.unitId) {
              const unit = await tx.findOne(ScoutUnit, { id: m.unitId });
              m.branch = unit?.branch ?? m.branch;
              await this.place(tx, m, null, null, user.id);
            }
            m.structureId = structureId;
            m.structureConfirmed = true;
            const destination = category
              ? await tx.findOne(ScoutUnit, {
                  fixed: true,
                  structureId,
                  branch: category,
                })
              : null;
            await this.place(tx, m, destination?.id ?? null, null, user.id);
            if (m.orgoId)
              for (const o of await tx.find(MembershipObligation, {
                orgoUserId: m.orgoId,
              }))
                for (const c of await tx.find(MembershipCheckout, {
                  obligationId: o.id,
                  purpose: 'admission',
                  state: { $in: ['starting', 'pending', 'unknown'] },
                }))
                  c.reviewRequired = true;
            tx.create(AuditEntry, {
              actorId: user.id,
              action: 'members.structure-transfer',
              entityType: 'Member',
              entityId: m.id,
              metadata: { from: previous, to: structureId },
            });
            this.queue(tx, m, user.id, 'assignment', { structureId });
          }
        } else if (kind === 'grade')
          await this.applyUpdateMember(tx, user, m.id, {
            revision: m.revision,
            grade: changes.grade,
          });
        else if (kind === 'transfer')
          await this.applyTransfer(tx, user, m.id, {
            unitId: changes.unitId,
            groupId: changes.groupId,
          });
        else
          await this.applyLifecycle(tx, user, m.id, {
            action: kind,
            unitId: changes.unitId,
            groupId: changes.groupId,
          });
        tx.create(AuditEntry, {
          actorId: user.id,
          action: 'members.bulk-' + kind,
          entityType: 'Member',
          entityId: m.id,
          metadata: { size: members.length },
        });
      }
      const result = {
        version,
        members: preview,
        changes,
        applied: b.confirm === true,
      };
      if (b.confirm !== true) throw new BulkPreview(result);
      return result;
    };
    try {
      return await em.transactional(run);
    } catch (error) {
      if (error instanceof BulkPreview) return error.result;
      throw error;
    }
  }

  async dashboard(user: CurrentUser) {
    const ctx = await this.context(this.em, user);
    const all = await this.em.find(
      ScoutMember,
      {},
      { orderBy: { name: 'asc' } },
    );
    const allAssignments = ctx.activeAssignments;
    const allUnits = [
      ...(await this.em.find(
        ScoutUnit,
        { fixed: true },
        { orderBy: { name: 'asc' } },
      )),
      ...(await this.em.find(ScoutSubunit, {}, { orderBy: { name: 'asc' } })),
    ];
    const visible: ScoutMember[] = [];
    const grants = new Map<
      string,
      Awaited<ReturnType<MembersService['access']>>
    >();
    for (const m of all) {
      const grant = await this.access(this.em, user, m, {
        ctx,
        assignments: allAssignments,
        units: allUnits,
      });
      grants.set(m.id, grant);
      if (grant.read) visible.push(m);
    }
    const unitIds = new Set(ctx.assignments.map((a) => a.unitId));
    if (ctx.member?.unitId) unitIds.add(ctx.member.unitId);
    const units = allUnits
      .filter(
        (u) =>
          this.inStructure(ctx, structureOf(u)) &&
          (ctx.admin || ctx.adult || unitIds.has(u.parentId ?? u.id)),
      )
      .map((u) => ({
        id: u.id,
        name: u.name,
        structureId: structureOf(u),
        branch: u.branch,
        parentId: u.parentId ?? null,
        orgoId: u.orgoId ?? null,
        archived: u.archived,
        canCreateMember:
          this.inStructure(ctx, structureOf(u)) &&
          (ctx.admin ||
            ctx.structureIds.includes(structureOf(u)) ||
            ctx.assignments.some(
              (a) =>
                a.unitId === (u.parentId ?? u.id) &&
                (a.role === 'chief' ||
                  (!!u.parentId &&
                    a.groupId === u.id &&
                    (a.role === 'leader' || a.canEdit))),
            )),
        delegateRoles:
          !u.parentId && this.inStructure(ctx, structureOf(u))
            ? ctx.admin
              ? ['chief', 'leader', 'helper']
              : ctx.structureIds.includes(structureOf(u))
                ? ['chief']
                : ctx.assignments.some(
                      (a) => a.role === 'chief' && a.unitId === u.id,
                    )
                  ? ['leader', 'helper']
                  : []
            : [],
        canManage:
          this.inStructure(ctx, structureOf(u)) &&
          (ctx.admin ||
            ctx.structureIds.includes(structureOf(u)) ||
            ctx.assignments.some(
              (a) => a.role === 'chief' && a.unitId === (u.parentId ?? u.id),
            )),
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
    const pendingSync = visible.length
      ? await this.em.find(
          MemberSync,
          {
            memberId: { $in: visible.map((m) => m.id) },
            state: { $nin: ['synced', 'superseded', 'local-only'] },
          },
          { orderBy: { createdAt: 'desc' } },
        )
      : [];
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
      structures: (await this.em.find(LocalStructure, {})).filter((s) =>
        this.inStructure(ctx, s.id),
      ),
      manageableStructureIds: ctx.admin
        ? (await this.em.find(LocalStructure, {})).map((s) => s.id)
        : ctx.structureIds,
      notices,
      homeStructureId: ctx.homeStructureId,
      delegableRoles: ctx.admin
        ? ['helper', 'leader', 'chief', 'structure_admin', 'council']
        : ctx.structureIds.length
          ? ['chief']
          : ctx.assignments.some((a) => a.role === 'chief')
            ? ['helper', 'leader']
            : [],
      admin: ctx.admin,
      canFinance: user.roles.some((r) =>
        [UserRole.Admin, UserRole.SuperAdmin, UserRole.FinanceManager].includes(
          r,
        ),
      ),
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
      members: visible.map((m) => ({
        responsibilities: allAssignments
          .filter(
            (a) =>
              a.memberId === m.id &&
              a.role !== 'beneficiary' &&
              (ctx.admin ||
                (a.role === 'chief'
                  ? units.some(
                      (u) =>
                        u.id === a.unitId &&
                        ctx.structureIds.includes(u.structureId),
                    )
                  : ['leader', 'helper'].includes(a.role) &&
                    ctx.assignments.some(
                      (actor) =>
                        actor.role === 'chief' && actor.unitId === a.unitId,
                    ))),
          )
          .map((a) => ({
            id: a.id,
            role: a.role,
            unitId: a.unitId,
            groupId: a.groupId,
          })),
        responsibilityUnitIds: [
          ...new Set(
            allAssignments
              .filter(
                (a) =>
                  a.memberId === m.id &&
                  a.role !== 'beneficiary' &&
                  a.unitId &&
                  units.some(
                    (u) =>
                      u.id === a.unitId && u.structureId === structureOf(m),
                  ),
              )
              .map((a) => a.unitId!),
          ),
        ],
        responsibilityGroupIds: [
          ...new Set(
            allAssignments
              .filter(
                (a) =>
                  a.memberId === m.id &&
                  a.role !== 'beneficiary' &&
                  a.groupId &&
                  units.some(
                    (u) =>
                      u.id === a.groupId && u.structureId === structureOf(m),
                  ),
              )
              .map((a) => a.groupId!),
          ),
        ],
        id: m.id,
        name: m.name,
        structureId: structureOf(m),
        orgoId: grants.get(m.id)?.detail ? m.orgoId : null,
        grade: grants.get(m.id)?.detail && hasSchoolGrade(m) ? m.grade : null,
        unitId: m.unitId,
        groupId: m.groupId,
        syncState: pendingSync.find((s) => s.memberId === m.id)?.state,
        syncMessage: pendingSync.find((s) => s.memberId === m.id)?.message,
        status: m.status,
        adultKind: m.adultKind,
        roles: [
          ...new Set(
            allAssignments
              .filter((a) => a.memberId === m.id)
              .map((a) => a.role),
          ),
        ],
        orgoType: grants.get(m.id)?.detail
          ? typeof (m.orgoProfile?.type as { name?: unknown } | undefined)
              ?.name === 'string'
            ? (m.orgoProfile.type as { name: string }).name
            : null
          : null,
        revision: m.revision,
        access: grants.get(m.id),
        branch: m.branch,
        category: m.category,
        categoryReview: m.categoryReview,
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
    if (!access.detail) denied();
    const profile = { ...m.profile };
    if (!access.sensitive) {
      profile.medical = '';
      profile.allergies = '';
      profile.medication = '';
      profile.dietary = '';
      profile.needs = '';
    }
    const notes = access.notes
      ? await this.em.find(
          ScoutNote,
          { memberId: id },
          { orderBy: { createdAt: 'desc' } },
        )
      : [];
    const assignments =
      access.identity || access.own
        ? await this.em.find(
            ScoutAssignment,
            { memberId: id },
            { orderBy: { startedAt: 'desc' } },
          )
        : [];
    const fees = access.fees ? await this.fees(m) : [];
    const sync = access.identity
      ? await this.em.find(
          MemberSync,
          { memberId: id },
          { orderBy: { createdAt: 'desc' }, limit: 20 },
        )
      : [];
    return {
      member: {
        id: m.id,
        orgoId: m.orgoId,
        name: m.name,
        structureId: structureOf(m),
        birthDate: m.birthDate,
        grade: hasSchoolGrade(m) ? m.grade : null,
        unitId: m.unitId,
        groupId: m.groupId,
        status: m.status,
        adultKind: m.adultKind,
        promiseDate: m.promiseDate,
        promiseSource: m.promiseSource,
        branch: m.branch,
        category: m.category,
        categoryReview: m.categoryReview,
        orgoProfile: (access.sensitive
          ? {
              ...m.orgoProfile,
              customDefinitions: (Array.isArray(
                m.orgoProfile?.customDefinitions,
              )
                ? m.orgoProfile.customDefinitions
                : []
              ).filter((d) => {
                const field = d as {
                  isOnlyAdmin?: boolean;
                  visibility?: string;
                };
                return (
                  access.identity ||
                  (!field.isOnlyAdmin && field.visibility !== 'admin')
                );
              }),
              customFieldValues: (Array.isArray(
                m.orgoProfile?.customFieldValues,
              )
                ? m.orgoProfile.customFieldValues
                : []
              ).filter((v) => {
                const field = v as { field: unknown };
                const definition = (
                  Array.isArray(m.orgoProfile?.customDefinitions)
                    ? m.orgoProfile.customDefinitions
                    : []
                ).find(
                  (d) =>
                    Number((d as { id: unknown }).id) === Number(field.field),
                ) as { isOnlyAdmin?: boolean; visibility?: string } | undefined;
                return (
                  access.identity ||
                  (!!definition &&
                    !definition.isOnlyAdmin &&
                    definition.visibility !== 'admin')
                );
              }),
            }
          : { logo: m.orgoProfile?.logo, type: m.orgoProfile?.type }) as Record<
          string,
          unknown
        >,
        orgoFields: profileFields,
        orgoReadonly: [...readonlyFields],
        conflicts: access.identity ? (m.orgoConflicts ?? {}) : {},
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
      const centerPaid = allocations
        .filter((a) => a.obligationId === o.id)
        .reduce((s, a) => s + a.amountBani, 0);
      const paid = centerPaid + (o.nationalDirectBani ?? 0);
      const period = periods.find((p) => p.id === o.periodId);
      const collectible =
        member.status === 'active' &&
        (!member.feeResumePeriod ||
          (period?.startsOn ?? '') >= member.feeResumePeriod);
      return {
        period: period?.name ?? '',
        current: period?.active ?? false,
        plan: o.plan,
        obligationId: o.id,
        startsOn: period?.startsOn,
        nationalBani: o.nationalBani,
        nationalDirectBani: o.nationalDirectBani ?? 0,
        localPaidBani: centerPaid,
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
      if (!parentId)
        throw new BadRequestException(
          'Unitatile sunt fixe. Alege unitatea pentru subunitate.',
        );
      if (!(await this.chief(tx, user, parentId))) denied();
      const parent = await this.unit(tx, parentId, null);
      const structureId = structureOf(parent!);
      const branch = parent!.branch;
      const name = stringValue(b.name);
      if (!name) throw new BadRequestException('Numele este obligatoriu.');
      if (b.id) {
        const existing = await tx.findOneOrFail(ScoutSubunit, {
          id: stringValue(b.id),
          parentId,
          archived: false,
        });
        existing.name = name;
        return { id: existing.id, result: existing };
      }
      const unit = tx.create(ScoutSubunit, {
        name,
        branch,
        parentId,
        structureId,
        structureConfirmed: true,
      });
      return { id: unit.id, result: unit };
    });
  }
  async archiveUnit(user: CurrentUser, id: string) {
    return this.mutate(user, 'archive', async (tx) => {
      const u = await tx.findOne(ScoutSubunit, { id });
      if (!u) throw new BadRequestException('Unitatile fixe nu se arhiveaza.');
      if (!(await this.chief(tx, user, u.parentId))) denied();
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
        (await tx.count(ScoutSubunit, { parentId: id, archived: false }))
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
      if (!this.inStructure(ctx, structureId)) denied();
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
      const adult = !!destination && !isYouth(destination.branch);
      if (!destination)
        throw new BadRequestException('Alege categoria principala.');
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
        unitId,
        groupId,
        category: destination.branch,
        categoryReview: false,
        profile: emptyProfile(),
        adultKind: adult ? 'volunteer' : null,
        branch: adult ? null : (destination?.branch ?? null),
        lastProgressionYear: targetYear(new Date()),
      });
      // Scalar foreign keys do not give the ORM an insert dependency graph.
      // Persist the identity before its assignments and outbox, in this same transaction.
      await tx.flush();
      if (unitId && !adult)
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
    return this.mutate(user, 'update', (tx) =>
      this.applyUpdateMember(tx, user, id, b),
    );
  }
  private async applyUpdateMember(
    tx: EntityManager,
    user: CurrentUser,
    id: string,
    b: Record<string, unknown>,
  ) {
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
      m.orgoProfile = { ...m.orgoProfile, fullName: name };
    }
    if ('birthDate' in b) {
      const date = b.birthDate ? dateValue(b.birthDate) : null;
      if (m.birthDate !== date) payload.birthDate = date;
      m.birthDate = date;
      m.orgoProfile = { ...m.orgoProfile, dateBirth: date };
    }
    if ('grade' in b) {
      const grade = b.grade == null || b.grade === '' ? null : Number(b.grade);
      if (grade !== null && !hasSchoolGrade(m))
        throw new BadRequestException(
          'Clasa se completează numai pentru beneficiarii școlari.',
        );
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
      const year = b.skipProgressionYear ? Number(b.skipProgressionYear) : null;
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
          ['medical', 'allergies', 'medication', 'dietary', 'needs'].includes(
            key,
          ) &&
          !access.sensitive
        )
          denied();
        m.profile = { ...m.profile, [key]: stringValue(value, 4000) };
      }
      const linked = customProfilePatch(prior, m.profile, m.orgoProfile ?? {});
      if (linked) {
        m.orgoProfile = { ...m.orgoProfile, customFieldValues: linked.values };
        payload.rawUserCustomFieldsValues = linked.patch;
      }
      // Only tenant fields with verified labels are linked; other clinical information stays local.
      if (prior.email !== m.profile.email || prior.phone !== m.profile.phone) {
        payload.contact = { email: m.profile.email, phone: m.profile.phone };
        m.orgoProfile = {
          ...m.orgoProfile,
          email: m.profile.email,
          phoneNumber: m.profile.phone,
        };
      }
    }
    const shared: Record<string, unknown> = {};
    if (payload.contact) {
      const contact = payload.contact as { email: string; phone: string };
      if (m.orgoBase?.email !== contact.email) shared.email = contact.email;
      if (m.orgoBase?.phoneNumber !== contact.phone)
        shared.phoneNumber = contact.phone;
    }
    if ('birthDate' in payload) shared.dateBirth = payload.birthDate;
    if (payload.rawUserCustomFieldsValues)
      shared.rawUserCustomFieldsValues = payload.rawUserCustomFieldsValues;
    this.queue(
      tx,
      m,
      user.id,
      Object.keys(shared).length ? 'orgo-profile' : 'local-profile',
      shared,
    );
    if ('name' in payload)
      tx.create(MemberSync, {
        memberId: m.id,
        revision: m.revision,
        actorId: user.id,
        kind: 'profile',
        payload: { name: payload.name },
        baseline: m.remote,
        state: 'unsupported',
        message:
          'Pentru sincronizarea numelui, folosește prenumele și numele din fișa Orgo.',
      });
    return { id, result: { ok: true } };
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
    return this.mutate(user, 'transfer', (tx) =>
      this.applyTransfer(tx, user, id, b),
    );
  }
  private async applyTransfer(
    tx: EntityManager,
    user: CurrentUser,
    id: string,
    b: Record<string, unknown>,
  ) {
    const m = await this.get(tx, id),
      a = await this.access(tx, user, m);
    const unitId = b.unitId ? stringValue(b.unitId) : null,
      groupId = b.groupId ? stringValue(b.groupId) : null;
    const destination = await this.unit(tx, unitId, groupId);
    const structureId = b.structureId
      ? stringValue(b.structureId)
      : structureOf(m);
    const ctx = await this.context(tx, user);
    if (structureId !== structureOf(m) && !ctx.admin) denied();
    if (!this.inStructure(ctx, structureId)) denied();
    if (
      destination &&
      !permissions(
        ctx.admin || ctx.structureIds.includes(structureId),
        false,
        ctx.assignments,
        { id: m.id, unitId, groupId },
      ).edit
    )
      denied();
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
    // Update the identity before flushing so structure/category constraints see the complete move.
    m.unitId = unitId;
    m.groupId = groupId;
    if (unitId) {
      const unit = await tx.findOneOrFail(ScoutUnit, {
        id: unitId,
        fixed: true,
      });
      m.category = unit.branch;
      m.categoryReview = false;
      m.branch = isYouth(unit.branch) ? unit.branch : null;
      m.adultKind = isYouth(unit.branch)
        ? null
        : unit.branch === 'scouteri'
          ? 'scouter'
          : 'volunteer';
    } else {
      m.category = null;
      m.categoryReview = true;
      m.branch = null;
    }
    // Close the old assignment before inserting under the partial unique index.
    await tx.flush();
    if (unitId && m.category && isYouth(m.category))
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
    return this.mutate(user, 'lifecycle', (tx) =>
      this.applyLifecycle(tx, user, id, b),
    );
  }
  private async applyLifecycle(
    tx: EntityManager,
    user: CurrentUser,
    id: string,
    b: Record<string, unknown>,
  ) {
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
      if (!this.inStructure(ctx, structureOf(m))) denied();
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
      if (!['withdrawn', 'review', 'inactive', 'suspended'].includes(m.status))
        throw new BadRequestException('Membrul este deja activ.');
      const wasWithdrawn = m.status !== 'active';
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
  }
  async assignment(user: CurrentUser, id: string, input: unknown) {
    const b = bodyObject(input);
    return this.mutate(user, 'responsibility', async (tx) => {
      const m = await this.get(tx, id);
      if (!(await this.access(tx, user, m)).read) denied();
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
      if (!this.inStructure(ctx, structureOf(m))) denied();
      if (role === 'council' && structureOf(m) !== 'cluj') denied();
      if (structureId && structureId !== structureOf(m)) denied();
      if (
        ['leader', 'helper'].includes(role) &&
        !groupId &&
        unitId &&
        (await tx.count(ScoutSubunit, { parentId: unitId, archived: false }))
      )
        throw new BadRequestException('Alege subunitatea responsabilitatii.');
      const parentMandate = ctx.admin
        ? (ctx.assignments.find((a) => a.role === 'council') ?? null)
        : ctx.assignments.find((a) =>
            role === 'chief'
              ? a.role === 'structure_admin' &&
                a.structureId === structureOf(unit ?? m)
              : ['leader', 'helper'].includes(role)
                ? a.role === 'chief' && a.unitId === unitId
                : false,
          );
      if (!ctx.admin && !parentMandate) denied();
      if (unit && structureOf(unit) !== structureOf(m))
        throw new BadRequestException('Unitatea aparține altei structuri.');
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
          (promise && promise > localDate(new Date())) ||
          !m.birthDate ||
          m.birthDate >
            `${Number(localDate(new Date()).slice(0, 4)) - 18}${localDate(new Date()).slice(4)}` ||
          m.category === 'seniori' ||
          ownUnit?.branch === 'seniori'
        )
          throw new BadRequestException(
            'Rolul cere un adult care nu este beneficiar la Seniori; data promisiunii, dacă este completată, nu poate fi în viitor.',
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
      a.parentAssignmentId = parentMandate?.id ?? null;
      const expiresAt = b.expiresAt ? new Date(dateValue(b.expiresAt)) : null;
      if (expiresAt && expiresAt <= new Date())
        throw new BadRequestException('Expirarea trebuie sa fie in viitor.');
      if (
        parentMandate?.expiresAt &&
        (!expiresAt || expiresAt > parentMandate.expiresAt)
      )
        throw new BadRequestException(
          'Mandatul depaseste durata mandatului tau.',
        );
      a.expiresAt = expiresAt;
      a.canEdit = b.canEdit === true;
      a.canSeeFees = b.canSeeFees === true;
      a.canSeeSensitive = b.canSeeSensitive === true;
      if (role === 'council' && m.accountId) {
        const account = await tx.findOneOrFail(User, { id: m.accountId });
        account.councilAdmin = true;
      }
      // Responsibilities never change the primary category.
      this.queue(tx, m, user.id, 'roles', { assignmentId: a.id });
      return { id, result: { ok: true } };
    });
  }
  async endAssignment(user: CurrentUser, id: string, assignmentId: string) {
    return this.mutate(user, 'end-responsibility', async (tx) => {
      const m = await this.get(tx, id);
      if (!(await this.access(tx, user, m)).read) denied();
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
        await this.em.find(ScoutUnit, { fixed: false, parentId: null })
      ).map((u) => ({
        id: u.id,
        name: u.name,
        structureId: structureOf(u),
        branch: u.branch,
        convert: false,
      })),
      members: (
        await this.em.find(
          ScoutMember,
          { $or: [{ structureConfirmed: false }, { categoryReview: true }] },
          { orderBy: { name: 'asc' } },
        )
      ).map((m) => ({
        id: m.id,
        name: m.name,
        revision: m.revision,
        unitId: m.unitId,
        category: m.category ?? importedCategory(m.orgoProfile),
        categoryReview: m.categoryReview,
        inactive: isImportedInactive(m),
        structureId: structureOf(m),
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
        b.members.length > 1500
      )
        throw new BadRequestException('Verifica si confirma repartizarea.');
      const seen = new Set<string>();
      for (const input of b.members) {
        const row = bodyObject(input),
          m = await this.get(tx, stringValue(row.id));
        if (
          (m.structureConfirmed && !m.categoryReview) ||
          m.revision !== Number(row.revision) ||
          seen.has(m.id)
        )
          throw new ConflictException('Reincarca previzualizarea.');
        seen.add(m.id);
        const structureId = stringValue(row.structureId);
        await tx.findOneOrFail(LocalStructure, { id: structureId });
        const category = row.category
          ? (stringValue(row.category) as Category)
          : null;
        const unit = category
          ? await tx.findOne(ScoutUnit, {
              fixed: true,
              structureId,
              branch: category,
            })
          : null;
        if (category && !unit)
          throw new BadRequestException('Categorie invalida.');
        const before = {
          structureId: structureOf(m),
          category: m.category,
          unitId: m.unitId,
          groupId: m.groupId,
        };
        m.structureId = structureId;
        m.structureConfirmed = true;
        const group = m.groupId
          ? await tx.findOne(ScoutSubunit, {
              id: m.groupId,
              parentId: unit?.id ?? '',
              archived: false,
            })
          : null;
        await this.place(tx, m, unit?.id ?? null, group?.id ?? null, user.id);
        m.categoryReview = !category;
        if (m.orgoId && before.structureId !== structureId) {
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
        tx.create(AuditEntry, {
          actorId: user.id,
          action: 'members.organization-confirm',
          entityType: 'Member',
          entityId: m.id,
          metadata: {
            before,
            after: {
              structureId,
              category,
              unitId: m.unitId,
              groupId: m.groupId,
            },
          },
        });
        this.queue(tx, m, user.id, 'local-profile', { structureId, category });
      }
      if (b.units !== undefined && !Array.isArray(b.units))
        throw new BadRequestException('Mapari invalide.');
      for (const input of (b.units ?? []) as unknown[]) {
        const row = bodyObject(input);
        if (row.convert !== true) continue;
        const legacy = await tx.findOneOrFail(ScoutUnit, {
          id: stringValue(row.id),
          fixed: false,
          parentId: null,
        });
        const parent = await this.unit(tx, stringValue(row.parentId), null);
        if (!parent || parent.branch !== legacy.branch)
          throw new BadRequestException(
            'Pastreaza categoria sursei importate.',
          );
        const existing = await tx.findOne(ScoutSubunit, { id: legacy.id });
        if (existing) {
          if (existing.parentId !== parent.id)
            throw new ConflictException(
              'Subunitatea a fost deja reconciliata.',
            );
          else continue;
        }
        tx.create(ScoutSubunit, {
          id: legacy.id,
          name: legacy.name,
          branch: parent.branch,
          parentId: parent.id,
          structureId: parent.structureId,
          structureConfirmed: true,
          orgoId: legacy.orgoId,
        });
        await tx.flush();
        if (legacy.orgoId) {
          const source = await tx.findOne(ScoutUnitSource, {
            id: legacy.orgoId,
          });
          if (source) {
            source.unitId = parent.id;
            source.groupId = legacy.id;
          }
        }
        const original = await tx.execute<{ source_id: string }[]>(
          "select source_id from member_organization_migration where source_table='scout_members' and original->>'unit_id'=?",
          [legacy.id],
        );
        for (const previous of original) {
          const member = await this.get(tx, previous.source_id);
          if (
            member.unitId !== parent.id ||
            member.groupId ||
            member.category !== parent.branch ||
            structureOf(member) !== parent.structureId
          )
            continue;
          member.groupId = legacy.id;
          for (const assignment of await tx.find(ScoutAssignment, {
            memberId: member.id,
            role: 'beneficiary',
            endedAt: null,
          }))
            assignment.groupId = legacy.id;
          this.queue(tx, member, user.id, 'local-profile', {
            groupId: legacy.id,
          });
        }
        tx.create(AuditEntry, {
          actorId: user.id,
          action: 'members.legacy-subunit-confirm',
          entityType: 'Subunit',
          entityId: legacy.id,
          metadata: {
            legacyUnitId: legacy.id,
            parentId: parent.id,
            structureId: parent.structureId,
          },
        });
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
        if (!isYouth(unit.branch)) return;
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
                fixed: true,
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
            const group = await tx.findOneOrFail(ScoutSubunit, {
              id: m.groupId,
            });
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
        m.branch = result.branch;
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
      for (const group of await tx.find(ScoutSubunit, {
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

class BulkPreview extends Error {
  constructor(
    readonly result: {
      version: string;
      members: unknown[];
      changes: Record<string, unknown>;
      applied: boolean;
    },
  ) {
    super('preview');
  }
}

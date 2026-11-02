import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  type OnModuleInit,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import {
  MemberApplication,
  MemberGuardian,
} from './entities/member-application.entity';
import {
  MemberSync,
  ScoutMember,
  ScoutUnit,
  ScoutAssignment,
} from './entities/member.entity';
import { MembersService, bodyObject, stringValue } from './members.service';
import { MemberOrgoService } from './orgo.service';
import { admissionData } from './admission.rules';
import { emptyProfile, targetYear } from './member.types';
import { User } from '../users/entities/user.entity';
import type { CurrentUser } from '../users/users.types';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import { OrgoRequestError, retryDelay } from './orgo-sync';
import { object, cleanProfile } from './orgo-profile';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AdmissionsService implements OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly members: MembersService,
    private readonly orgo: MemberOrgoService,
    private readonly config: ConfigService,
  ) {}
  onModuleInit() {
    this.orgo.registerDelivery('admission-create', (id) => this.deliver(id));
  }
  async options() {
    const rows = await this.em
      .fork()
      .find(ScoutUnit, { archived: false, fixed: true, parentId: null });
    return {
      units: rows
        .filter((u) => !['lideri', 'scouteri'].includes(u.branch))
        .map((u) => ({ id: u.id, name: u.name, structureId: u.structureId })),
      consentVersion: '2026-11-02',
    };
  }
  async submit(input: unknown, actor?: CurrentUser) {
    const b = bodyObject(input),
      data = admissionData(b);
    const key = stringValue(b.requestKey, 36);
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(key))
      throw new BadRequestException('Cheia cererii este invalidă.');
    if (actor && !(await this.members.admissionScope(actor)).admin)
      throw new ForbiddenException();
    const unitId = b.unitId ? stringValue(b.unitId) : null;
    return this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(2112026)');
      const previous = await tx.findOne(MemberApplication, { requestKey: key });
      // Public responses deliberately never reveal an existing record's personal data.
      if (previous) return { received: true };
      if (
        unitId &&
        !(await tx.findOne(ScoutUnit, {
          id: unitId,
          archived: false,
          fixed: true,
          parentId: null,
        }))
      )
        throw new BadRequestException(
          'Unitatea solicitată nu este disponibilă.',
        );
      tx.create(MemberApplication, {
        requestKey: key,
        data,
        unitId,
        createdBy: actor?.id ?? null,
      });
      return { received: true };
    });
  }
  async list(user: CurrentUser): Promise<Record<string, unknown>> {
    const scope = await this.members.admissionScope(user);
    const rows =
      scope.admin || scope.unitIds.length
        ? await this.em
            .fork()
            .find(
              MemberApplication,
              scope.admin ? {} : { unitId: { $in: scope.unitIds } },
              { orderBy: { createdAt: 'desc' }, limit: 500 },
            )
        : [];
    const units = (await this.options()).units;
    return {
      admin: scope.admin,
      units,
      applications: await Promise.all(
        rows.map(async (r) => ({
          ...r,
          sync: r.memberId
            ? await this.em
                .fork()
                .findOne(
                  MemberSync,
                  { memberId: r.memberId, kind: 'admission-create' },
                  { orderBy: { createdAt: 'desc' } },
                )
            : null,
        })),
      ),
    };
  }
  private async canReview(
    tx: EntityManager,
    user: CurrentUser,
    row: MemberApplication,
  ) {
    const scope = await this.members.admissionScope(user, tx);
    if (!scope.admin && (!row.unitId || !scope.unitIds.includes(row.unitId)))
      throw new ForbiddenException();
    return scope;
  }
  async review(user: CurrentUser, id: string, input: unknown) {
    const b = bodyObject(input);
    return this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const row = await tx.findOneOrFail(
        MemberApplication,
        { id },
        { refresh: true },
      );
      const scope = await this.canReview(tx, user, row);
      if (Number(b.revision) !== row.revision)
        throw new ConflictException('Cererea s-a schimbat. Reîncarcă lista.');
      const action = String(b.action);
      if (action === 'edit') {
        if (!scope.admin || row.attemptedAt || row.existingOrgoId)
          throw new ForbiddenException(
            'Corectează identitatea confirmată din fișa membrului.',
          );
        const job = row.memberId
          ? await tx.findOne(MemberSync, {
              memberId: row.memberId,
              kind: 'admission-create',
            })
          : null;
        if (job?.state === 'running')
          throw new ConflictException('Provisionarea este în curs.');
        const unitId = b.unitId ? stringValue(b.unitId) : null;
        if (
          unitId &&
          !(await tx.findOne(ScoutUnit, {
            id: unitId,
            archived: false,
            fixed: true,
            parentId: null,
          }))
        )
          throw new BadRequestException('Unitate invalidă.');
        row.data = admissionData(b.data);
        row.unitId = unitId;
        row.state = 'pending';
        row.approvedBy = null;
        row.revision++;
        if (job) {
          job.state = 'superseded';
          job.message = 'Cererea a fost corectată și necesită o nouă aprobare.';
        }
        tx.create(AuditEntry, {
          actorId: user.id,
          action: 'members.application.edited',
          entityType: 'MemberApplication',
          entityId: id,
          metadata: { unitId, approvalInvalidated: true },
        });
        return { ok: true };
      }
      if (row.state === 'approved') {
        if (action !== 'retry' || !row.memberId)
          throw new ConflictException('Cererea a fost deja aprobată.');
        const job = await tx.findOneOrFail(
          MemberSync,
          {
            memberId: row.memberId,
            kind: 'admission-create',
            state: { $ne: 'superseded' },
          },
          { orderBy: { createdAt: 'desc' } },
        );
        if (['synced', 'running'].includes(job.state))
          throw new ConflictException(
            'Operațiunea este confirmată sau în curs.',
          );
        if (b.existingOrgoId) {
          const orgoId = Number(b.existingOrgoId);
          if (!scope.admin || !Number.isSafeInteger(orgoId) || orgoId <= 0)
            throw new BadRequestException(
              'Numai adminul poate asocia un ID Orgo verificat.',
            );
          row.existingOrgoId = orgoId;
          const canonical = await tx.findOne(ScoutMember, { orgoId });
          if (canonical && canonical.id !== row.memberId) {
            const previousMemberId = row.memberId;
            row.memberId = canonical.id;
            job.memberId = canonical.id;
            await tx.nativeUpdate(
              MemberGuardian,
              { sourceApplicationId: row.id },
              { memberId: canonical.id },
            );
            tx.create(AuditEntry, {
              actorId: user.id,
              action: 'members.application.canonical-link',
              entityType: 'MemberApplication',
              entityId: id,
              metadata: { previousMemberId, memberId: canonical.id, orgoId },
            });
          }
        }
        row.approvedBy = user.id;
        row.revision++;
        row.reviewedAt = new Date();
        job.actorId = user.id;
        job.state = 'pending';
        job.nextAttemptAt = null;
        tx.create(AuditEntry, {
          actorId: user.id,
          action: 'members.application.retry',
          entityType: 'MemberApplication',
          entityId: id,
          metadata: { existingOrgoId: row.existingOrgoId },
        });
        return { ok: true };
      }
      if (!['approve', 'reject', 'needs-information'].includes(action))
        throw new BadRequestException('Acțiune invalidă.');
      if (action !== 'approve' && !scope.admin) throw new ForbiddenException();
      if (b.data) {
        if (!scope.admin) throw new ForbiddenException();
        row.data = admissionData(b.data);
      }
      if (b.existingOrgoId) {
        if (
          !scope.admin ||
          !Number.isSafeInteger(Number(b.existingOrgoId)) ||
          Number(b.existingOrgoId) <= 0
        )
          throw new BadRequestException(
            'Asocierea unei identități existente necesită un admin și un ID valid.',
          );
        row.existingOrgoId = Number(b.existingOrgoId);
      }
      if (action !== 'approve') {
        row.reason = stringValue(b.reason, 2000);
        if (!row.reason) throw new BadRequestException('Completează motivul.');
        row.state = action === 'reject' ? 'rejected' : 'needs-information';
      } else {
        row.state = 'approved';
        row.approvedBy = user.id;
        const data = row.data;
        const unit = row.unitId
          ? await tx.findOneOrFail(ScoutUnit, {
              id: row.unitId,
              archived: false,
            })
          : null;
        const memberData = {
          name: `${data.firstName} ${data.lastName}`,
          birthDate: data.birthDate,
          profile: {
            ...emptyProfile(),
            email: data.email,
            phone: data.phone,
            parentName: data.guardianName,
            parentPhone: data.guardianPhone,
            parentEmail: data.guardianEmail,
          },
          grade: data.grade,
          structureId: unit?.structureId ?? 'cluj',
          structureConfirmed: true,
          unitId: unit?.id ?? null,
          category: unit?.branch ?? null,
          categoryReview: !unit,
          status: 'review',
          orgoProfile: {
            firstName: data.firstName,
            lastName: data.lastName,
            dateBirth: data.birthDate,
          },
          lastProgressionYear: targetYear(new Date()),
        };
        const canonical = row.existingOrgoId
          ? await tx.findOne(ScoutMember, { orgoId: row.existingOrgoId })
          : null;
        const member =
          canonical ??
          (row.memberId
            ? await tx.findOneOrFail(ScoutMember, { id: row.memberId })
            : tx.create(ScoutMember, memberData));
        if (!canonical) Object.assign(member, memberData);
        await tx.flush();
        row.memberId = member.id;
        if (
          data.guardianName &&
          !(await tx.findOne(MemberGuardian, { sourceApplicationId: row.id }))
        )
          tx.create(MemberGuardian, {
            memberId: member.id,
            name: data.guardianName,
            email: data.guardianEmail,
            phone: data.guardianPhone,
            relation: data.guardianRelation,
            sourceApplicationId: row.id,
          });
        tx.create(MemberSync, {
          memberId: member.id,
          revision: member.revision,
          actorId: user.id,
          kind: 'admission-create',
          payload: { applicationId: row.id, unitId: row.unitId },
          baseline: {},
          message: 'Înscriere aprobată. Se pregătește contul Orgo.',
        });
      }
      row.revision++;
      row.reviewedAt = new Date();
      tx.create(AuditEntry, {
        actorId: user.id,
        action: 'members.application.' + action,
        entityType: 'MemberApplication',
        entityId: id,
        metadata: { unitId: row.unitId },
      });
      return { ok: true };
    });
  }

  async deliver(id: string) {
    const claim = await this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const job = await tx.findOneOrFail(MemberSync, { id }, { refresh: true });
      if (
        job.state === 'running' &&
        job.claimedAt &&
        Date.now() - job.claimedAt.getTime() < 120000
      )
        return null;
      if (!['pending', 'running', 'permission-required'].includes(job.state))
        return null;
      const concurrent = await tx.execute<{ id: string }[]>(
        "select id from member_sync_operations where member_id = ? and id <> ? and state = 'running' and claimed_at > ? limit 1",
        [job.memberId, id, new Date(Date.now() - 120000)],
      );
      if (concurrent?.length) return null;
      job.claimToken = randomUUID();
      job.state = 'running';
      job.claimedAt = new Date();
      job.attempts++;
      return { ...job };
    });
    if (!claim) return;
    const heartbeat = setInterval(() => {
      void this.em
        .fork()
        .nativeUpdate(
          MemberSync,
          { id, claimToken: claim.claimToken, state: 'running' },
          { claimedAt: new Date() },
        )
        .catch(() => undefined);
    }, 30000);
    heartbeat.unref();
    let state = 'permission-required',
      message = 'Înscrierea necesită verificare.',
      nextAttemptAt: Date | null = null;
    try {
      const tx = this.em.fork();
      const row = await tx.findOneOrFail(MemberApplication, {
        id: String(claim.payload.applicationId),
      });
      if (
        row.state !== 'approved' ||
        !row.approvedBy ||
        row.unitId !== claim.payload.unitId
      )
        throw new ForbiddenException();
      const account = await tx.findOneOrFail(User, { id: row.approvedBy });
      await this.canReview(
        tx,
        {
          id: account.id,
          displayName: account.displayName,
          roles: account.roles,
        },
        row,
      );
      const member = await tx.findOneOrFail(ScoutMember, {
        id: claim.memberId,
      });
      let orgoId = member.orgoId ?? row.existingOrgoId;
      if (!orgoId) {
        if (this.config.get<string>('ORGO_MEMBER_CREATION_ENABLED') !== 'true')
          throw new BadRequestException(
            'Crearea conturilor Orgo nu este activată.',
          );
        if (row.attemptedAt) {
          state = 'uncertain';
          message =
            'O creare anterioară poate fi reușită. Verifică Orgo și asociază ID-ul; nu se retrimite automat.';
        } else {
          await tx.nativeUpdate(
            MemberApplication,
            { id: row.id },
            { attemptedAt: new Date() },
          );
          const data = row.data;
          const localUnit = row.unitId
            ? await tx.findOneOrFail(ScoutUnit, { id: row.unitId })
            : null;
          const typeIds: Record<string, number> = {
            lupisori: 38,
            temerari: 39,
            exploratori: 40,
            seniori: 41,
            voluntari: 43,
          };
          const userType = localUnit ? typeIds[localUnit.branch] : undefined;
          const created = await this.orgo.serverRequest(
            '/api/v1/member-register-by-admin',
            'POST',
            {
              firstName: data.firstName,
              lastName: data.lastName,
              dateBirth: data.birthDate,
              ...(data.email ? { email: data.email } : {}),
              ...(data.phone ? { phoneNumber: data.phone } : {}),
              localCenter:
                '/api/v1/local_centers/' +
                this.config.get<string>('ORGO_LOCAL_CENTER_ID'),
              roles: ['ROLE_USER'],
              language: 'ro',
              ...(userType
                ? { userType, type: '/api/v1/roles/' + userType }
                : {}),
            },
          );
          orgoId = Number(created.id);
          if (!Number.isSafeInteger(orgoId) || orgoId <= 0)
            throw new Error('Unknown create result');
          // Persist correlation immediately; readback can then be retried without another POST.
          await tx.nativeUpdate(
            MemberApplication,
            { id: row.id },
            { existingOrgoId: orgoId },
          );
        }
      }
      if (orgoId) {
        let raw = await this.orgo.serverRequest('/api/v1/users/' + orgoId);
        if (
          Number(raw.id) !== orgoId ||
          Number(object(raw.localCenter).id) !==
            Number(this.config.get<string>('ORGO_LOCAL_CENTER_ID'))
        )
          throw new BadRequestException(
            'Identitatea Orgo nu aparține centrului configurat.',
          );
        if (
          (typeof raw.firstName === 'string' ? raw.firstName.trim() : '') !==
            row.data.firstName ||
          (typeof raw.lastName === 'string' ? raw.lastName.trim() : '') !==
            row.data.lastName ||
          (typeof raw.dateBirth === 'string'
            ? raw.dateBirth.slice(0, 10)
            : '') !== row.data.birthDate
        )
          throw new BadRequestException(
            'Datele identității Orgo diferă. Verifică asocierea.',
          );
        if (raw.status !== 'ACTIVE') {
          if (this.config.get<string>('ORGO_MEMBER_WRITES_ENABLED') !== 'true')
            throw new BadRequestException(
              'Contul Orgo există; activarea necesită dreptul de scriere a statusului.',
            );
          await this.canReview(
            tx,
            {
              id: account.id,
              displayName: account.displayName,
              roles: account.roles,
            },
            row,
          );
          await this.orgo.serverRequest('/api/v1/users/' + orgoId, 'PATCH', {
            status: 'ACTIVE',
          });
          raw = await this.orgo.serverRequest('/api/v1/users/' + orgoId);
          if (raw.status !== 'ACTIVE')
            throw new Error('Activation not confirmed');
        }
        await this.em.fork().transactional(async (em) => {
          await em.execute('select pg_advisory_xact_lock(19102026)');
          const current = await em.findOneOrFail(
            MemberApplication,
            { id: row.id },
            { refresh: true },
          );
          await this.canReview(
            em,
            {
              id: account.id,
              displayName: account.displayName,
              roles: account.roles,
            },
            current,
          );
          const other = await em.findOne(ScoutMember, { orgoId });
          if (other && other.id !== member.id)
            throw new ConflictException(
              'ID-ul Orgo are deja o fișă locală. Verifică asocierea.',
            );
          const m = await em.findOneOrFail(ScoutMember, { id: member.id });
          m.orgoId = orgoId;
          if (row.data.guardianName)
            m.profile = {
              ...m.profile,
              parentName: row.data.guardianName,
              parentPhone: row.data.guardianPhone,
              parentEmail: row.data.guardianEmail,
            };
          m.orgoProfile = cleanProfile(raw);
          m.orgoBase = cleanProfile(raw);
          m.remote = {
            ...m.remote,
            status: raw.status,
            localCenterId: object(raw.localCenter).id,
          };
          m.status = raw.status === 'ACTIVE' ? 'active' : 'review';
          current.existingOrgoId = orgoId;
          if (
            m.unitId &&
            ['lupisori', 'temerari', 'exploratori', 'seniori'].includes(
              m.category ?? '',
            ) &&
            !(await em.findOne(ScoutAssignment, {
              memberId: m.id,
              role: 'beneficiary',
              endedAt: null,
            }))
          )
            em.create(ScoutAssignment, {
              memberId: m.id,
              unitId: m.unitId,
              role: 'beneficiary',
              actorId: account.id,
            });
          this.members.queue(em, m, account.id, 'grade', { grade: m.grade });
          this.members.queue(em, m, account.id, 'assignment', {
            unitId: m.unitId,
            admission: true,
          });
          em.create(AuditEntry, {
            actorId: account.id,
            action: 'members.application.provisioned',
            entityType: 'MemberApplication',
            entityId: row.id,
            metadata: { orgoId },
          });
        });
        state = 'synced';
        message =
          raw.status === 'ACTIVE'
            ? 'Contul Orgo a fost confirmat.'
            : 'Cont Orgo confirmat; activarea contului necesită verificare.';
      }
    } catch (error) {
      if (error instanceof OrgoRequestError && error.temporary) {
        state = 'pending';
        nextAttemptAt = new Date(
          Date.now() + retryDelay(claim.attempts, error.retryAfterMs),
        );
        message = 'Orgo este temporar indisponibil. Se va verifica din nou.';
      } else if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      )
        message = error.message;
      else if (error instanceof ForbiddenException)
        message =
          'Aprobatorul nu mai poate confirma înscrierea. Este necesară o nouă validare.';
      else if (error instanceof OrgoRequestError)
        message =
          'Orgo a respins crearea sau asocierea. Verifică drepturile și datele.';
      else {
        state = 'uncertain';
        message =
          'Rezultatul Orgo este incert. Verifică identitatea înainte de reluare.';
      }
    }
    clearInterval(heartbeat);
    await this.em.fork().transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(19102026)');
      const job = await tx.findOneOrFail(MemberSync, { id }, { refresh: true });
      if (job.claimToken !== claim.claimToken) return;
      job.state = state;
      job.message = message;
      job.nextAttemptAt =
        nextAttemptAt ??
        (state === 'permission-required'
          ? new Date(Date.now() + 900000)
          : null);
      if (state === 'synced') job.completedAt = new Date();
    });
  }
}

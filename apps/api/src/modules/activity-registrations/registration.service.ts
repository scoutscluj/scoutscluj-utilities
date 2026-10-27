import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  participationFields,
  type BranchCode,
  type FormField,
} from '@scouts-cluj/parental-consent-schema';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityStatus } from '../activities/entities/activity-status.enum';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import { AdultDocument } from '../adult-documents/entities/adult-document.entity';
import {
  adultOn,
  decodeDocument,
  scoutingYear,
} from '../adult-documents/adult-documents.rules';
import {
  ScoutMember,
  ScoutUnit,
  ScoutSubunit,
  LocalStructure,
} from '../members/entities/member.entity';
import { MembersService } from '../members/members.service';
import { localDate } from '../members/member.types';
import {
  MembershipObligation,
  MembershipPaymentSettings,
} from '../membership/entities/membership.entity';
import {
  DEFAULT_PROCESSING_FEES,
  identifier,
  record,
  text,
  uuid,
} from '../membership/membership.rules';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';
import { User } from '../users/entities/user.entity';
import { ParentalConsentPublication } from '../parental-consent/entities/parental-consent-publication.entity';
import { ParentalConsentPublicationStatus } from '../parental-consent/entities/parental-consent.enums';
import { ParentalConsentService } from '../parental-consent/parental-consent.service';
import {
  ActivityRegistration as Registration,
  ActivityRegistrationSettings as Settings,
  ActivityRegistrationEntry as Entry,
  ActivityRegistrationDocument as Document,
  ActivityRegistrationCheckout as Checkout,
  ActivityRegistrationMail as Mail,
} from './registration.entity';
import {
  amount,
  defaultSettings,
  hasCapacity,
  installmentBalance,
  parseSettings,
  priceAdvice,
  validateAnswers,
  type Answer,
  type RegistrationSettings,
} from './registration.rules';

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class RegistrationService {
  constructor(
    private readonly em: EntityManager,
    private readonly members: MembersService,
    private readonly consent: ParentalConsentService,
    private readonly config: ConfigService,
  ) {}

  async mutate<T>(activityId: number, work: (tx: EntityManager) => Promise<T>) {
    return this.em.transactional(async (tx) => {
      await tx.execute('select pg_advisory_xact_lock(27102026, ?)', [
        activityId,
      ]);
      return work(tx);
    });
  }
  audit(
    tx: EntityManager,
    activityId: number,
    actorId: number | undefined,
    action: string,
    id: string,
    metadata: Record<string, unknown> = {},
  ) {
    tx.persist(
      tx.create(AuditEntry, {
        actorId,
        activityId,
        action: `registration.${action}`,
        entityType: 'activity_registration',
        entityId: id,
        metadata,
      }),
    );
  }
  async settings(activityId: number, tx = this.em) {
    const activity = await tx.findOne(Activity, { id: activityId });
    if (!activity) throw new NotFoundException('Activitatea nu există.');
    const settings = await tx.findOne(Settings, { activityId });
    return { activity, settings, data: settings?.data ?? defaultSettings() };
  }
  private manager(user: CurrentUser, activity: Activity) {
    return (
      activity.coordinatorId === user.id ||
      user.roles.some((r) => [UserRole.Admin, UserRole.SuperAdmin].includes(r))
    );
  }
  private financial(user: CurrentUser, activity: Activity) {
    return (
      this.manager(user, activity) ||
      user.roles.includes(UserRole.FinanceManager)
    );
  }
  async requireManager(user: CurrentUser, activityId: number, tx = this.em) {
    const context = await this.settings(activityId, tx);
    if (!this.manager(user, context.activity))
      throw new ForbiddenException(
        'Nu poți administra înscrierile acestei activități.',
      );
    return context;
  }
  async access(activityId: number, user: CurrentUser) {
    const { activity, data } = await this.settings(activityId);
    const manage = this.manager(user, activity);
    return {
      manage,
      finance: this.financial(user, activity),
      sensitive:
        manage ||
        data.medicalUserIds.includes(user.id) ||
        data.administrativeUserIds.includes(user.id),
      consent: manage || data.administrativeUserIds.includes(user.id),
    };
  }
  async saveSettings(user: CurrentUser, activityId: number, input: unknown) {
    const b = record(input),
      data = parseSettings(b.data);
    return this.mutate(activityId, async (tx) => {
      const context = await this.requireManager(user, activityId, tx);
      if ((context.settings?.revision ?? 0) !== b.revision)
        throw new ConflictException(
          'Setările au fost modificate. Reîncarcă pagina.',
        );
      if (
        data.published &&
        (!context.activity.startDate || context.activity.status === 'cancelled')
      )
        throw new BadRequestException(
          'Completează data de început și verifică starea activității.',
        );
      const users = [
        ...new Set([...data.medicalUserIds, ...data.administrativeUserIds]),
      ];
      if (
        users.length &&
        (await tx.count(User, { id: { $in: users } })) !== users.length
      )
        throw new BadRequestException(
          'Un responsabil selectat nu are cont în Resurse.',
        );
      const units = data.unitIds.length
        ? await tx.find(ScoutUnit, {
            id: { $in: data.unitIds },
            archived: false,
          })
        : [];
      const groups = data.groupIds.length
        ? await tx.find(ScoutSubunit, {
            id: { $in: data.groupIds },
            archived: false,
          })
        : [];
      if (
        units.length !== data.unitIds.length ||
        groups.length !== data.groupIds.length ||
        units.some(
          (u) =>
            data.structureIds.length &&
            !data.structureIds.includes(u.structureId),
        ) ||
        groups.some(
          (g) =>
            (data.unitIds.length && !data.unitIds.includes(g.parentId)) ||
            (data.structureIds.length &&
              !data.structureIds.includes(g.structureId)),
        )
      )
        throw new BadRequestException(
          'Verifică structurile, unitățile și subunitățile eligibile.',
        );
      if (
        data.structureIds.length &&
        (await tx.count(LocalStructure, { id: { $in: data.structureIds } })) !==
          data.structureIds.length
      )
        throw new BadRequestException('Structură necunoscută.');
      const row =
        context.settings ??
        tx.create(Settings, { activityId, data, revision: 0 });
      row.data = data;
      row.revision++;
      row.updatedAt = new Date();
      tx.persist(row);
      this.audit(
        tx,
        activityId,
        user.id,
        'settings_saved',
        String(activityId),
        { revision: row.revision },
      );
      return { revision: row.revision, data };
    });
  }
  async catalog() {
    const settings = await this.em.find(Settings, {});
    const ids = settings
      .filter((x) => x.data.published)
      .map((x) => x.activityId);
    const activities = ids.length
      ? await this.em.find(
          Activity,
          { id: { $in: ids }, status: { $ne: ActivityStatus.Cancelled } },
          { orderBy: { startDate: 'asc' } },
        )
      : [];
    return activities.map((a) => ({
      id: a.id,
      title: a.title,
      location: a.location,
      startDate: a.startDate,
      endDate: a.endDate,
      description: a.description,
    }));
  }
  async publicPage(activityId: number, user?: CurrentUser) {
    const { activity, data } = await this.settings(activityId);
    if (!data.published || activity.status === 'cancelled')
      throw new NotFoundException('Activitatea nu este publicată.');
    const publication = await this.em.findOne(ParentalConsentPublication, {
      activityId,
      status: ParentalConsentPublicationStatus.Active,
    });
    const rows = await this.em.find(Registration, { activityId });
    const publicSettings = Object.fromEntries(
      Object.entries(data).filter(
        ([key]) => !['medicalUserIds', 'administrativeUserIds'].includes(key),
      ),
    );
    return {
      canManage: !!user && this.manager(user, activity),
      activity: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        location: activity.location,
        startDate: activity.startDate,
        endDate: activity.endDate,
      },
      settings: publicSettings,
      fields: participationFields.filter((f) => f.type !== 'signature'),
      information: publication?.draftSnapshot ?? null,
      counts: {
        beneficiaries: rows.filter(
          (x) =>
            x.role === 'beneficiary' &&
            ['accepted', 'reserved'].includes(x.state),
        ).length,
        staff: rows.filter(
          (x) =>
            x.role === 'staff' && ['accepted', 'reserved'].includes(x.state),
        ).length,
      },
    };
  }
  async member(input: unknown, tx = this.em, user?: CurrentUser) {
    const key = identifier(
      input || String(user?.orgoConnection?.orgoUserId ?? ''),
    );
    let orgoId: number | undefined;
    if (key.kind === 'orgo_id') orgoId = Number(key.value);
    else {
      const obligations = await tx.find(MembershipObligation, {
        cardId: key.value,
      });
      const ids = [...new Set(obligations.map((o) => o.orgoUserId))];
      if (ids.length === 1) orgoId = ids[0];
    }
    const member = orgoId ? await tx.findOne(ScoutMember, { orgoId }) : null;
    if (!member || member.status !== 'active' || !member.orgoId)
      throw new BadRequestException(
        'ID-ul nu identifică un membru activ disponibil pentru înscriere.',
      );
    return member;
  }
  async prefill(user: CurrentUser, input: unknown) {
    const member = await this.member(record(input).identifier, this.em, user);
    const access = await this.members.access(this.em, user, member);
    const answers: Record<string, Answer> = { participant_name: member.name };
    if (access.detail)
      Object.assign(answers, {
        birth_date: member.birthDate ?? '',
        guardian_name: member.profile.parentName,
        guardian_phone: member.profile.parentPhone || member.profile.phone,
        emergency_name: member.profile.emergencyName,
        emergency_phone: member.profile.emergencyPhone,
      });
    if (access.sensitive)
      Object.assign(answers, {
        medical_notes: [member.profile.medical, member.profile.allergies]
          .filter(Boolean)
          .join('\n'),
        medication: member.profile.medication,
        dietary: member.profile.dietary,
        support_needs: member.profile.needs,
      });
    const previous = access.detail
      ? await this.em.findOne(
          Registration,
          { memberId: member.id, role: 'beneficiary' },
          { orderBy: { createdAt: 'desc' } },
        )
      : null;
    const reusable = [
      'guardian_name',
      'guardian_relation',
      'guardian_phone',
      'secondary_phone',
      'emergency_name',
      'emergency_phone',
    ];
    if (access.sensitive)
      reusable.push(
        'medical_notes',
        'medication',
        'medication_mode',
        'dietary',
        'support_needs',
      );
    for (const code of reusable)
      if (!answers[code] && previous?.answers[code] !== undefined)
        answers[code] = previous.answers[code];
    return {
      answers,
      email: access.detail
        ? member.profile.parentEmail || member.profile.email
        : '',
      branch: member.branch ?? member.category ?? '',
      canSeeMedical: access.sensitive,
      reusedPrevious: !!previous,
    };
  }
  private validateForm(
    input: unknown,
    minor: boolean,
    questions: RegistrationSettings['questions'],
    branch: string,
  ) {
    const b = record(input),
      result: Record<string, Answer> = {};
    const fields = participationFields.filter(
      (f) =>
        f.type !== 'signature' &&
        (minor ||
          ![
            'guardian_name',
            'guardian_relation',
            'guardian_phone',
            'secondary_phone',
            'acknowledgement',
          ].includes(f.code)),
    );
    for (const f of fields) {
      const v = b[f.code];
      if (v === undefined || v === '' || v === null) {
        if (f.required)
          throw new BadRequestException(`Completează: ${f.label}.`);
        continue;
      }
      if (f.type === 'acknowledgement') {
        if (v !== true)
          throw new BadRequestException(
            'Confirmă declarația reprezentantului legal.',
          );
        result[f.code] = true;
      } else if (f.type === 'multiple_choice') {
        if (
          !Array.isArray(v) ||
          v.length > 30 ||
          v.some(
            (x) =>
              typeof x !== 'string' || !f.options?.some((o) => o.value === x),
          )
        )
          throw new BadRequestException('Opțiuni invalide.');
        result[f.code] = [...new Set(v)] as string[];
      } else {
        const value = text(v, f.type === 'long_text' ? 6000 : 500);
        if (f.options && !f.options.some((o) => o.value === value))
          throw new BadRequestException('Opțiune invalidă.');
        if (
          f.type === 'date' &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
            !Number.isFinite(Date.parse(value)) ||
            new Date(value).toISOString().slice(0, 10) !== value)
        )
          throw new BadRequestException('Data nașterii este invalidă.');
        result[f.code] = value;
      }
    }
    const custom = Object.fromEntries(
      Object.entries(b)
        .filter(([key]) => key.startsWith('custom_'))
        .map(([key, value]) => [key.slice(7), value]),
    );
    return {
      ...result,
      ...Object.fromEntries(
        Object.entries(validateAnswers(questions, custom, branch)).map(
          ([k, v]) => [`custom_${k}`, v],
        ),
      ),
    };
  }
  private eligible(member: ScoutMember, settings: RegistrationSettings) {
    return (
      (!settings.structureIds.length ||
        settings.structureIds.includes(member.structureId)) &&
      (!settings.unitIds.length ||
        (!!member.unitId && settings.unitIds.includes(member.unitId))) &&
      (!settings.groupIds.length ||
        (!!member.groupId && settings.groupIds.includes(member.groupId)))
    );
  }
  private async certificate(
    tx: EntityManager,
    member: ScoutMember,
    activity: Activity,
  ) {
    if (!activity.startDate)
      throw new BadRequestException('Activitatea nu are data de început.');
    const latest = await tx.findOne(
      AdultDocument,
      {
        memberId: member.id,
        kind: 'behavioural_integrity',
        year: scoutingYear(activity.startDate),
      },
      { orderBy: { version: 'desc' } },
    );
    if (!latest || latest.status !== 'validated')
      throw new BadRequestException(
        'Certificatul de integritate comportamentală trebuie validat pentru anul cercetășesc în care începe activitatea.',
      );
    return latest;
  }
  async register(activityId: number, input: unknown, user?: CurrentUser) {
    const b = record(input);
    return this.mutate(activityId, async (tx) => {
      const { activity, data } = await this.settings(activityId, tx);
      const override =
        b.exception === true && !!user && this.manager(user, activity);
      const now = Date.now();
      if (
        !data.published ||
        activity.status === 'cancelled' ||
        activity.status === 'completed' ||
        (!override &&
          ((data.opensAt && now < Date.parse(data.opensAt)) ||
            (data.closesAt && now > Date.parse(data.closesAt))))
      )
        throw new BadRequestException('Înscrierile nu sunt deschise.');
      const member = await this.member(b.identifier, tx, user);
      if (!override && !this.eligible(member, data))
        throw new BadRequestException(
          'Membrul nu face parte din grupurile eligibile.',
        );
      if (await tx.findOne(Registration, { activityId, memberId: member.id }))
        throw new ConflictException(
          'Există deja o înscriere. Folosește contul sau linkul personal pentru gestionare.',
        );
      const role = b.role === 'staff' ? 'staff' : 'beneficiary';
      const reportedBirthDate =
        role === 'staff'
          ? member.birthDate
          : member.birthDate || record(b.answers).birth_date;
      const minor =
        adultOn(
          typeof reportedBirthDate === 'string' ? reportedBirthDate : null,
          activity.startDate ?? new Date(),
        ) !== true;
      if (role === 'staff') {
        if (minor)
          throw new BadRequestException(
            'Participarea în echipa adultă necesită majorat la începutul activității.',
          );
        await this.certificate(tx, member, activity);
      }
      const branch = member.branch ?? member.category ?? '';
      const answers =
        role === 'staff'
          ? {}
          : this.validateForm(b.answers, minor, data.questions, branch);
      if (
        role !== 'staff' &&
        member.birthDate &&
        String(answers.birth_date) !== member.birthDate
      )
        throw new BadRequestException(
          'Data nașterii nu corespunde membrului. Contactează liderul pentru corectare.',
        );
      const email =
        role === 'staff' ? member.profile.email || '' : text(b.email, 255);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new BadRequestException('Adresa de e-mail este invalidă.');
      const publication =
        minor && role !== 'staff'
          ? await tx.findOne(ParentalConsentPublication, {
              activityId,
              status: ParentalConsentPublicationStatus.Active,
            })
          : null;
      if (
        minor &&
        role !== 'staff' &&
        (!publication ||
          !publication.draftSnapshot.branches[branch as BranchCode]?.enabled)
      )
        throw new BadRequestException(
          'Acordul parental nu este încă publicat pentru această ramură.',
        );
      const rows = await tx.find(Registration, { activityId });
      const state =
        data.approvalRequired && role !== 'staff'
          ? 'pending'
          : hasCapacity(data, rows, role, branch)
            ? data.paymentConfirmsPlace && role !== 'staff'
              ? 'reserved'
              : 'accepted'
            : 'waitlisted';
      const totalBani =
        role === 'staff' ? 0 : (data.branchFees[branch] ?? data.feeBani);
      const token = randomBytes(32).toString('base64url');
      const obligations = await tx.find(
        MembershipObligation,
        { orgoUserId: member.orgoId! },
        { orderBy: { createdAt: 'desc' }, limit: 1 },
      );
      const registration = tx.create(Registration, {
        activityId,
        memberId: member.id,
        orgoId: member.orgoId!,
        memberName: member.name,
        branch,
        role,
        minor,
        state: totalBani === 0 && state === 'reserved' ? 'accepted' : state,
        ownerId: user?.id,
        tokenHash: hashToken(token),
        email,
        answers,
        totalBani,
        familyPlan: obligations[0]?.plan,
        installments: data.installments,
        questions: role === 'staff' ? [] : data.questions,
        paymentDue: data.paymentDue,
        consentState: publication ? 'awaiting' : 'not_required',
        consentPublicationId: publication?.id,
        exceptionNote: override ? text(b.exceptionNote, 2000) : undefined,
      });
      tx.persist(registration);
      await tx.flush();
      const managePath = `/activitati/${activityId}/inscriere/${token}`;
      const origin = this.config.get<string>('WEB_ORIGIN');
      const link = origin ? new URL(managePath, origin).href : managePath;
      if (email)
        tx.persist(
          tx.create(Mail, {
            registrationId: registration.id,
            recipient: email,
            subject: `Înscriere — ${activity.title}`.slice(0, 255),
            body: `Înscrierea a fost înregistrată. Gestionează participarea, acordul și plata prin linkul personal:\n${link}\nPăstrează acest link privat.`,
          }),
        );
      this.audit(tx, activityId, user?.id, 'created', registration.id, {
        role,
        state,
        exception: override,
      });
      return {
        id: registration.id,
        managementToken: token,
        managePath,
        state: registration.state,
      };
    });
  }
  async balance(row: Registration, tx = this.em) {
    const entries = await tx.find(
      Entry,
      { registrationId: row.id },
      { orderBy: { createdAt: 'asc' } },
    );
    const cashBani = entries
      .filter((e) => e.method !== 'support')
      .reduce((s, e) => s + e.amountBani, 0);
    const supportBani = entries
      .filter((e) => e.method === 'support')
      .reduce((s, e) => s + e.amountBani, 0);
    const coveredBani = cashBani + supportBani;
    const refundedBani = -entries
      .filter((entry) => entry.method === 'refund')
      .reduce((sum, entry) => sum + entry.amountBani, 0);
    return {
      entries,
      cashBani,
      supportBani,
      coveredBani,
      refundedBani,
      refundRemainingBani: Math.max(0, (row.refundDueBani ?? 0) - refundedBani),
      remainingBani: Math.max(0, row.totalBani - coveredBani),
      excessBani: Math.max(0, coveredBani - row.totalBani),
      installment: installmentBalance(
        row.totalBani,
        coveredBani,
        row.installments,
      ),
      paymentState:
        coveredBani >= row.totalBani
          ? 'paid'
          : coveredBani > 0
            ? 'partial'
            : 'unpaid',
    };
  }
  async authorize(
    activityId: number,
    registrationId: string,
    token?: string,
    user?: CurrentUser,
    tx = this.em,
  ) {
    const row = await tx.findOne(Registration, {
      id: uuid(registrationId),
      activityId,
    });
    if (!row) throw new NotFoundException('Înscrierea nu există.');
    if (
      token &&
      /^[A-Za-z0-9_-]{43}$/.test(token) &&
      row.tokenHash === hashToken(token)
    )
      return row;
    const { activity, data } = await this.settings(activityId, tx);
    const own =
      user &&
      (row.ownerId === user.id ||
        row.orgoId === user.orgoConnection?.orgoUserId);
    if (
      user &&
      (own ||
        this.manager(user, activity) ||
        data.medicalUserIds.includes(user.id) ||
        data.administrativeUserIds.includes(user.id))
    )
      return row;
    throw new ForbiddenException(
      'Folosește contul autorizat sau linkul personal al înscrierii.',
    );
  }
  async personal(activityId: number, token: string, user?: CurrentUser) {
    const row = await this.em.findOne(Registration, {
      activityId,
      tokenHash: hashToken(text(token, 100)),
    });
    if (!row) throw new NotFoundException('Linkul nu este valid.');
    return this.detail(row, user, true);
  }
  private async detail(
    row: Registration,
    user?: CurrentUser,
    tokenAccess = false,
  ): Promise<Record<string, unknown>> {
    const documents = await this.em.find(
      Document,
      { registrationId: row.id },
      {
        fields: [
          'id',
          'kind',
          'filename',
          'checksum',
          'publicationId',
          'answerRevision',
          'sourceDocumentId',
          'createdAt',
        ],
        orderBy: { createdAt: 'desc' },
      },
    );
    const payments = await this.em.find(
      Checkout,
      { registrationId: row.id },
      {
        fields: ['id', 'state', 'amountBani', 'reviewRequired', 'createdAt'],
        orderBy: { createdAt: 'desc' },
      },
    );
    this.em.persist(
      this.em.create(AuditEntry, {
        actorId: user?.id,
        activityId: row.activityId,
        action: 'registration.viewed',
        entityType: 'activity_registration',
        entityId: row.id,
        metadata: {},
      }),
    );
    await this.em.flush();
    const safe: Record<string, unknown> = { ...row };
    delete safe.tokenHash;
    const { activity, data } = await this.settings(row.activityId);
    const canEdit =
      tokenAccess ||
      (!!user &&
        (row.ownerId === user.id ||
          row.orgoId === user.orgoConnection?.orgoUserId ||
          this.manager(user, activity) ||
          data.administrativeUserIds.includes(user.id)));
    const financeAccess =
      tokenAccess ||
      (!!user &&
        (row.ownerId === user.id ||
          row.orgoId === user.orgoConnection?.orgoUserId ||
          this.financial(user, activity)));
    if (!financeAccess) {
      delete safe.totalBani;
      delete safe.installments;
      delete safe.paymentDue;
      delete safe.familyPlan;
      delete safe.refundDueBani;
    }
    return {
      ...safe,
      canEdit,
      ...(financeAccess ? await this.balance(row) : {}),
      documents,
      payments: financeAccess ? payments : [],
    };
  }
  async mine(activityId: number, user: CurrentUser) {
    const rows = await this.em.find(Registration, {
      activityId,
      $or: [
        { ownerId: user.id },
        ...(user.orgoConnection?.orgoUserId
          ? [{ orgoId: user.orgoConnection.orgoUserId }]
          : []),
      ],
    });
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        memberName: row.memberName,
        orgoId: row.orgoId,
        role: row.role,
        state: row.state,
        consentState: row.consentState,
        ...(await this.balance(row)),
      })),
    );
  }
  async ownDetail(activityId: number, id: string, user: CurrentUser) {
    return this.detail(
      await this.authorize(activityId, id, undefined, user),
      user,
    );
  }
  async overview(activityId: number, user: CurrentUser) {
    const { activity, settings, data } = await this.settings(activityId);
    const manage = this.manager(user, activity),
      finance = this.financial(user, activity),
      sensitive =
        manage ||
        data.medicalUserIds.includes(user.id) ||
        data.administrativeUserIds.includes(user.id);
    if (!finance && !sensitive) throw new ForbiddenException();
    const rows = await this.em.find(
      Registration,
      { activityId },
      { orderBy: { createdAt: 'asc' } },
    );
    const paymentSettings = await this.em.findOne(MembershipPaymentSettings, {
      id: 'membership',
    });
    const provider =
      paymentSettings?.activeProvider === 'stripe' ? 'stripe' : 'netopia';
    const fee =
      paymentSettings?.processingFees?.[provider] ??
      DEFAULT_PROCESSING_FEES[provider];
    const lists = manage
      ? {
          structures: await this.em.find(LocalStructure, {}),
          units: await this.em.find(ScoutUnit, { archived: false }),
          groups: await this.em.find(ScoutSubunit, { archived: false }),
        }
      : undefined;
    return {
      revision: settings?.revision ?? 0,
      mailConfigured: Boolean(
        this.config.get<string>('ACTIVITY_MAIL_ENDPOINT') &&
        this.config.get<string>('ACTIVITY_MAIL_TOKEN') &&
        this.config.get<string>('WEB_ORIGIN'),
      ),
      settings: manage ? data : null,
      capabilities: {
        manage,
        finance,
        sensitive,
        consent: manage || data.administrativeUserIds.includes(user.id),
      },
      lists,
      priceAdvice: manage ? priceAdvice(data.feeBani, fee) : null,
      rows: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          orgoId: r.orgoId,
          memberName: r.memberName,
          branch: r.branch,
          role: r.role,
          state: r.state,
          createdAt: r.createdAt,
          revision: r.revision,
          consentState: r.consentState,
          familyKey: r.familyKey,
          familyPlan: finance ? r.familyPlan : undefined,
          totalBani: finance ? r.totalBani : undefined,
          refundDueBani: finance ? r.refundDueBani : undefined,
          payments: finance
            ? await this.em.find(
                Checkout,
                { registrationId: r.id },
                {
                  fields: [
                    'id',
                    'state',
                    'amountBani',
                    'reviewRequired',
                    'createdAt',
                  ],
                  orderBy: { createdAt: 'desc' },
                },
              )
            : undefined,
          paymentDue: finance ? r.paymentDue : undefined,
          ...(finance ? await this.balance(r) : {}),
          answers: sensitive ? r.answers : undefined,
          email: sensitive ? r.email : undefined,
          mailState:
            (
              await this.em.findOne(
                Mail,
                { registrationId: r.id },
                { orderBy: { createdAt: 'desc' } },
              )
            )?.state ?? null,
        })),
      ),
    };
  }
  async update(
    activityId: number,
    id: string,
    input: unknown,
    user: CurrentUser,
  ) {
    const b = record(input);
    return this.mutate(activityId, async (tx) => {
      const { activity, data } = await this.settings(activityId, tx);
      const row = await tx.findOneOrFail(Registration, {
        id: uuid(id),
        activityId,
      });
      if (b.revision !== row.revision)
        throw new ConflictException('Înscriere modificată. Reîncarcă.');
      const action = text(b.action, 80);
      if (['receipt', 'reversal', 'price', 'plan_refund'].includes(action)) {
        if (!this.financial(user, activity)) throw new ForbiddenException();
        const note = text(b.note, 2000);
        if (action === 'plan_refund') {
          const current = await this.balance(row, tx);
          const planned = amount(b.amountBani);
          if (
            planned > current.cashBani + current.refundedBani ||
            planned < current.refundedBani
          )
            throw new BadRequestException(
              'Verifică suma încasată și restituirile deja efectuate.',
            );
          row.refundDueBani = planned;
          this.audit(tx, activityId, user.id, 'refund_planned', id, {
            amountBani: planned,
            note,
          });
        } else if (action === 'price') {
          if (row.role === 'staff')
            throw new BadRequestException('Echipa adultă nu are taxă.');
          if (
            await tx.findOne(Checkout, {
              registrationId: id,
              state: { $in: ['created', 'pending', 'unknown'] },
            })
          )
            throw new ConflictException(
              'Există o plată în curs. Rezolvă încercarea înainte de schimbarea taxei.',
            );
          const before = row.totalBani;
          row.totalBani = amount(b.amountBani);
          this.audit(tx, activityId, user.id, 'price_changed', id, {
            before,
            after: row.totalBani,
            note,
          });
        } else if (action === 'receipt') {
          if (
            row.role === 'staff' ||
            !['accepted', 'reserved', 'withdrawn'].includes(row.state)
          )
            throw new BadRequestException(
              'Înscrierea nu poate primi încasări.',
            );
          const method = text(b.method, 20);
          if (!['bank', 'cash', 'support', 'refund'].includes(method))
            throw new BadRequestException('Metodă invalidă.');
          const value = amount(b.amountBani, false);
          const balance = await this.balance(row, tx);
          if (method === 'refund' && value > balance.cashBani)
            throw new BadRequestException(
              'Restituirea depășește suma încasată.',
            );
          const receivedOn = text(b.receivedOn, 10);
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(receivedOn) ||
            !Number.isFinite(Date.parse(receivedOn))
          )
            throw new BadRequestException('Dată invalidă.');
          if (
            await tx.findOne(Entry, {
              registrationId: id,
              method,
              amountBani: method === 'refund' ? -value : value,
              receivedOn,
              note,
            })
          )
            throw new ConflictException(
              'Există deja o înregistrare cu aceeași sumă, dată și referință. Verifică evidența; pentru o operațiune distinctă folosește referința ei.',
            );
          const entry = tx.create(Entry, {
            registrationId: id,
            method,
            amountBani: method === 'refund' ? -value : value,
            receivedOn,
            note,
            actorId: user.id,
          });
          tx.persist(entry);
          this.audit(tx, activityId, user.id, 'receipt_recorded', id, {
            method,
            amountBani: entry.amountBani,
            note,
          });
        } else {
          const entry = await tx.findOneOrFail(Entry, {
            id: uuid(b.entryId),
            registrationId: id,
          });
          if (entry.checkoutId)
            throw new BadRequestException(
              'Pentru o plată cu cardul înregistrează restituirea efectuată, fără anularea confirmării procesatorului.',
            );
          if (
            entry.reversedEntryId ||
            (await tx.findOne(Entry, { reversedEntryId: entry.id }))
          )
            throw new BadRequestException('Înregistrarea este deja corectată.');
          const current = await this.balance(row, tx);
          if (
            (entry.method === 'support'
              ? current.supportBani
              : current.cashBani) -
              entry.amountBani <
            0
          )
            throw new BadRequestException(
              'Corecția ar produce un sold încasat negativ. Verifică mai întâi restituirile și celelalte corecții.',
            );
          tx.persist(
            tx.create(Entry, {
              registrationId: id,
              method: entry.method,
              amountBani: -entry.amountBani,
              receivedOn: localDate(new Date()),
              note,
              actorId: user.id,
              reversedEntryId: entry.id,
            }),
          );
          this.audit(tx, activityId, user.id, 'receipt_reversed', id, {
            entryId: entry.id,
            note,
          });
        }
      } else {
        if (
          !this.manager(user, activity) &&
          !(
            data.administrativeUserIds.includes(user.id) &&
            ['paper_received', 'signed_accepted'].includes(action)
          )
        )
          throw new ForbiddenException();
        if (action === 'accept') {
          if (!['pending', 'waitlisted'].includes(row.state))
            throw new BadRequestException('Înscrierea nu așteaptă acceptarea.');
          if (
            !hasCapacity(
              data,
              await tx.find(Registration, { activityId }),
              row.role,
              row.branch,
            )
          )
            throw new ConflictException('Nu sunt locuri disponibile.');
          if (row.role === 'staff')
            await this.certificate(
              tx,
              await tx.findOneOrFail(ScoutMember, { id: row.memberId }),
              activity,
            );
          row.state =
            data.paymentConfirmsPlace && row.totalBani > 0
              ? 'reserved'
              : 'accepted';
        } else if (action === 'withdraw' || action === 'reject') {
          row.state = action === 'withdraw' ? 'withdrawn' : 'rejected';
          // Family repricing is a deliberate separate action; no balance is silently rewritten.
        } else if (
          action === 'paper_received' ||
          action === 'signed_accepted'
        ) {
          if (!row.minor || row.role === 'staff')
            throw new BadRequestException('Nu este necesar acord parental.');
          const latest = await tx.findOne(
            Document,
            {
              registrationId: id,
              kind: action === 'paper_received' ? 'generated' : 'signed',
              publicationId: row.consentPublicationId!,
              answerRevision: row.answerRevision,
            },
            { orderBy: { createdAt: 'desc' } },
          );
          if (!latest)
            throw new BadRequestException('Acordul corespunzător nu există.');
          row.consentState =
            action === 'paper_received' ? 'paper_received' : 'signed_accepted';
        } else if (action === 'extend_deadline') {
          const due = text(b.due, 10);
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(due) ||
            !Number.isFinite(Date.parse(due))
          )
            throw new BadRequestException('Dată invalidă.');
          row.paymentDue = due;
        } else throw new BadRequestException('Acțiune necunoscută.');
        this.audit(tx, activityId, user.id, action, id);
      }
      await tx.flush();
      if (
        row.state === 'reserved' &&
        (await this.balance(row, tx)).remainingBani === 0
      )
        row.state = 'accepted';
      row.revision++;
      row.updatedAt = new Date();
      return { success: true };
    });
  }
  async family(activityId: number, input: unknown, user: CurrentUser) {
    const b = record(input);
    if (
      !Array.isArray(b.registrationIds) ||
      b.registrationIds.length < 1 ||
      b.registrationIds.length > 20
    )
      throw new BadRequestException('Selectează membrii familiei.');
    const ids = [...new Set(b.registrationIds.map((v) => uuid(v)))];
    const note = text(b.note, 2000);
    return this.mutate(activityId, async (tx) => {
      const { data } = await this.requireManager(user, activityId, tx);
      if (!data.familyFees.length)
        throw new BadRequestException('Configurează tarifele de familie.');
      const rows = await tx.find(Registration, {
        activityId,
        id: { $in: ids },
        role: 'beneficiary',
        state: { $in: ['accepted', 'reserved'] },
      });
      if (rows.length !== ids.length)
        throw new BadRequestException(
          'Familia trebuie să conțină participanți acceptați la aceeași activitate.',
        );
      const oldKeys = rows
        .map((r) => r.familyKey)
        .filter((k): k is string => !!k);
      if (oldKeys.length) {
        const other = await tx.find(Registration, {
          activityId,
          familyKey: { $in: oldKeys },
          id: { $nin: ids },
          state: { $in: ['accepted', 'reserved'] },
        });
        if (other.length)
          throw new BadRequestException(
            'Include toți membrii activi ai grupului familial pentru recalculare.',
          );
      }
      if (
        await tx.findOne(Checkout, {
          registrationId: { $in: ids },
          state: { $in: ['created', 'pending', 'unknown'] },
        })
      )
        throw new ConflictException(
          'Există plăți în curs pentru această familie.',
        );
      const key = randomUUID();
      for (const [index, id] of ids.entries()) {
        const row = rows.find((r) => r.id === id)!;
        const before = row.totalBani;
        row.familyKey = key;
        row.totalBani =
          ids.length === 1
            ? (data.branchFees[row.branch] ?? data.feeBani)
            : data.familyFees[Math.min(index, data.familyFees.length - 1)];
        row.revision++;
        row.updatedAt = new Date();
        if (
          row.state === 'reserved' &&
          (await this.balance(row, tx)).remainingBani === 0
        )
          row.state = 'accepted';
        this.audit(tx, activityId, user.id, 'family_confirmed', id, {
          familyKey: key,
          position: index + 1,
          before,
          after: row.totalBani,
          note,
        });
      }
      return { success: true };
    });
  }
  async renewConsent(activityId: number, user: CurrentUser) {
    return this.mutate(activityId, async (tx) => {
      await this.requireManager(user, activityId, tx);
      const publication = await tx.findOneOrFail(ParentalConsentPublication, {
        activityId,
        status: ParentalConsentPublicationStatus.Active,
      });
      const rows = await tx.find(Registration, {
        activityId,
        minor: true,
        role: 'beneficiary',
        consentPublicationId: { $ne: publication.id },
        state: { $nin: ['withdrawn', 'rejected'] },
      });
      for (const row of rows) {
        row.consentPublicationId = publication.id;
        row.consentState = 'update_required';
        row.revision++;
        this.audit(
          tx,
          activityId,
          user.id,
          'consent_renewal_requested',
          row.id,
          { publicationId: publication.id },
        );
      }
      return { updated: rows.length };
    });
  }
  async generate(
    activityId: number,
    id: string,
    token?: string,
    user?: CurrentUser,
  ) {
    const row = await this.authorize(activityId, id, token, user);
    if (!row.minor || row.role === 'staff' || !row.consentPublicationId)
      throw new BadRequestException('Nu este necesar acord parental.');
    const existing = await this.em.findOne(Document, {
      registrationId: row.id,
      publicationId: row.consentPublicationId,
      answerRevision: row.answerRevision,
      kind: 'generated',
    });
    if (existing) return { id: existing.id };
    const extras: FormField[] = row.questions
      .filter(
        (q) =>
          q.inPdf && (!q.branches.length || q.branches.includes(row.branch)),
      )
      .map((q) => ({
        code: `custom_${q.code}`,
        label: q.label,
        type:
          q.type === 'multiple'
            ? 'multiple_choice'
            : q.type === 'choice'
              ? 'single_choice'
              : q.type === 'text'
                ? 'long_text'
                : q.type,
        options: q.options.map((x) => ({ value: x, label: x })),
      }));
    const publicationId = row.consentPublicationId;
    const answerRevision = row.answerRevision;
    const bytes = await this.consent.renderRegistration(
      publicationId,
      activityId,
      row.branch as BranchCode,
      row.answers,
      extras,
    );
    return this.mutate(activityId, async (tx) => {
      const fresh = await this.authorize(activityId, id, token, user, tx);
      if (
        fresh.consentPublicationId !== publicationId ||
        fresh.answerRevision !== answerRevision
      )
        throw new ConflictException('Acordul a fost actualizat. Reîncearcă.');
      const found = await tx.findOne(Document, {
        registrationId: id,
        publicationId,
        answerRevision,
        kind: 'generated',
      });
      if (found) return { id: found.id };
      const document = tx.create(Document, {
        registrationId: id,
        publicationId,
        answerRevision,
        kind: 'generated',
        filename: `acord-${row.orgoId}.pdf`,
        checksum: createHash('sha256').update(bytes).digest('hex'),
        data: bytes,
      });
      tx.persist(document);
      this.audit(tx, activityId, user?.id, 'consent_generated', id, {
        publicationId,
        checksum: document.checksum,
      });
      await tx.flush();
      return { id: document.id };
    });
  }
  async upload(
    activityId: number,
    id: string,
    input: unknown,
    token?: string,
    user?: CurrentUser,
  ) {
    const b = record(input),
      decoded = decodeDocument(b);
    if (decoded.contentType !== 'application/pdf')
      throw new BadRequestException('Încarcă PDF-ul semnat digital.');
    return this.mutate(activityId, async (tx) => {
      const row = await this.authorize(activityId, id, token, user, tx);
      const { activity, data } = await this.settings(activityId, tx);
      const canUpload =
        (token && row.tokenHash === hashToken(token)) ||
        (user &&
          (row.ownerId === user.id ||
            row.orgoId === user.orgoConnection?.orgoUserId ||
            this.manager(user, activity) ||
            data.administrativeUserIds.includes(user.id)));
      if (!canUpload) throw new ForbiddenException();
      if (!row.minor || row.role === 'staff' || !row.consentPublicationId)
        throw new BadRequestException('Nu este necesar acord parental.');
      const source = await tx.findOne(Document, {
        id: uuid(b.sourceDocumentId),
        registrationId: id,
        kind: 'generated',
        publicationId: row.consentPublicationId,
        answerRevision: row.answerRevision,
      });
      if (!source)
        throw new BadRequestException('Descarcă mai întâi acordul actual.');
      const checksum = createHash('sha256').update(decoded.data).digest('hex');
      const existing = await tx.findOne(Document, {
        registrationId: id,
        kind: 'signed',
        checksum,
      });
      if (existing) return { id: existing.id };
      const document = tx.create(Document, {
        registrationId: id,
        publicationId: source.publicationId,
        answerRevision: row.answerRevision,
        sourceDocumentId: source.id,
        kind: 'signed',
        filename: decoded.filename,
        checksum,
        data: decoded.data,
      });
      tx.persist(document);
      row.consentState = 'uploaded';
      row.revision++;
      this.audit(tx, activityId, user?.id, 'signed_uploaded', id, {
        publicationId: source.publicationId,
        checksum,
      });
      await tx.flush();
      return { id: document.id };
    });
  }
  async file(
    activityId: number,
    id: string,
    documentId: string,
    token?: string,
    user?: CurrentUser,
  ) {
    await this.authorize(activityId, id, token, user);
    const file = await this.em.findOne(
      Document,
      { id: uuid(documentId), registrationId: uuid(id) },
      { fields: ['*', 'data'] },
    );
    if (!file) throw new NotFoundException();
    this.audit(this.em, activityId, user?.id, 'document_downloaded', id, {
      documentId: file.id,
    });
    await this.em.flush();
    return file;
  }

  async editAnswers(
    activityId: number,
    id: string,
    input: unknown,
    token?: string,
    user?: CurrentUser,
  ) {
    const b = record(input);
    return this.mutate(activityId, async (tx) => {
      const row = await this.authorize(activityId, id, token, user, tx);
      const { activity, data } = await this.settings(activityId, tx);
      const allowed =
        (token && row.tokenHash === hashToken(token)) ||
        (user &&
          (row.ownerId === user.id ||
            row.orgoId === user.orgoConnection?.orgoUserId ||
            this.manager(user, activity) ||
            data.administrativeUserIds.includes(user.id)));
      if (!allowed) throw new ForbiddenException();
      if (row.role === 'staff' || ['withdrawn', 'rejected'].includes(row.state))
        throw new BadRequestException('Înscrierea nu poate fi modificată.');
      if (b.revision !== row.revision)
        throw new ConflictException('Înscrierea a fost modificată. Reîncarcă.');
      const answers = this.validateForm(
        b.answers,
        row.minor,
        row.questions,
        row.branch,
      );
      if (answers.birth_date !== row.answers.birth_date)
        throw new BadRequestException(
          'Data nașterii identifică participantul. Contactează coordonatorul pentru corectare.',
        );
      row.answers = answers;
      row.answerRevision++;
      row.revision++;
      row.updatedAt = new Date();
      if (row.minor) row.consentState = 'update_required';
      this.audit(tx, activityId, user?.id, 'answers_updated', id, {
        answerRevision: row.answerRevision,
      });
      return { success: true };
    });
  }
}

import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ScoutMember } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { OrgoConnection } from '../users/entities/orgo-connection.entity';
import type { CurrentUser } from '../users/users.types';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import {
  AdultDocument,
  AdultDocumentFile,
} from './entities/adult-document.entity';
import {
  adultOn,
  decodeDocument,
  documentInput,
  parseKind,
  parseYear,
  scoutingYear,
  summarizeDocuments,
} from './adult-documents.rules';

@Injectable()
export class AdultDocumentsService {
  constructor(private readonly em: EntityManager) {}

  private async context(tx: EntityManager, user: CurrentUser) {
    const account = await tx.findOne(User, { id: user.id }, { refresh: true });
    if (!account || account.memberAccessDisabled)
      throw new ForbiddenException('Nu ai acces la documentele adulților.');
    const connection = await tx.findOne(OrgoConnection, { user: user.id });
    const member = await tx.findOne(
      ScoutMember,
      connection?.orgoUserId
        ? { orgoId: connection.orgoUserId }
        : { accountId: user.id },
    );
    const admin = !!(
      account.centralMemberAdmin &&
      account.roles.some((role) =>
        [UserRole.Admin, UserRole.SuperAdmin].includes(role),
      ) &&
      member?.status === 'active' &&
      member.structureId === 'cluj'
    );
    return { admin, member };
  }

  private requireAdmin(admin: boolean) {
    if (!admin)
      throw new ForbiddenException('Doar administratorii centrali au acces.');
  }

  private async target(tx: EntityManager, user: CurrentUser, memberId: string) {
    const context = await this.context(tx, user);
    if (!context.admin && context.member?.id !== memberId)
      throw new ForbiddenException('Nu ai acces la acest dosar.');
    const member = await tx.findOne(ScoutMember, { id: memberId });
    if (!member) throw new NotFoundException('Membrul nu există.');
    return { ...context, target: member };
  }

  private audit(
    tx: EntityManager,
    user: CurrentUser,
    action: string,
    id: string,
    metadata: Record<string, unknown> = {},
  ) {
    tx.persist(
      tx.create(AuditEntry, {
        actorId: user.id,
        action: `adult_document.${action}`,
        entityType: 'adult_document',
        entityId: id,
        metadata,
      }),
    );
  }

  private async lock(tx: EntityManager, memberId: string) {
    await tx.execute('select pg_advisory_xact_lock(25102026, hashtext(?))', [
      memberId,
    ]);
  }

  async access(user: CurrentUser) {
    const { admin } = await this.context(this.em, user);
    return { admin };
  }

  async mine(user: CurrentUser, yearInput?: string) {
    return this.em.transactional(async (tx) => {
      const { member } = await this.context(tx, user);
      if (!member)
        return { eligible: null, reason: 'member_not_found', dossier: null };
      const eligible = adultOn(member.birthDate);
      if (eligible !== true)
        return {
          eligible,
          reason: eligible === null ? 'birth_date_missing' : 'under_age',
          dossier: null,
        };
      return {
        eligible: true,
        reason: null,
        dossier: await this.dossier(
          tx,
          user,
          member,
          parseYear(yearInput),
          false,
        ),
      };
    });
  }

  async getDossier(user: CurrentUser, memberId: string, yearInput?: string) {
    return this.em.transactional(async (tx) => {
      const { admin, target } = await this.target(tx, user, memberId);
      return this.dossier(tx, user, target, parseYear(yearInput), admin);
    });
  }

  private async dossier(
    tx: EntityManager,
    user: CurrentUser,
    member: ScoutMember,
    year: number,
    admin: boolean,
  ) {
    const documents = await tx.find(
      AdultDocument,
      { memberId: member.id },
      { orderBy: { year: 'desc', kind: 'asc', version: 'desc' } },
    );
    const selected = documents.filter((d) => d.year === year);
    const actors = [
      ...new Set(
        selected
          .flatMap((d) => [d.uploaderId, d.reviewerId])
          .filter((id): id is number => id != null),
      ),
    ];
    const users = actors.length
      ? await tx.find(User, { id: { $in: actors } })
      : [];
    if (admin) this.audit(tx, user, 'viewed', member.id, { year });
    return {
      memberId: member.id,
      name: member.name,
      birthDate: member.birthDate,
      eligible: adultOn(member.birthDate),
      year,
      currentYear: scoutingYear(),
      canReview: admin,
      years: [
        ...new Set([scoutingYear(), year, ...documents.map((d) => d.year)]),
      ].sort((a, b) => b - a),
      complete: summarizeDocuments(selected).every(
        (status) => status === 'validated',
      ),
      documents: selected.map((d) => ({
        id: d.id,
        kind: d.kind,
        version: d.version,
        status: d.status,
        filename: d.filename,
        contentType: d.contentType,
        size: d.size,
        uploadedAt: d.uploadedAt.toISOString(),
        uploaderName:
          users.find((u) => u.id === d.uploaderId)?.displayName ?? 'Membru',
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
        reviewerName:
          users.find((u) => u.id === d.reviewerId)?.displayName ?? null,
        rejectionReason: d.rejectionReason,
      })),
    };
  }

  async list(
    user: CurrentUser,
    input: {
      year?: string;
      search?: string;
      status?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    return this.em.transactional(async (tx) => {
      this.requireAdmin((await this.context(tx, user)).admin);
      const year = parseYear(input.year);
      if (
        input.status &&
        !['missing', 'pending', 'validated', 'rejected'].includes(input.status)
      )
        throw new BadRequestException('Filtru de documente invalid.');
      const page = Number(input.page ?? 1),
        pageSize = Number(input.pageSize ?? 25);
      if (
        !Number.isInteger(page) ||
        page < 1 ||
        ![10, 25, 50, 100, 250, 500, 0].includes(pageSize)
      )
        throw new BadRequestException('Paginare invalidă.');
      const all = await tx.find(
        ScoutMember,
        { status: 'active' },
        { orderBy: { name: 'asc' } },
      );
      const members = all.filter((m) => adultOn(m.birthDate) === true);
      const documents = members.length
        ? await tx.find(AdultDocument, {
            year,
            memberId: { $in: members.map((m) => m.id) },
          })
        : [];
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('ro');
      const search = normalize((input.search ?? '').slice(0, 200).trim());
      const rows = members
        .map((m) => {
          const statuses = summarizeDocuments(
            documents.filter((d) => d.memberId === m.id),
          );
          return {
            memberId: m.id,
            name: m.name,
            structureId: m.structureId,
            statuses,
            complete: statuses.every((s) => s === 'validated'),
          };
        })
        .filter(
          (r) =>
            normalize(r.name).includes(search) &&
            (!input.status ||
              r.statuses.some((status) => status === input.status)),
        );
      const total = rows.length;
      const actualPage = pageSize
        ? Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
        : 1;
      const years = await tx.execute<{ year: number }[]>(
        'select distinct year from adult_documents order by year desc',
      );
      this.audit(tx, user, 'workspace_viewed', 'workspace', { year });
      return {
        year,
        currentYear: scoutingYear(),
        years: [
          ...new Set([scoutingYear(), year, ...years.map((r) => r.year)]),
        ].sort((a, b) => b - a),
        rows: pageSize
          ? rows.slice((actualPage - 1) * pageSize, actualPage * pageSize)
          : rows,
        total,
        loadedTotal: members.length,
        unknownBirthDates: all.filter((m) => adultOn(m.birthDate) === null)
          .length,
        page: actualPage,
        pageSize,
      };
    });
  }

  async upload(user: CurrentUser, memberId: string, raw: unknown) {
    const input = documentInput(raw),
      year = parseYear(input.year),
      kind = parseKind(input.kind);
    return this.em.transactional(async (tx) => {
      const { target } = await this.target(tx, user, memberId);
      if (adultOn(target.birthDate) !== true)
        throw new BadRequestException(
          'Documentele se încarcă pentru membri cu data nașterii cunoscută și minimum 18 ani.',
        );
      const file = decodeDocument(input);
      await this.lock(tx, memberId);
      const last = await tx.findOne(
        AdultDocument,
        { memberId, year, kind },
        { orderBy: { version: 'desc' }, refresh: true },
      );
      const document = tx.create(AdultDocument, {
        id: randomUUID(),
        memberId,
        year,
        kind,
        version: (last?.version ?? 0) + 1,
        status: 'pending',
        filename: file.filename,
        contentType: file.contentType,
        size: file.data.length,
        uploaderId: user.id,
      });
      tx.persist(document);
      await tx.flush();
      tx.persist(
        tx.create(AdultDocumentFile, { id: document.id, data: file.data }),
      );
      this.audit(tx, user, last ? 'replaced' : 'uploaded', document.id, {
        memberId,
        year,
        kind,
        version: document.version,
      });
      return { id: document.id };
    });
  }

  async review(user: CurrentUser, id: string, raw: unknown) {
    const input = documentInput(raw);
    if (input.status !== 'validated' && input.status !== 'rejected')
      throw new BadRequestException('Alege Validat sau Respins.');
    const status = input.status;
    const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
    if (reason.length > 2000 || (status === 'rejected' && !reason))
      throw new BadRequestException(
        'Respingerea necesită un motiv de maximum 2000 de caractere.',
      );
    return this.em.transactional(async (tx) => {
      this.requireAdmin((await this.context(tx, user)).admin);
      let document = await tx.findOne(AdultDocument, { id });
      if (!document) throw new NotFoundException('Documentul nu există.');
      await this.lock(tx, document.memberId);
      document = await tx.findOneOrFail(
        AdultDocument,
        { id },
        { refresh: true },
      );
      const current = await tx.findOne(
        AdultDocument,
        {
          memberId: document.memberId,
          year: document.year,
          kind: document.kind,
        },
        { orderBy: { version: 'desc' }, refresh: true },
      );
      if (current?.id !== id || document.status !== 'pending')
        throw new ConflictException(
          'Documentul a fost înlocuit sau verificat deja. Reîncarcă dosarul.',
        );
      document.status = status;
      document.reviewerId = user.id;
      document.reviewedAt = new Date();
      document.rejectionReason = status === 'rejected' ? reason : null;
      this.audit(tx, user, status, id, {
        memberId: document.memberId,
        year: document.year,
        kind: document.kind,
        version: document.version,
      });
      return { id };
    });
  }

  async download(user: CurrentUser, id: string) {
    return this.em.transactional(async (tx) => {
      const document = await tx.findOne(AdultDocument, { id });
      if (!document) throw new NotFoundException('Documentul nu există.');
      const { admin } = await this.target(tx, user, document.memberId);
      const file = await tx.findOne(AdultDocumentFile, { id });
      if (!file) throw new NotFoundException('Fișierul nu este disponibil.');
      if (admin)
        this.audit(tx, user, 'downloaded', id, {
          year: document.year,
          kind: document.kind,
          version: document.version,
        });
      return {
        data: Buffer.from(file.data),
        contentType: document.contentType,
        filename: document.filename,
      };
    });
  }
}

import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Activity } from '../activities/entities/activity.entity';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../users/entities/user-role.enum';
import { User } from '../users/entities/user.entity';
import type { CurrentUser } from '../users/users.types';
import {
  CreateFinancialDocumentDto,
  FinanceSettingsDto,
  FinanceSummaryDto,
  FinancialDocumentAuditDto,
  FinancialDocumentDto,
  UpdateFinanceSettingsDto,
  UpdateFinancialDocumentStatusDto,
} from './dto/finance.dto';
import { FinanceSettings } from './entities/finance-settings.entity';
import { FinancialDocumentAudit } from './entities/financial-document-audit.entity';
import { FinancialDocumentHandoffAttempt } from './entities/financial-document-handoff-attempt.entity';
import { FinancialDocumentStatus } from './entities/financial-document-status.enum';
import { FinancialDocument } from './entities/financial-document.entity';
import { KeezHandoffMode } from './entities/keez-handoff-mode.enum';
import { KeezService } from './keez.service';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const SETTINGS_ID = 1;
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const TERMINAL_STATUSES = new Set<string>([
  FinancialDocumentStatus.Sent,
  FinancialDocumentStatus.Rejected,
  FinancialDocumentStatus.Archived,
]);

type FinancialDocumentFile = {
  originalFilename: string;
  contentType: string;
  fileData: Buffer;
};

type ListDocumentsInput = {
  activityId?: string;
};

const cleanOptionalText = (value?: string) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const cleanFilename = (value?: string) => {
  const cleaned = cleanOptionalText(value)?.split(/[/\\]/).pop()?.trim();
  return (cleaned || 'document-financiar').slice(0, 255);
};

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinancialDocument)
    private readonly documentsRepository: EntityRepository<FinancialDocument>,
    @InjectRepository(FinancialDocumentAudit)
    private readonly auditsRepository: EntityRepository<FinancialDocumentAudit>,
    @InjectRepository(FinancialDocumentHandoffAttempt)
    private readonly handoffAttemptsRepository: EntityRepository<FinancialDocumentHandoffAttempt>,
    @InjectRepository(FinanceSettings)
    private readonly settingsRepository: EntityRepository<FinanceSettings>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: EntityRepository<Activity>,
    @InjectRepository(User)
    private readonly usersRepository: EntityRepository<User>,
    @Inject(EntityManager)
    private readonly em: EntityManager,
    private readonly keezService: KeezService,
    private readonly auditService: AuditService,
  ) {}

  async createDocument(
    user: CurrentUser,
    input: CreateFinancialDocumentDto,
  ): Promise<FinancialDocumentDto> {
    const contentType = input.contentType?.trim().toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException(
        'Tipul fișierului nu este acceptat. Încarcă PDF, JPG, PNG, WEBP sau HEIC.',
      );
    }

    const fileData = this.decodeBase64File(input.contentBase64);
    if (fileData.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        'Fișierul este prea mare. Limita actuală este 15 MB.',
      );
    }

    const checksumSha256 = createHash('sha256').update(fileData).digest('hex');
    const activity = await this.resolveActivity(input.activityId);
    const document = this.documentsRepository.create({
      uploaderId: user.id,
      status: FinancialDocumentStatus.Uploaded,
      originalFilename: cleanFilename(input.fileName),
      contentType,
      fileSize: fileData.length,
      checksumSha256,
      fileData,
      activityId: activity?.id,
      activityName: activity
        ? undefined
        : cleanOptionalText(input.activityName)?.slice(0, 255),
      notes: cleanOptionalText(input.notes),
    });

    this.em.persist(document);
    await this.em.flush();
    await this.recordAudit(
      document.id,
      user.id,
      undefined,
      FinancialDocumentStatus.Uploaded,
      document.notes ?? undefined,
    );
    await this.auditService.record({
      actorId: user.id,
      action: 'financial_document.created',
      entityType: 'financial_document',
      entityId: document.id,
      activityId: document.activityId ?? undefined,
      metadata: {
        originalFilename: document.originalFilename,
        contentType: document.contentType,
        fileSize: document.fileSize,
        status: document.status,
      },
    });
    await this.handleDirectHandoffAfterUpload(user, document);

    const [serialized] = await this.serializeDocuments([document]);
    return serialized;
  }

  async listDocuments(
    user: CurrentUser,
    input: ListDocumentsInput = {},
  ): Promise<FinancialDocumentDto[]> {
    const activityId = this.parseOptionalId(input.activityId, 'Activitatea');
    const documents = await this.documentsRepository.find(
      activityId ? { activityId } : {},
      {
        orderBy: { createdAt: 'desc' },
      },
    );
    const visibleDocuments = await this.filterVisibleDocuments(user, documents);

    return this.serializeDocuments(visibleDocuments);
  }

  async listDocumentsForActivity(
    user: CurrentUser,
    activityId: number,
  ): Promise<FinancialDocumentDto[]> {
    const documents = await this.documentsRepository.find(
      { activityId },
      {
        orderBy: { createdAt: 'desc' },
      },
    );
    const visibleDocuments = await this.filterVisibleDocuments(user, documents);

    return this.serializeDocuments(visibleDocuments);
  }

  async listAudits(
    user: CurrentUser,
    documentId: number,
  ): Promise<FinancialDocumentAuditDto[]> {
    await this.getVisibleDocument(user, documentId);
    const audits = await this.auditsRepository.find(
      { documentId },
      { orderBy: { createdAt: 'asc' } },
    );
    const actorNames = await this.getUserNames(
      audits.map((audit) => audit.actorId),
    );

    return audits.map((audit) => ({
      id: audit.id,
      documentId: audit.documentId,
      actorId: audit.actorId,
      actorName:
        actorNames.get(audit.actorId) ?? `Utilizator #${audit.actorId}`,
      fromStatus: audit.fromStatus ?? undefined,
      toStatus: audit.toStatus,
      comment: audit.comment ?? undefined,
      createdAt: audit.createdAt.toISOString(),
    }));
  }

  async getDocumentFile(
    user: CurrentUser,
    documentId: number,
  ): Promise<FinancialDocumentFile> {
    const document = await this.getVisibleDocument(user, documentId);

    return {
      originalFilename: document.originalFilename,
      contentType: document.contentType,
      fileData: document.fileData,
    };
  }

  async deleteDocument(user: CurrentUser, documentId: number) {
    if (!this.canManageFinance(user)) {
      throw new ForbiddenException('Nu ai acces la documentele financiare.');
    }

    const document = await this.documentsRepository.findOne({ id: documentId });
    if (!document) {
      throw new NotFoundException('Documentul financiar nu există.');
    }

    await this.auditService.record({
      actorId: user.id,
      action: 'financial_document.deleted',
      entityType: 'financial_document',
      entityId: document.id,
      activityId: document.activityId ?? undefined,
      metadata: {
        originalFilename: document.originalFilename,
        contentType: document.contentType,
        fileSize: document.fileSize,
        status: document.status,
        checksumSha256: document.checksumSha256,
      },
    });

    this.em.remove(document);
    await this.em.flush();

    return { deleted: true };
  }

  async updateDocumentStatus(
    user: CurrentUser,
    documentId: number,
    input: UpdateFinancialDocumentStatusDto,
  ): Promise<FinancialDocumentDto> {
    if (!this.canManageFinance(user)) {
      throw new ForbiddenException('Nu ai acces la documentele financiare.');
    }

    if (!Object.values(FinancialDocumentStatus).includes(input.status)) {
      throw new BadRequestException('Starea documentului nu este validă.');
    }

    const document = await this.documentsRepository.findOne({ id: documentId });
    if (!document) {
      throw new NotFoundException('Documentul financiar nu există.');
    }

    const previousStatus = document.status;
    const reviewerNotes = cleanOptionalText(input.reviewerNotes);
    document.status = input.status;
    document.reviewerNotes = reviewerNotes ?? document.reviewerNotes;

    this.em.persist(document);
    await this.em.flush();
    await this.recordAudit(
      document.id,
      user.id,
      previousStatus,
      input.status,
      reviewerNotes,
    );
    await this.auditService.record({
      actorId: user.id,
      action: 'financial_document.status_updated',
      entityType: 'financial_document',
      entityId: document.id,
      activityId: document.activityId ?? undefined,
      metadata: {
        fromStatus: previousStatus,
        toStatus: input.status,
        reviewerNotes,
      },
    });

    const [serialized] = await this.serializeDocuments([document]);
    return serialized;
  }

  async sendDocumentToAccounting(
    user: CurrentUser,
    documentId: number,
  ): Promise<FinancialDocumentDto> {
    if (!this.canManageFinance(user)) {
      throw new ForbiddenException('Nu ai acces la documentele financiare.');
    }

    const document = await this.documentsRepository.findOne({ id: documentId });
    if (!document) {
      throw new NotFoundException('Documentul financiar nu existÄƒ.');
    }

    const currentStatus = document.status as FinancialDocumentStatus;
    if (currentStatus === FinancialDocumentStatus.Sent) {
      throw new BadRequestException(
        'Documentul a fost deja trimis. FoloseÈ™te retrimiterea explicitÄƒ.',
      );
    }
    if (
      currentStatus === FinancialDocumentStatus.Rejected ||
      currentStatus === FinancialDocumentStatus.Archived
    ) {
      throw new BadRequestException(
        'Documentul respins sau arhivat nu poate fi trimis cÄƒtre contabilitate.',
      );
    }

    await this.submitDocumentHandoff(user, document, 'manual_send');
    const [serialized] = await this.serializeDocuments([document]);
    return serialized;
  }

  async retryDocumentHandoff(
    user: CurrentUser,
    documentId: number,
  ): Promise<FinancialDocumentDto> {
    if (!this.canManageFinance(user)) {
      throw new ForbiddenException('Nu ai acces la documentele financiare.');
    }

    const document = await this.documentsRepository.findOne({ id: documentId });
    if (!document) {
      throw new NotFoundException('Documentul financiar nu existÄƒ.');
    }
    const currentStatus = document.status as FinancialDocumentStatus;
    if (currentStatus !== FinancialDocumentStatus.SendFailed) {
      throw new BadRequestException(
        'Doar documentele cu trimitere eÈ™uatÄƒ pot fi reÃ®ncercate.',
      );
    }

    await this.submitDocumentHandoff(user, document, 'retry');
    const [serialized] = await this.serializeDocuments([document]);
    return serialized;
  }

  async resendDocumentToAccounting(
    user: CurrentUser,
    documentId: number,
  ): Promise<FinancialDocumentDto> {
    if (!this.canManageFinance(user)) {
      throw new ForbiddenException('Nu ai acces la documentele financiare.');
    }

    const document = await this.documentsRepository.findOne({ id: documentId });
    if (!document) {
      throw new NotFoundException('Documentul financiar nu existÄƒ.');
    }
    const currentStatus = document.status as FinancialDocumentStatus;
    if (currentStatus !== FinancialDocumentStatus.Sent) {
      throw new BadRequestException(
        'Doar documentele trimise pot fi retrimise explicit.',
      );
    }

    await this.submitDocumentHandoff(user, document, 'resend');
    const [serialized] = await this.serializeDocuments([document]);
    return serialized;
  }

  async getSettings(): Promise<FinanceSettingsDto> {
    const settings = await this.ensureSettings();
    const keezStatus = this.keezService.getConfigurationStatus();

    return {
      keezHandoffMode: settings.keezHandoffMode,
      keezConfigured: keezStatus.configured,
      keezEnvironment: keezStatus.environment,
      keezDocumentUploadAvailable: keezStatus.documentUploadAvailable,
      keezEmailHandoffAvailable: keezStatus.emailHandoffAvailable,
      keezEmailSender: keezStatus.emailSender,
      keezEmailRecipient: keezStatus.emailRecipient,
    };
  }

  async getHandoffGuidance() {
    const settings = await this.ensureSettings();

    return {
      keezHandoffMode: settings.keezHandoffMode,
    };
  }

  async updateSettings(
    user: CurrentUser,
    input: UpdateFinanceSettingsDto,
  ): Promise<FinanceSettingsDto> {
    if (!this.canManageFinance(user)) {
      throw new ForbiddenException('Nu poți modifica setările financiare.');
    }

    if (!Object.values(KeezHandoffMode).includes(input.keezHandoffMode)) {
      throw new BadRequestException(
        'Modul de trimitere către Keez nu este valid.',
      );
    }

    const keezStatus = this.keezService.getConfigurationStatus();
    if (
      input.keezHandoffMode === KeezHandoffMode.DirectToKeez &&
      !keezStatus.documentUploadAvailable
    ) {
      throw new BadRequestException(
        'Trimiterea directă către contabilitate nu este disponibilă până când Gmail este configurat pentru cluj.napoca@scout.ro.',
      );
    }

    const settings = await this.ensureSettings();
    settings.keezHandoffMode = input.keezHandoffMode;
    settings.updatedById = user.id;

    this.em.persist(settings);
    await this.em.flush();
    return this.getSettings();
  }

  async getSummary(user: CurrentUser): Promise<FinanceSummaryDto> {
    if (!this.canManageFinance(user)) {
      throw new ForbiddenException('Nu ai acces la statisticile financiare.');
    }

    const documents = await this.documentsRepository.findAll();
    const openDocuments = documents.filter(
      (document) => !TERMINAL_STATUSES.has(String(document.status)),
    ).length;

    return {
      totalDocuments: documents.length,
      generalDocuments: documents.filter((document) => !document.activityId)
        .length,
      activityDocuments: documents.filter((document) => document.activityId)
        .length,
      openDocuments,
      needsClarification: documents.filter(
        (document) => String(document.status) === 'needs_clarification',
      ).length,
      sentDocuments: documents.filter(
        (document) => String(document.status) === 'sent',
      ).length,
    };
  }

  private async handleDirectHandoffAfterUpload(
    user: CurrentUser,
    document: FinancialDocument,
  ) {
    const settings = await this.ensureSettings();
    const handoffMode = settings.keezHandoffMode as KeezHandoffMode;
    if (handoffMode !== KeezHandoffMode.DirectToKeez) {
      return;
    }

    const duplicate = await this.findSentDuplicate(document);
    if (duplicate) {
      const previousStatus = document.status;
      document.status = FinancialDocumentStatus.InReview;
      document.reviewerNotes = `Posibil duplicat: fiÈ™ier identic cu documentul #${duplicate.id} deja trimis cÄƒtre contabilitate.`;
      this.em.persist(document);
      await this.em.flush();
      await this.recordAudit(
        document.id,
        user.id,
        previousStatus,
        FinancialDocumentStatus.InReview,
        document.reviewerNotes,
      );
      await this.auditService.record({
        actorId: user.id,
        action: 'financial_document.direct_handoff_duplicate',
        entityType: 'financial_document',
        entityId: document.id,
        activityId: document.activityId ?? undefined,
        metadata: {
          duplicateDocumentId: duplicate.id,
          checksumSha256: document.checksumSha256,
        },
      });
      return;
    }

    await this.submitDocumentHandoff(user, document, 'direct_upload');
  }

  private async findSentDuplicate(document: FinancialDocument) {
    return this.documentsRepository.findOne({
      checksumSha256: document.checksumSha256,
      status: FinancialDocumentStatus.Sent,
      id: { $ne: document.id },
    });
  }

  private async submitDocumentHandoff(
    user: CurrentUser,
    document: FinancialDocument,
    trigger: 'direct_upload' | 'manual_send' | 'retry' | 'resend',
  ) {
    const previousStatus = document.status;
    const uploaderNames = await this.getUserNames([document.uploaderId]);
    const activityName = await this.getDocumentActivityName(document);
    const metadata = this.keezService.getDocumentSubmissionMetadata(document);

    try {
      const result = await this.keezService.submitDocument({
        document,
        uploaderName:
          uploaderNames.get(document.uploaderId) ??
          `Utilizator #${document.uploaderId}`,
        activityName,
      });

      document.status = FinancialDocumentStatus.Sent;
      document.keezExternalId = result.providerMessageId;
      document.keezSubmittedAt = new Date();
      this.em.persist(document);
      await this.em.flush();
      await this.recordHandoffAttempt(document, user.id, {
        status: 'succeeded',
        senderEmail: result.senderEmail,
        recipientEmail: result.recipientEmail,
        subject: result.subject,
        attachmentFilename: result.attachmentFilename,
        providerMessageId: result.providerMessageId,
      });
      await this.recordAudit(
        document.id,
        user.id,
        previousStatus,
        FinancialDocumentStatus.Sent,
        'Trimis cÄƒtre contabilitate.',
      );
      await this.auditService.record({
        actorId: user.id,
        action: `financial_document.${trigger}.succeeded`,
        entityType: 'financial_document',
        entityId: document.id,
        activityId: document.activityId ?? undefined,
        metadata: {
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          senderEmail: result.senderEmail,
          recipientEmail: result.recipientEmail,
          attachmentFilename: result.attachmentFilename,
        },
      });
    } catch (error) {
      const errorMessage = this.safeErrorMessage(error);
      document.status = FinancialDocumentStatus.SendFailed;
      document.reviewerNotes = errorMessage;
      this.em.persist(document);
      await this.em.flush();
      await this.recordHandoffAttempt(document, user.id, {
        status: 'failed',
        senderEmail: metadata.senderEmail,
        recipientEmail: metadata.recipientEmail,
        subject: metadata.subject,
        attachmentFilename: metadata.attachmentFilename,
        errorMessage,
      });
      await this.recordAudit(
        document.id,
        user.id,
        previousStatus,
        FinancialDocumentStatus.SendFailed,
        errorMessage,
      );
      await this.auditService.record({
        actorId: user.id,
        action: `financial_document.${trigger}.failed`,
        entityType: 'financial_document',
        entityId: document.id,
        activityId: document.activityId ?? undefined,
        metadata: {
          senderEmail: metadata.senderEmail,
          recipientEmail: metadata.recipientEmail,
          attachmentFilename: metadata.attachmentFilename,
          errorMessage,
        },
      });
    }
  }

  private async recordHandoffAttempt(
    document: FinancialDocument,
    actorId: number,
    input: {
      status: 'succeeded' | 'failed';
      senderEmail: string;
      recipientEmail: string;
      subject: string;
      attachmentFilename: string;
      providerMessageId?: string;
      errorMessage?: string;
    },
  ) {
    const attempt = this.handoffAttemptsRepository.create({
      documentId: document.id,
      actorId,
      channel: 'email',
      provider: 'gmail',
      status: input.status,
      senderEmail: input.senderEmail,
      recipientEmail: input.recipientEmail,
      subject: input.subject.slice(0, 255),
      attachmentFilename: input.attachmentFilename.slice(0, 255),
      providerMessageId: input.providerMessageId,
      errorMessage: cleanOptionalText(input.errorMessage),
    });

    this.em.persist(attempt);
    await this.em.flush();
  }

  private async getDocumentActivityName(document: FinancialDocument) {
    if (document.activityName) {
      return document.activityName;
    }
    if (!document.activityId) {
      return undefined;
    }

    const activity = await this.activitiesRepository.findOne({
      id: document.activityId,
    });
    return activity?.title;
  }

  private safeErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message.slice(0, 1000);
    }

    return 'Trimiterea cÄƒtre contabilitate a eÈ™uat.'.slice(0, 1000);
  }

  private decodeBase64File(value?: string) {
    const content = value?.trim();
    if (!content) {
      throw new BadRequestException('Fișierul este obligatoriu.');
    }

    const decoded = Buffer.from(content, 'base64');
    if (
      !decoded.length ||
      decoded.toString('base64').replace(/=+$/, '') !==
        content.replace(/=+$/, '')
    ) {
      throw new BadRequestException('Fișierul nu a putut fi citit corect.');
    }

    return decoded;
  }

  private parseOptionalId(value: string | undefined, fieldName: string) {
    const cleaned = cleanOptionalText(value);
    if (!cleaned) {
      return undefined;
    }

    const parsed = Number(cleaned);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} nu este validă.`);
    }

    return parsed;
  }

  private async resolveActivity(activityId?: number) {
    if (activityId === undefined || activityId === null) {
      return undefined;
    }

    if (!Number.isInteger(activityId) || activityId <= 0) {
      throw new BadRequestException('Activitatea nu este validă.');
    }

    const activity = await this.activitiesRepository.findOne({
      id: activityId,
    });
    if (!activity) {
      throw new NotFoundException('Activitatea nu există.');
    }

    return activity;
  }

  private async getVisibleDocument(user: CurrentUser, documentId: number) {
    const document = await this.documentsRepository.findOne({ id: documentId });
    if (!document) {
      throw new NotFoundException('Documentul financiar nu există.');
    }

    if (
      !this.canManageFinance(user) &&
      document.uploaderId !== user.id &&
      !(await this.isActivityCoordinator(user.id, document.activityId))
    ) {
      throw new ForbiddenException('Nu ai acces la acest document financiar.');
    }

    return document;
  }

  private async filterVisibleDocuments(
    user: CurrentUser,
    documents: FinancialDocument[],
  ) {
    if (this.canManageFinance(user)) {
      return documents;
    }

    const activityIds = documents
      .map((document) => document.activityId)
      .filter((activityId): activityId is number => Boolean(activityId));
    const coordinatedActivityIds = await this.getCoordinatedActivityIds(
      user.id,
      activityIds,
    );

    return documents.filter(
      (document) =>
        document.uploaderId === user.id ||
        Boolean(
          document.activityId &&
          coordinatedActivityIds.has(document.activityId),
        ),
    );
  }

  private async isActivityCoordinator(
    userId: number,
    activityId: number | null | undefined,
  ) {
    if (!activityId) {
      return false;
    }

    const activity = await this.activitiesRepository.findOne({
      id: activityId,
    });
    return activity?.coordinatorId === userId;
  }

  private async getCoordinatedActivityIds(
    userId: number,
    activityIds: number[],
  ) {
    const uniqueIds = Array.from(new Set(activityIds));
    if (!uniqueIds.length) {
      return new Set<number>();
    }

    const activities = await this.activitiesRepository.find({
      id: { $in: uniqueIds },
      coordinatorId: userId,
    });
    return new Set(activities.map((activity) => activity.id));
  }

  private canManageFinance(user: CurrentUser) {
    return (
      user.roles.includes(UserRole.FinanceManager) ||
      user.roles.includes(UserRole.SuperAdmin)
    );
  }

  private async recordAudit(
    documentId: number,
    actorId: number,
    fromStatus: FinancialDocumentStatus | undefined,
    toStatus: FinancialDocumentStatus,
    comment?: string,
  ) {
    const audit = this.auditsRepository.create({
      documentId,
      actorId,
      fromStatus,
      toStatus,
      comment: cleanOptionalText(comment),
    });

    this.em.persist(audit);
    await this.em.flush();
  }

  private async ensureSettings() {
    const existing = await this.settingsRepository.findOne({ id: SETTINGS_ID });
    if (existing) {
      return existing;
    }

    const settings = this.settingsRepository.create({
      id: SETTINGS_ID,
      keezHandoffMode: KeezHandoffMode.ReviewFirst,
    });
    this.em.persist(settings);
    await this.em.flush();

    return settings;
  }

  private async serializeDocuments(
    documents: FinancialDocument[],
  ): Promise<FinancialDocumentDto[]> {
    const uploaderNames = await this.getUserNames(
      documents.map((document) => document.uploaderId),
    );
    const activities = await this.getActivities(
      documents
        .map((document) => document.activityId)
        .filter((activityId): activityId is number => Boolean(activityId)),
    );
    const latestFailedAttempts = await this.getLatestFailedHandoffAttempts(
      documents.map((document) => document.id),
    );

    return documents.map((document) => ({
      id: document.id,
      uploaderId: document.uploaderId,
      uploaderName:
        uploaderNames.get(document.uploaderId) ??
        `Utilizator #${document.uploaderId}`,
      status: document.status,
      originalFilename: document.originalFilename,
      contentType: document.contentType,
      fileSize: document.fileSize,
      checksumSha256: document.checksumSha256,
      activityId: document.activityId ?? undefined,
      activityTitle: document.activityId
        ? activities.get(document.activityId)?.title
        : undefined,
      activityType: document.activityId
        ? activities.get(document.activityId)?.type
        : undefined,
      activityName: document.activityName ?? undefined,
      notes: document.notes ?? undefined,
      reviewerNotes: document.reviewerNotes ?? undefined,
      keezExternalId: document.keezExternalId ?? undefined,
      keezSubmittedAt: document.keezSubmittedAt?.toISOString(),
      lastHandoffError:
        latestFailedAttempts.get(document.id)?.errorMessage ?? undefined,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    }));
  }

  private async getLatestFailedHandoffAttempts(documentIds: number[]) {
    const uniqueIds = Array.from(new Set(documentIds));
    if (!uniqueIds.length) {
      return new Map<number, FinancialDocumentHandoffAttempt>();
    }

    const attempts = await this.handoffAttemptsRepository.find(
      {
        documentId: { $in: uniqueIds },
        status: 'failed',
      },
      { orderBy: { createdAt: 'desc' } },
    );
    const latestAttempts = new Map<number, FinancialDocumentHandoffAttempt>();
    for (const attempt of attempts) {
      if (!latestAttempts.has(attempt.documentId)) {
        latestAttempts.set(attempt.documentId, attempt);
      }
    }

    return latestAttempts;
  }

  private async getActivities(activityIds: number[]) {
    const uniqueIds = Array.from(new Set(activityIds));
    if (!uniqueIds.length) {
      return new Map<number, Activity>();
    }

    const activities = await this.activitiesRepository.find({
      id: { $in: uniqueIds },
    });
    return new Map(activities.map((activity) => [activity.id, activity]));
  }

  private async getUserNames(userIds: number[]) {
    const uniqueIds = Array.from(new Set(userIds));
    if (!uniqueIds.length) {
      return new Map<number, string>();
    }

    const users = await this.usersRepository.find({ id: { $in: uniqueIds } });
    return new Map(users.map((user) => [user.id, user.displayName]));
  }
}

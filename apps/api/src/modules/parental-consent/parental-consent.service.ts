import {
  PARENTAL_CONSENT_SCHEMA_VERSION,
  branchCodes,
  canonicalJson,
  changedPaths,
  createEmptyOrganizerDraft,
  createRepresentativeOrganizerDraft,
  hasBlockingIssues,
  validateOrganizerDraft,
  validateTemplateDocument,
  type BranchCode,
  type LayoutSettings,
  type OrganizerDraft,
  type OrganizationSettings,
  type TemplateDocument,
} from '@scouts-cluj/parental-consent-schema';
import { EntityManager, EntityRepository, LockMode } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { ActivityDepartment } from '../activities/entities/activity-department.enum';
import { Activity } from '../activities/entities/activity.entity';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';
import type {
  CreateParentalConsentAssetDto,
  CreateParentalConsentTemplateDto,
  UpdateParentalConsentDraftDto,
  UpdateParentalConsentOrganizationDto,
  UpdateParentalConsentTemplateDto,
} from './dto/parental-consent.dto';
import { ParentalConsentActivityDraft } from './entities/parental-consent-activity-draft.entity';
import { ParentalConsentAsset } from './entities/parental-consent-asset.entity';
import { ParentalConsentDocument } from './entities/parental-consent-document.entity';
import { ParentalConsentOrganizationSettings } from './entities/parental-consent-organization-settings.entity';
import { ParentalConsentPublication } from './entities/parental-consent-publication.entity';
import { ParentalConsentTemplateVersion } from './entities/parental-consent-template-version.entity';
import {
  ParentalConsentBranch,
  ParentalConsentPublicationStatus,
  ParentalConsentTemplateStatus,
} from './entities/parental-consent.enums';
import {
  ParentalConsentRendererService,
  type ParentalConsentRenderInput,
} from './parental-consent-renderer.service';

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const acceptedAssetTypes = new Set(['image/png', 'image/jpeg']);
const draftTemplateStatus: string = ParentalConsentTemplateStatus.Draft;

const cleanRequired = (value: unknown, label: string, max = 255) => {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (!cleaned) throw new BadRequestException(`${label} este obligatoriu.`);
  return cleaned.slice(0, max);
};

const cleanOptional = (value: unknown, max = 255) => {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  return cleaned ? cleaned.slice(0, max) : null;
};

const asBranch = (value: string): BranchCode => {
  if (!branchCodes.includes(value as BranchCode)) {
    throw new BadRequestException('Ramura nu este validă.');
  }
  return value as BranchCode;
};

const deepMerge = (base: unknown, patch: unknown): unknown => {
  if (Array.isArray(patch)) return structuredClone(patch);
  if (!patch || typeof patch !== 'object') return patch;
  const source =
    base && typeof base === 'object' && !Array.isArray(base) ? base : {};
  const output = { ...(source as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    output[key] = deepMerge(output[key], value);
  }
  return output;
};

@Injectable()
export class ParentalConsentService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: EntityRepository<Activity>,
    @InjectRepository(ParentalConsentOrganizationSettings)
    private readonly organizationRepository: EntityRepository<ParentalConsentOrganizationSettings>,
    @InjectRepository(ParentalConsentAsset)
    private readonly assetRepository: EntityRepository<ParentalConsentAsset>,
    @InjectRepository(ParentalConsentTemplateVersion)
    private readonly templateRepository: EntityRepository<ParentalConsentTemplateVersion>,
    @InjectRepository(ParentalConsentActivityDraft)
    private readonly draftRepository: EntityRepository<ParentalConsentActivityDraft>,
    @InjectRepository(ParentalConsentPublication)
    private readonly publicationRepository: EntityRepository<ParentalConsentPublication>,
    @InjectRepository(ParentalConsentDocument)
    private readonly documentRepository: EntityRepository<ParentalConsentDocument>,
    @Inject(EntityManager) private readonly em: EntityManager,
    private readonly auditService: AuditService,
    private readonly renderer: ParentalConsentRendererService,
  ) {}

  async getOrganization(user: CurrentUser) {
    this.assertTemplateEditor(user);
    return this.serializeOrganization(await this.requireOrganization());
  }

  async updateOrganization(
    user: CurrentUser,
    input: UpdateParentalConsentOrganizationDto,
  ) {
    this.assertSuperAdmin(user);
    const organization = await this.requireOrganization();
    if (input.revision !== organization.revision) {
      throw new ConflictException(
        'Setările organizației au fost modificate între timp. Reîncarcă pagina.',
      );
    }
    const update = {
      name: cleanRequired(input.name, 'Numele organizației'),
      legalName: cleanOptional(input.legalName),
      address: cleanRequired(input.address, 'Adresa', 2000),
      email: cleanRequired(input.email, 'Adresa de e-mail'),
      phone: cleanRequired(input.phone, 'Telefonul'),
      website: cleanOptional(input.website),
      revision: organization.revision + 1,
      updatedById: user.id,
      updatedAt: new Date(),
    };
    const affected = await this.organizationRepository.nativeUpdate(
      { id: organization.id, revision: input.revision },
      update,
    );
    if (affected !== 1) {
      throw new ConflictException(
        'Setările organizației au fost modificate între timp. Reîncarcă pagina.',
      );
    }
    Object.assign(organization, update);
    await this.auditService.record({
      actorId: user.id,
      action: 'parental_consent.organization.updated',
      entityType: 'parental_consent_organization_settings',
      entityId: organization.id,
      metadata: { revision: organization.revision },
    });
    return this.serializeOrganization(organization);
  }

  async listAssets(user: CurrentUser) {
    this.assertTemplateEditor(user);
    const assets = await this.assetRepository.findAll({
      orderBy: { createdAt: 'asc' },
    });
    return assets.map((asset) => this.serializeAsset(asset));
  }

  async getAssetFile(user: CurrentUser, assetId: number) {
    this.assertTemplateEditor(user);
    const asset = await this.requireAsset(assetId);
    return { ...this.serializeAsset(asset), fileData: asset.fileData };
  }

  async createAsset(user: CurrentUser, input: CreateParentalConsentAssetDto) {
    this.assertSuperAdmin(user);
    if (!acceptedAssetTypes.has(input.contentType)) {
      throw new BadRequestException(
        'Sunt acceptate doar imagini PNG sau JPEG.',
      );
    }
    let fileData: Buffer;
    try {
      fileData = Buffer.from(input.dataBase64, 'base64');
    } catch {
      throw new BadRequestException(
        'Conținutul imaginii nu este Base64 valid.',
      );
    }
    if (!fileData.length || fileData.length > MAX_ASSET_BYTES) {
      throw new BadRequestException('Imaginea trebuie să aibă maximum 5 MB.');
    }
    const metadata = await sharp(fileData)
      .metadata()
      .catch(() => undefined);
    if (
      !metadata?.width ||
      !metadata.height ||
      metadata.width > 8000 ||
      metadata.height > 8000
    ) {
      throw new BadRequestException(
        'Imaginea nu este validă sau depășește 8000×8000 px.',
      );
    }
    if (
      (input.contentType === 'image/png' && metadata.format !== 'png') ||
      (input.contentType === 'image/jpeg' && metadata.format !== 'jpeg')
    ) {
      throw new BadRequestException(
        'Tipul declarat nu corespunde conținutului imaginii.',
      );
    }
    const checksumSha256 = createHash('sha256').update(fileData).digest('hex');
    const duplicate = await this.assetRepository.findOne({ checksumSha256 });
    if (duplicate) return this.serializeAsset(duplicate);
    const asset = this.assetRepository.create({
      name: cleanRequired(input.name, 'Numele asset-ului'),
      altText: cleanRequired(input.altText, 'Textul alternativ'),
      contentType: input.contentType,
      fileSize: fileData.length,
      width: metadata.width,
      height: metadata.height,
      checksumSha256,
      fileData,
      createdById: user.id,
    });
    this.em.persist(asset);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'parental_consent.asset.created',
      entityType: 'parental_consent_asset',
      entityId: asset.id,
      metadata: {
        checksumSha256,
        contentType: asset.contentType,
        fileSize: asset.fileSize,
      },
    });
    return this.serializeAsset(asset);
  }

  async deleteAsset(user: CurrentUser, assetId: number) {
    this.assertSuperAdmin(user);
    const asset = await this.requireAsset(assetId);
    const [templates, publications] = await Promise.all([
      this.templateRepository.findAll(),
      this.publicationRepository.findAll(),
    ]);
    const referenced =
      templates.some((template) =>
        this.referencesAsset(template.document, template.layout, assetId),
      ) ||
      publications.some((publication) =>
        this.referencesAsset(
          publication.templateSnapshot.document,
          publication.templateSnapshot.layout,
          assetId,
        ),
      );
    if (referenced) {
      throw new ConflictException(
        'Asset-ul este folosit de un template sau de o publicație și nu poate fi șters.',
      );
    }
    this.em.remove(asset);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'parental_consent.asset.deleted',
      entityType: 'parental_consent_asset',
      entityId: asset.id,
      metadata: { checksumSha256: asset.checksumSha256 },
    });
    return { deleted: true };
  }

  async listTemplates(user: CurrentUser) {
    this.assertTemplateEditor(user);
    const templates = await this.templateRepository.findAll({
      orderBy: { version: 'desc' },
    });
    return templates.map((template) => this.serializeTemplate(template));
  }

  async getTemplate(user: CurrentUser, templateId: number) {
    this.assertTemplateEditor(user);
    return this.serializeTemplate(await this.requireTemplate(templateId));
  }

  async createTemplate(
    user: CurrentUser,
    input: CreateParentalConsentTemplateDto,
  ) {
    this.assertTemplateEditor(user);
    const source = input.basedOnVersionId
      ? await this.requireTemplate(input.basedOnVersionId)
      : await this.templateRepository.findOne(
          { status: ParentalConsentTemplateStatus.Active },
          { orderBy: { version: 'desc' } },
        );
    const document = structuredClone(input.document ?? source?.document);
    const layout = structuredClone(input.layout ?? source?.layout);
    if (!document || !layout)
      throw new BadRequestException(
        'Template-ul are nevoie de document și layout.',
      );
    await this.assertValidTemplate(document, layout);
    const template = await this.em.transactional(async (tx) => {
      const repository = tx.getRepository(ParentalConsentTemplateVersion);
      const latest = await repository.findOne(
        {},
        { orderBy: { version: 'desc' }, lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      const created = repository.create({
        version: (latest?.version ?? 0) + 1,
        name: cleanRequired(input.name, 'Numele template-ului'),
        status: ParentalConsentTemplateStatus.Draft,
        schemaVersion: PARENTAL_CONSENT_SCHEMA_VERSION,
        document,
        layout,
        basedOnVersionId: source?.id ?? null,
        createdById: user.id,
      });
      tx.persist(created);
      await tx.flush();
      return created;
    });
    await this.recordTemplateAudit(user, template, 'created');
    return this.serializeTemplate(template);
  }

  async updateTemplate(
    user: CurrentUser,
    templateId: number,
    input: UpdateParentalConsentTemplateDto,
  ) {
    this.assertTemplateEditor(user);
    const template = await this.requireTemplate(templateId);
    if (template.status !== draftTemplateStatus) {
      throw new ConflictException(
        'Doar versiunile draft pot fi modificate. Clonează versiunea pentru a continua.',
      );
    }
    if (template.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictException(
        'Template-ul a fost modificat între timp. Reîncarcă versiunea curentă.',
      );
    }
    const document = structuredClone(input.document ?? template.document);
    const layout = structuredClone(input.layout ?? template.layout);
    await this.assertValidTemplate(document, layout);
    const update = {
      name:
        input.name !== undefined
          ? cleanRequired(input.name, 'Numele template-ului')
          : template.name,
      document,
      layout,
      updatedAt: new Date(),
    };
    const affected = await this.templateRepository.nativeUpdate(
      {
        id: template.id,
        status: ParentalConsentTemplateStatus.Draft,
        updatedAt: template.updatedAt,
      },
      update,
    );
    if (affected !== 1) {
      throw new ConflictException(
        'Template-ul a fost modificat între timp. Reîncarcă versiunea curentă.',
      );
    }
    Object.assign(template, update);
    await this.recordTemplateAudit(user, template, 'updated');
    return this.serializeTemplate(template);
  }

  async activateTemplate(user: CurrentUser, templateId: number) {
    this.assertSuperAdmin(user);
    const result = await this.em.transactional(async (tx) => {
      const repository = tx.getRepository(ParentalConsentTemplateVersion);
      const target = await repository.findOne({ id: templateId });
      if (!target) throw new NotFoundException('Versiunea template nu există.');
      await this.assertValidTemplate(target.document, target.layout);
      const active = await repository.findOne({
        status: ParentalConsentTemplateStatus.Active,
      });
      if (active?.id === target.id) return target;
      if (active) {
        active.status = ParentalConsentTemplateStatus.Archived;
        await tx.flush();
      }
      target.status = ParentalConsentTemplateStatus.Active;
      target.activatedAt = new Date();
      target.activatedById = user.id;
      await tx.flush();
      return target;
    });
    await this.recordTemplateAudit(user, result, 'activated');
    return this.serializeTemplate(result);
  }

  async previewTemplate(
    user: CurrentUser,
    templateId: number,
    branchValue: string,
  ) {
    this.assertTemplateEditor(user);
    const template = await this.requireTemplate(templateId);
    const branch = asBranch(branchValue);
    const [organization, assets] = await Promise.all([
      this.requireOrganization(),
      this.assetRepository.findAll(),
    ]);
    return this.renderer.renderPdf({
      activityId: 0,
      templateVersionId: template.id,
      branch,
      document: template.document,
      layout: template.layout,
      draft: createRepresentativeOrganizerDraft(),
      organization: this.organizationSnapshot(organization),
      assets,
    });
  }

  async getDraft(user: CurrentUser, activityId: number) {
    const activity = await this.requireManagedActivity(user, activityId);
    let draft = await this.draftRepository.findOne({ activityId });
    if (!draft) draft = await this.createDraft(user, activity);
    return this.serializeDraft(draft);
  }

  async updateDraft(
    user: CurrentUser,
    activityId: number,
    input: UpdateParentalConsentDraftDto,
  ) {
    const activity = await this.requireManagedActivity(user, activityId);
    let draft = await this.draftRepository.findOne({ activityId });
    if (!draft) draft = await this.createDraft(user, activity);
    if (input.revision !== draft.revision) {
      throw new ConflictException(
        'Configurația a fost modificată între timp. Reîncarcă activitatea.',
      );
    }
    const merged = deepMerge(draft.data, input.data) as OrganizerDraft;
    const issues = this.validateDraftSafely(merged);
    const update = {
      data: merged,
      schemaVersion: PARENTAL_CONSENT_SCHEMA_VERSION,
      revision: draft.revision + 1,
      updatedById: user.id,
      updatedAt: new Date(),
    };
    const affected = await this.draftRepository.nativeUpdate(
      { id: draft.id, revision: input.revision },
      update,
    );
    if (affected !== 1) {
      throw new ConflictException(
        'Configurația a fost modificată între timp. Reîncarcă activitatea.',
      );
    }
    Object.assign(draft, update);
    await this.auditService.record({
      actorId: user.id,
      action: 'parental_consent.draft.updated',
      entityType: 'parental_consent_activity_draft',
      entityId: draft.id,
      activityId,
      metadata: {
        revision: draft.revision,
        errorCount: issues.filter((entry) => entry.severity === 'error').length,
        warningCount: issues.filter((entry) => entry.severity === 'warning')
          .length,
      },
    });
    return this.serializeDraft(draft);
  }

  async validateDraft(user: CurrentUser, activityId: number) {
    const draft = await this.getDraftEntity(user, activityId);
    return { issues: this.validateDraftSafely(draft.data) };
  }

  async previewBranch(
    user: CurrentUser,
    activityId: number,
    branchValue: string,
  ) {
    const draft = await this.getDraftEntity(user, activityId);
    const branch = asBranch(branchValue);
    if (!draft.data.branches[branch]?.enabled) {
      throw new BadRequestException(
        'Ramura nu este activă în configurația acordului.',
      );
    }
    const issues = this.validateDraftSafely(draft.data);
    if (hasBlockingIssues(issues)) {
      throw new BadRequestException({
        message: 'Configurația conține erori care blochează preview-ul.',
        issues,
      });
    }
    const input = await this.buildRenderInput(activityId, draft, branch);
    const pdf = await this.renderer.renderPdf(input);
    await this.auditService.record({
      actorId: user.id,
      action: 'parental_consent.preview.generated',
      entityType: 'parental_consent_activity_draft',
      entityId: draft.id,
      activityId,
      metadata: { revision: draft.revision, branch },
    });
    return {
      pdf,
      filename: this.renderer.safeFilename(draft.data.general.title, branch),
    };
  }

  async publish(user: CurrentUser, activityId: number) {
    const draft = await this.getDraftEntity(user, activityId);
    const issues = this.validateDraftSafely(draft.data);
    if (hasBlockingIssues(issues)) {
      throw new BadRequestException({
        message: 'Configurația conține erori care blochează publicarea.',
        issues,
      });
    }
    const [template, organization, assets] = await Promise.all([
      this.requireActiveTemplate(),
      this.requireOrganization(),
      this.assetRepository.findAll(),
    ]);
    this.assertPublishableOrganization(organization);
    await this.assertValidTemplate(template.document, template.layout);
    const enabledBranches = branchCodes.filter(
      (branch) => draft.data.branches[branch].enabled,
    );
    const renderInputs: ParentalConsentRenderInput[] = enabledBranches.map(
      (branch) => ({
        activityId,
        templateVersionId: template.id,
        branch,
        document: template.document,
        layout: template.layout,
        draft: structuredClone(draft.data),
        organization: this.organizationSnapshot(organization),
        assets,
      }),
    );
    const publicationReference = createHash('sha256')
      .update(
        canonicalJson({
          activityId,
          revision: draft.revision,
          inputs: renderInputs.map((input) => ({
            branch: input.branch,
            templateVersionId: input.templateVersionId,
            organization: input.organization,
            draft: input.draft,
          })),
        }),
      )
      .digest('hex')
      .slice(0, 16);
    const rendered = await Promise.all(
      renderInputs.map(async (input) => {
        const pdf = await this.renderer.renderPdf({
          ...input,
          publicationReference,
        });
        return {
          branch: input.branch,
          pdf,
          filename: this.renderer.safeFilename(
            draft.data.general.title,
            input.branch,
          ),
          checksumSha256: createHash('sha256').update(pdf).digest('hex'),
        };
      }),
    );
    const templateSnapshot = this.templateSnapshot(template);
    const organizationSnapshot = this.organizationSnapshot(organization);

    const publication = await this.em.transactional(async (tx) => {
      const drafts = tx.getRepository(ParentalConsentActivityDraft);
      const templates = tx.getRepository(ParentalConsentTemplateVersion);
      const publications = tx.getRepository(ParentalConsentPublication);
      const documents = tx.getRepository(ParentalConsentDocument);
      const currentDraft = await drafts.findOne({ id: draft.id });
      const currentTemplate = await templates.findOne({
        status: ParentalConsentTemplateStatus.Active,
      });
      const currentOrganization = await tx
        .getRepository(ParentalConsentOrganizationSettings)
        .findOne({ id: organization.id });
      if (
        !currentDraft ||
        currentDraft.revision !== draft.revision ||
        currentTemplate?.id !== template.id ||
        currentOrganization?.revision !== organization.revision
      ) {
        throw new ConflictException(
          'Draftul, template-ul activ sau identitatea organizației s-a modificat în timpul generării. Reîncearcă publicarea.',
        );
      }
      const previous = await publications.findOne({
        activityId,
        status: ParentalConsentPublicationStatus.Active,
      });
      if (previous) {
        previous.status = ParentalConsentPublicationStatus.Archived;
        previous.archivedAt = new Date();
        await tx.flush();
      }
      const created = publications.create({
        reference: publicationReference,
        activityId,
        status: ParentalConsentPublicationStatus.Active,
        templateVersionId: template.id,
        draftRevision: draft.revision,
        draftSnapshot: structuredClone(draft.data),
        organizationSnapshot,
        templateSnapshot,
        publishedById: user.id,
      });
      tx.persist(created);
      await tx.flush();
      rendered.forEach((file) =>
        tx.persist(
          documents.create({
            publicationId: created.id,
            branch: file.branch as ParentalConsentBranch,
            filename: file.filename,
            contentType: 'application/pdf',
            fileSize: file.pdf.length,
            checksumSha256: file.checksumSha256,
            fileData: file.pdf,
          }),
        ),
      );
      await tx.flush();
      return created;
    });
    await this.auditService.record({
      actorId: user.id,
      action: 'parental_consent.publication.created',
      entityType: 'parental_consent_publication',
      entityId: publication.id,
      activityId,
      metadata: {
        draftRevision: draft.revision,
        templateVersionId: template.id,
        branches: enabledBranches,
        publicationReference,
      },
    });
    return this.getCurrentPublication(user, activityId);
  }

  async getCurrentPublication(_user: CurrentUser, activityId: number) {
    await this.requireReadableActivity(activityId);
    const publication = await this.publicationRepository.findOne({
      activityId,
      status: ParentalConsentPublicationStatus.Active,
    });
    return publication ? this.serializePublication(publication) : null;
  }

  async listHistory(user: CurrentUser, activityId: number) {
    await this.requireManagedActivity(user, activityId);
    const publications = await this.publicationRepository.find(
      { activityId },
      { orderBy: { createdAt: 'desc' } },
    );
    return Promise.all(
      publications.map((publication) => this.serializePublication(publication)),
    );
  }

  async downloadCurrent(
    user: CurrentUser,
    activityId: number,
    documentId: number,
  ) {
    await this.requireReadableActivity(activityId);
    const document = await this.documentRepository.findOne({ id: documentId });
    if (!document) throw new NotFoundException('Documentul nu există.');
    const publication = await this.publicationRepository.findOne({
      id: document.publicationId,
      activityId,
      status: ParentalConsentPublicationStatus.Active,
    });
    if (!publication)
      throw new NotFoundException('Documentul publicat nu există.');
    await this.recordDownload(user, publication, document);
    return document;
  }

  async downloadHistorical(
    user: CurrentUser,
    activityId: number,
    publicationId: number,
    documentId: number,
  ) {
    await this.requireManagedActivity(user, activityId);
    const publication = await this.publicationRepository.findOne({
      id: publicationId,
      activityId,
    });
    const document = publication
      ? await this.documentRepository.findOne({ id: documentId, publicationId })
      : null;
    if (!publication || !document)
      throw new NotFoundException('Documentul publicat nu există.');
    await this.recordDownload(user, publication, document);
    return document;
  }

  private async createDraft(user: CurrentUser, activity: Activity) {
    const data = createEmptyOrganizerDraft();
    data.general.title = activity.title;
    data.general.location = activity.location ?? '';
    data.general.startDate =
      activity.startDate?.toISOString().slice(0, 10) ?? '';
    data.general.endDate = activity.endDate?.toISOString().slice(0, 10) ?? '';
    const draft = this.draftRepository.create({
      activityId: activity.id,
      schemaVersion: PARENTAL_CONSENT_SCHEMA_VERSION,
      revision: 1,
      data,
      createdById: user.id,
      updatedById: user.id,
    });
    this.em.persist(draft);
    await this.em.flush();
    return draft;
  }

  private async getDraftEntity(user: CurrentUser, activityId: number) {
    const activity = await this.requireManagedActivity(user, activityId);
    return (
      (await this.draftRepository.findOne({ activityId })) ??
      this.createDraft(user, activity)
    );
  }

  private async buildRenderInput(
    activityId: number,
    draft: ParentalConsentActivityDraft,
    branch: BranchCode,
  ): Promise<ParentalConsentRenderInput> {
    const [template, organization, assets] = await Promise.all([
      this.requireActiveTemplate(),
      this.requireOrganization(),
      this.assetRepository.findAll(),
    ]);
    await this.assertValidTemplate(template.document, template.layout);
    return {
      activityId,
      templateVersionId: template.id,
      branch,
      document: template.document,
      layout: template.layout,
      draft: structuredClone(draft.data),
      organization: this.organizationSnapshot(organization),
      assets,
    };
  }

  private async serializeDraft(draft: ParentalConsentActivityDraft) {
    const publication = await this.publicationRepository.findOne({
      activityId: draft.activityId,
      status: ParentalConsentPublicationStatus.Active,
    });
    return {
      id: draft.id,
      activityId: draft.activityId,
      schemaVersion: draft.schemaVersion,
      revision: draft.revision,
      data: draft.data,
      issues: this.validateDraftSafely(draft.data),
      changedPaths: publication
        ? changedPaths(publication.draftSnapshot, draft.data)
        : [],
      hasPublishedVersion: Boolean(publication),
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  private validateDraftSafely(data: OrganizerDraft) {
    try {
      return validateOrganizerDraft(data);
    } catch {
      return [
        {
          path: '$',
          code: 'invalid_draft',
          message: 'Structura configurației nu este validă.',
          severity: 'error' as const,
        },
      ];
    }
  }

  private async serializePublication(publication: ParentalConsentPublication) {
    const documents = await this.documentRepository.find(
      { publicationId: publication.id },
      { orderBy: { branch: 'asc' } },
    );
    return {
      id: publication.id,
      reference: publication.reference,
      activityId: publication.activityId,
      status: publication.status,
      templateVersionId: publication.templateVersionId,
      templateVersion: publication.templateSnapshot.version,
      draftRevision: publication.draftRevision,
      publishedById: publication.publishedById,
      createdAt: publication.createdAt.toISOString(),
      archivedAt: publication.archivedAt?.toISOString(),
      documents: documents.map((document) => ({
        id: document.id,
        branch: document.branch,
        filename: document.filename,
        contentType: document.contentType,
        fileSize: document.fileSize,
        checksumSha256: document.checksumSha256,
      })),
    };
  }

  private serializeTemplate(template: ParentalConsentTemplateVersion) {
    return {
      id: template.id,
      version: template.version,
      name: template.name,
      status: template.status,
      schemaVersion: template.schemaVersion,
      document: template.document,
      layout: template.layout,
      basedOnVersionId: template.basedOnVersionId ?? undefined,
      createdById: template.createdById ?? undefined,
      activatedById: template.activatedById ?? undefined,
      activatedAt: template.activatedAt?.toISOString(),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  private templateSnapshot(template: ParentalConsentTemplateVersion) {
    return {
      id: template.id,
      version: template.version,
      name: template.name,
      schemaVersion: template.schemaVersion,
      document: structuredClone(template.document),
      layout: structuredClone(template.layout),
    };
  }

  private serializeOrganization(
    organization: ParentalConsentOrganizationSettings,
  ) {
    return {
      ...this.organizationSnapshot(organization),
      revision: organization.revision,
      updatedAt: organization.updatedAt.toISOString(),
    };
  }

  private organizationSnapshot(
    organization: ParentalConsentOrganizationSettings,
  ): OrganizationSettings {
    return {
      name: organization.name,
      legalName: organization.legalName ?? undefined,
      address: organization.address,
      email: organization.email,
      phone: organization.phone,
      website: organization.website ?? undefined,
    };
  }

  private serializeAsset(asset: ParentalConsentAsset) {
    return {
      id: asset.id,
      name: asset.name,
      altText: asset.altText,
      contentType: asset.contentType,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
      checksumSha256: asset.checksumSha256,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  private async assertValidTemplate(
    document: TemplateDocument,
    layout: LayoutSettings,
  ) {
    const assets = await this.assetRepository.findAll();
    const approved = new Set(assets.map((asset) => asset.id));
    const issues = validateTemplateDocument(document, approved);
    if (layout.pageSize !== 'letter') {
      issues.push({
        path: 'layout.pageSize',
        code: 'invalid_page_size',
        message: 'MVP-ul acceptă doar formatul Letter.',
        severity: 'error',
      });
    }
    if (
      [
        layout.marginTopMm,
        layout.marginRightMm,
        layout.marginBottomMm,
        layout.marginLeftMm,
      ].some((margin) => !Number.isFinite(margin) || margin < 10 || margin > 35)
    ) {
      issues.push({
        path: 'layout',
        code: 'unsafe_margins',
        message: 'Marginile trebuie să fie între 10 și 35 mm.',
        severity: 'error',
      });
    }
    if (layout.headerAssetIds.some((assetId) => !approved.has(assetId))) {
      issues.push({
        path: 'layout.headerAssetIds',
        code: 'unknown_asset',
        message: 'Antetul conține un asset necunoscut.',
        severity: 'error',
      });
    }
    if (hasBlockingIssues(issues)) {
      throw new BadRequestException({
        message: 'Template-ul nu este valid.',
        issues,
      });
    }
  }

  private referencesAsset(
    document: TemplateDocument,
    layout: LayoutSettings,
    assetId: number,
  ) {
    return (
      layout.headerAssetIds.includes(assetId) ||
      canonicalJson(document).includes(`"assetId":${assetId}`)
    );
  }

  private async recordTemplateAudit(
    user: CurrentUser,
    template: ParentalConsentTemplateVersion,
    action: string,
  ) {
    await this.auditService.record({
      actorId: user.id,
      action: `parental_consent.template.${action}`,
      entityType: 'parental_consent_template_version',
      entityId: template.id,
      metadata: { version: template.version, status: template.status },
    });
  }

  private async recordDownload(
    user: CurrentUser,
    publication: ParentalConsentPublication,
    document: ParentalConsentDocument,
  ) {
    await this.auditService.record({
      actorId: user.id,
      action: 'parental_consent.document.downloaded',
      entityType: 'parental_consent_document',
      entityId: document.id,
      activityId: publication.activityId,
      metadata: {
        publicationId: publication.id,
        branch: document.branch,
        checksumSha256: document.checksumSha256,
      },
    });
  }

  private async requireOrganization() {
    const organization = await this.organizationRepository.findOne({ id: 1 });
    if (!organization)
      throw new ConflictException(
        'Identitatea Scouts Cluj nu este configurată.',
      );
    return organization;
  }

  private assertPublishableOrganization(
    organization: ParentalConsentOrganizationSettings,
  ) {
    const missing = [
      ['name', organization.name],
      ['address', organization.address],
      ['email', organization.email],
      ['phone', organization.phone],
    ].filter(([, value]) => !value?.trim());
    if (missing.length) {
      throw new BadRequestException({
        message:
          'Identitatea Scouts Cluj trebuie completată înainte de publicare.',
        issues: missing.map(([field]) => ({
          path: `organization.${field}`,
          code: 'required',
          message: 'Câmp obligatoriu pentru publicare.',
          severity: 'error',
        })),
      });
    }
  }

  private async requireAsset(assetId: number) {
    const asset = await this.assetRepository.findOne({ id: assetId });
    if (!asset) throw new NotFoundException('Asset-ul nu există.');
    return asset;
  }

  private async requireTemplate(templateId: number) {
    const template = await this.templateRepository.findOne({ id: templateId });
    if (!template) throw new NotFoundException('Versiunea template nu există.');
    return template;
  }

  private async requireActiveTemplate() {
    const template = await this.templateRepository.findOne({
      status: ParentalConsentTemplateStatus.Active,
    });
    if (!template)
      throw new ConflictException('Nu există un template parental activ.');
    return template;
  }

  private async requireReadableActivity(activityId: number) {
    const activity = await this.activityRepository.findOne({ id: activityId });
    if (!activity) throw new NotFoundException('Activitatea nu există.');
    if (!activity.departments.includes(ActivityDepartment.ParentalConsent)) {
      throw new NotFoundException(
        'Zona Acord parental nu este activă pentru această activitate.',
      );
    }
    return activity;
  }

  private async requireManagedActivity(user: CurrentUser, activityId: number) {
    const activity = await this.requireReadableActivity(activityId);
    if (
      activity.coordinatorId !== user.id &&
      !user.roles.includes(UserRole.SuperAdmin)
    ) {
      throw new ForbiddenException(
        'Nu poți administra acordul parental al acestei activități.',
      );
    }
    return activity;
  }

  private assertTemplateEditor(user: CurrentUser) {
    if (
      !user.roles.includes(UserRole.Admin) &&
      !user.roles.includes(UserRole.SuperAdmin)
    ) {
      throw new ForbiddenException(
        'Nu ai acces la administrarea template-urilor parentale.',
      );
    }
  }

  private assertSuperAdmin(user: CurrentUser) {
    if (!user.roles.includes(UserRole.SuperAdmin)) {
      throw new ForbiddenException('Operațiunea necesită rolul super_admin.');
    }
  }
}

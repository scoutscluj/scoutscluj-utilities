jest.mock('@mikro-orm/core', () => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of [
    'array',
    'autoincrement',
    'columnType',
    'default',
    'fieldName',
    'length',
    'nativeEnumName',
    'nullable',
    'onCreate',
    'onUpdate',
    'primary',
    'unique',
  ]) {
    chain[method] = jest.fn(() => chain);
  }
  const p = {
    boolean: jest.fn(() => chain),
    datetime: jest.fn(() => chain),
    enum: jest.fn(() => chain),
    integer: jest.fn(() => chain),
    json: jest.fn(() => chain),
    string: jest.fn(() => chain),
    type: jest.fn(() => chain),
  };
  return {
    EntityManager: class EntityManager {},
    EntityRepository: class EntityRepository {},
    LockMode: { PESSIMISTIC_WRITE: 'pessimistic_write' },
    defineEntity: <T>(entity: T): T => entity,
    p,
  };
});

jest.mock('@mikro-orm/nestjs', () => ({
  InjectRepository: jest.fn(() => () => undefined),
}));

import {
  createRepresentativeOrganizerDraft,
  defaultLayoutSettings,
} from '@scouts-cluj/parental-consent-schema';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ActivityDepartment } from '../activities/entities/activity-department.enum';
import type { CreateAuditEntryInput } from '../audit/dto/audit.dto';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';
import { ParentalConsentTemplateStatus } from './entities/parental-consent.enums';
import { ParentalConsentService } from './parental-consent.service';

const user = (id: number, roles: UserRole[] = []): CurrentUser => ({
  id,
  displayName: `User ${id}`,
  roles,
});

type RepositoryValue = Record<string, unknown>;

const repository = () => ({
  findOne: jest.fn(),
  findAll: jest.fn().mockResolvedValue([]),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((value: RepositoryValue): RepositoryValue => value),
  nativeUpdate: jest.fn().mockResolvedValue(1),
});

const setup = () => {
  const activityRepository = repository();
  const organizationRepository = repository();
  const assetRepository = repository();
  const templateRepository = repository();
  const draftRepository = repository();
  const publicationRepository = repository();
  const documentRepository = repository();
  const em = {
    persist: jest.fn(),
    remove: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    transactional: jest.fn(),
  };
  const auditInputs: CreateAuditEntryInput[] = [];
  const auditService = {
    record: jest.fn((input: CreateAuditEntryInput) => {
      auditInputs.push(input);
      return Promise.resolve();
    }),
  };
  const renderer = { renderPdf: jest.fn(), safeFilename: jest.fn() };
  const service = new ParentalConsentService(
    activityRepository as never,
    organizationRepository as never,
    assetRepository as never,
    templateRepository as never,
    draftRepository as never,
    publicationRepository as never,
    documentRepository as never,
    em as never,
    auditService as never,
    renderer as never,
  );
  return {
    service,
    activityRepository,
    organizationRepository,
    assetRepository,
    templateRepository,
    draftRepository,
    publicationRepository,
    documentRepository,
    em,
    auditService,
    auditInputs,
  };
};

const managedActivity = (coordinatorId = 1) => ({
  id: 10,
  title: 'Cântul Vâlvelor',
  departments: [ActivityDepartment.Administrative],
  coordinatorId,
});

describe('ParentalConsentService', () => {
  it('requires super_admin for approved-asset writes', async () => {
    const { service } = setup();
    await expect(
      service.createAsset(user(1, [UserRole.Admin]), {
        name: 'Logo',
        altText: 'Logo',
        contentType: 'image/png',
        dataBase64: 'AA==',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validates image bytes, computes SHA-256, and audits an asset creation', async () => {
    const { service, assetRepository, auditService, auditInputs } = setup();
    const fileData = await readFile(
      join(__dirname, 'seed-assets', 'scouts-cluj.png'),
    );
    assetRepository.findOne.mockResolvedValue(null);
    assetRepository.create.mockImplementation((value) => ({
      ...value,
      id: 22,
      createdAt: new Date('2026-08-04T12:00:00Z'),
    }));

    const result = await service.createAsset(user(1, [UserRole.SuperAdmin]), {
      name: 'Scouts Cluj',
      altText: 'Sigla Scouts Cluj',
      contentType: 'image/png',
      dataBase64: fileData.toString('base64'),
    });

    expect(result.checksumSha256).toBe(
      createHash('sha256').update(fileData).digest('hex'),
    );
    expect(result.fileSize).toBe(fileData.length);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'parental_consent.asset.created',
      }),
    );
    expect(auditInputs.at(-1)?.metadata).not.toHaveProperty('fileData');
  });

  it('protects assets referenced by any template version', async () => {
    const {
      service,
      assetRepository,
      templateRepository,
      publicationRepository,
      em,
    } = setup();
    assetRepository.findOne.mockResolvedValue({ id: 8, checksumSha256: 'abc' });
    templateRepository.findAll.mockResolvedValue([
      {
        status: ParentalConsentTemplateStatus.Archived,
        document: {
          type: 'doc',
          content: [{ type: 'asset', assetId: 8, alt: 'logo' }],
        },
        layout: { ...defaultLayoutSettings, headerAssetIds: [] },
      },
    ]);
    publicationRepository.findAll.mockResolvedValue([]);

    await expect(
      service.deleteAsset(user(1, [UserRole.SuperAdmin]), 8),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(em.remove).not.toHaveBeenCalled();
  });

  it('rejects stale draft revisions before applying a partial save', async () => {
    const { service, activityRepository, draftRepository } = setup();
    activityRepository.findOne.mockResolvedValue(managedActivity());
    draftRepository.findOne.mockResolvedValue({
      id: 5,
      activityId: 10,
      revision: 4,
      data: createRepresentativeOrganizerDraft(),
    });

    await expect(
      service.updateDraft(user(1), 10, {
        revision: 3,
        data: { general: { title: 'Nou' } },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('atomically merges partial draft saves and keeps audit metadata payload-free', async () => {
    const {
      service,
      activityRepository,
      draftRepository,
      publicationRepository,
      auditService,
      auditInputs,
    } = setup();
    const original = createRepresentativeOrganizerDraft();
    const draft = {
      id: 5,
      activityId: 10,
      schemaVersion: 1,
      revision: 4,
      data: original,
      createdAt: new Date('2026-08-04T10:00:00Z'),
      updatedAt: new Date('2026-08-04T11:00:00Z'),
    };
    activityRepository.findOne.mockResolvedValue(managedActivity());
    draftRepository.findOne.mockResolvedValue(draft);
    publicationRepository.findOne.mockResolvedValue(null);

    const result = await service.updateDraft(user(1), 10, {
      revision: 4,
      data: { general: { title: 'Titlu nou' } },
    });

    expect(result.revision).toBe(5);
    expect(result.data.general.title).toBe('Titlu nou');
    expect(result.data.general.location).toBe(original.general.location);
    expect(draftRepository.nativeUpdate).toHaveBeenCalledWith(
      { id: 5, revision: 4 },
      expect.objectContaining({ revision: 5 }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'parental_consent.draft.updated',
      }),
    );
    expect(auditInputs.at(-1)?.metadata).not.toHaveProperty('data');
  });

  it('prevents ordinary users from reading the mutable draft', async () => {
    const { service, activityRepository } = setup();
    activityRepository.findOne.mockResolvedValue(managedActivity(99));
    await expect(service.getDraft(user(2), 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('exposes parental consent as a feature of the administrative department', async () => {
    const { service, activityRepository, publicationRepository } = setup();
    activityRepository.findOne.mockResolvedValue({
      ...managedActivity(),
      departments: [ActivityDepartment.Administrative],
    });
    publicationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.getCurrentPublication(user(2), 10),
    ).resolves.toBeNull();
  });
});

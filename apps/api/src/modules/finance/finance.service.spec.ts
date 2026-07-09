jest.mock('@mikro-orm/core', () => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of [
    'array',
    'autoincrement',
    'default',
    'deleteRule',
    'fieldName',
    'inversedBy',
    'mappedBy',
    'nativeEnumName',
    'nullable',
    'onCreate',
    'onUpdate',
    'owner',
    'primary',
    'unique',
    'updateRule',
  ]) {
    chain[method] = jest.fn(() => chain);
  }

  const p = {
    boolean: jest.fn(() => chain),
    datetime: jest.fn(() => chain),
    enum: jest.fn(() => chain),
    integer: jest.fn(() => chain),
    json: jest.fn(() => chain),
    manyToOne: jest.fn(() => chain),
    oneToMany: jest.fn(() => chain),
    oneToOne: jest.fn(() => chain),
    string: jest.fn(() => chain),
    type: jest.fn(() => chain),
  };

  return {
    EntityManager: class EntityManager {},
    defineEntity: <T>(entity: T): T => entity,
    p,
  };
});

jest.mock('@mikro-orm/nestjs', () => ({
  InjectRepository: jest.fn(() => () => undefined),
}));

import { AuditService } from '../audit/audit.service';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';
import { FinancialDocumentDto } from './dto/finance.dto';
import { FinanceService } from './finance.service';
import { FinancialDocumentHandoffAttempt } from './entities/financial-document-handoff-attempt.entity';
import { FinancialDocumentStatus } from './entities/financial-document-status.enum';
import { FinancialDocument } from './entities/financial-document.entity';
import { KeezService } from './keez.service';

type FinanceServiceInternals = {
  serializeDocuments(
    documents: FinancialDocument[],
  ): Promise<FinancialDocumentDto[]>;
};

const financeUser: CurrentUser = {
  id: 99,
  displayName: 'Responsabil Financiar',
  roles: [UserRole.FinanceManager],
};

const createDocument = (
  overrides: Partial<FinancialDocument> = {},
): FinancialDocument => ({
  id: 1,
  uploaderId: 7,
  status: FinancialDocumentStatus.ReadyToSend,
  originalFilename: 'bon.pdf',
  contentType: 'application/pdf',
  fileSize: 1200,
  checksumSha256: 'abc123',
  fileData: Buffer.from('document'),
  activityId: null,
  activityName: null,
  notes: null,
  reviewerNotes: null,
  keezExternalId: null,
  keezSubmittedAt: null,
  createdAt: new Date('2026-07-07T10:00:00.000Z'),
  updatedAt: new Date('2026-07-07T10:00:00.000Z'),
  ...overrides,
});

const createAttempt = (
  overrides: Partial<FinancialDocumentHandoffAttempt> = {},
): FinancialDocumentHandoffAttempt => ({
  id: 1,
  documentId: 1,
  actorId: financeUser.id,
  channel: 'email',
  provider: 'gmail',
  status: 'failed',
  senderEmail: 'cluj.napoca@scout.ro',
  recipientEmail: '12345678@keez.ro',
  subject: 'Document financiar Resurse Scouts Cluj - #000001',
  attachmentFilename: 'document-financiar-000001.pdf',
  providerMessageId: null,
  errorMessage: null,
  createdAt: new Date('2026-07-07T10:00:00.000Z'),
  ...overrides,
});

const createService = ({
  document = createDocument(),
  attempts = [],
}: {
  document?: FinancialDocument;
  attempts?: FinancialDocumentHandoffAttempt[];
} = {}) => {
  const documentsRepository = {
    findOne: jest.fn(() => Promise.resolve(document)),
    create: jest.fn((value: FinancialDocument) => value),
  };
  const auditsRepository = {
    create: jest.fn((value: unknown) => value),
  };
  const handoffAttemptsRepository = {
    find: jest.fn(() => Promise.resolve(attempts)),
    create: jest.fn((value: unknown) => value),
  };
  const settingsRepository = {
    findOne: jest.fn(),
    create: jest.fn((value: unknown) => value),
  };
  const activitiesRepository = {
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(),
  };
  const usersRepository = {
    find: jest.fn(() =>
      Promise.resolve([{ id: document.uploaderId, displayName: 'Ana Pop' }]),
    ),
  };
  const em = {
    persist: jest.fn(),
    flush: jest.fn(() => Promise.resolve(undefined)),
  };
  const auditService = {
    record: jest.fn<Promise<void>, [unknown]>(() => Promise.resolve(undefined)),
  };

  const service = new FinanceService(
    documentsRepository as never,
    auditsRepository as never,
    handoffAttemptsRepository as never,
    settingsRepository as never,
    activitiesRepository as never,
    usersRepository as never,
    em as never,
    {} as KeezService,
    auditService as unknown as AuditService,
  );

  return {
    service,
    internals: service as unknown as FinanceServiceInternals,
    documentsRepository,
    auditsRepository,
    handoffAttemptsRepository,
    em,
    auditService,
  };
};

describe('FinanceService document handoff state', () => {
  it('does not expose a stale failed handoff after a later success', async () => {
    const { internals } = createService({
      attempts: [
        createAttempt({
          id: 2,
          status: 'succeeded',
          errorMessage: null,
          providerMessageId: 'gmail-message-id',
          createdAt: new Date('2026-07-07T11:00:00.000Z'),
        }),
        createAttempt({
          id: 1,
          status: 'failed',
          errorMessage: 'Token has been expired or revoked.',
          createdAt: new Date('2026-07-07T10:00:00.000Z'),
        }),
      ],
    });

    const [serialized] = await internals.serializeDocuments([
      createDocument({ status: FinancialDocumentStatus.Sent }),
    ]);

    expect(serialized.lastHandoffError).toBeUndefined();
  });

  it('exposes the handoff error when the latest attempt failed', async () => {
    const { internals } = createService({
      attempts: [
        createAttempt({
          id: 3,
          status: 'failed',
          errorMessage: 'Gmail API is disabled.',
          createdAt: new Date('2026-07-07T12:00:00.000Z'),
        }),
        createAttempt({
          id: 2,
          status: 'succeeded',
          providerMessageId: 'gmail-message-id',
          createdAt: new Date('2026-07-07T11:00:00.000Z'),
        }),
      ],
    });

    const [serialized] = await internals.serializeDocuments([
      createDocument({ status: FinancialDocumentStatus.SendFailed }),
    ]);

    expect(serialized.lastHandoffError).toBe('Gmail API is disabled.');
  });

  it('normalizes legacy ready statuses and lets reviewers clear notes', async () => {
    const document = createDocument({
      status: FinancialDocumentStatus.Uploaded,
      reviewerNotes: 'observație veche',
    });
    const { service, auditsRepository, auditService, em } = createService({
      document,
    });

    const result = await service.updateDocumentStatus(
      financeUser,
      document.id,
      {
        status: FinancialDocumentStatus.Uploaded,
        reviewerNotes: '',
      },
    );

    expect(result.status).toBe(FinancialDocumentStatus.ReadyToSend);
    expect(result.reviewerNotes).toBeUndefined();
    expect(document.status).toBe(FinancialDocumentStatus.ReadyToSend);
    expect(document.reviewerNotes).toBeNull();
    expect(auditsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: document.id,
        fromStatus: FinancialDocumentStatus.Uploaded,
        toStatus: FinancialDocumentStatus.ReadyToSend,
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'financial_document.status_updated',
      }),
    );
    expect(auditService.record.mock.calls[0]?.[0]).toMatchObject({
      metadata: {
        fromStatus: FinancialDocumentStatus.Uploaded,
        toStatus: FinancialDocumentStatus.ReadyToSend,
      },
    });
    expect(em.flush).toHaveBeenCalled();
  });
});

import { ConfigService } from '@nestjs/config';
import { buildKeezAttachmentFilename, KeezService } from './keez.service';
import type { FinancialDocument } from './entities/financial-document.entity';
import { FinancialDocumentStatus } from './entities/financial-document-status.enum';

const document = {
  id: 123,
  uploaderId: 7,
  status: FinancialDocumentStatus.ReadyToSend,
  originalFilename: 'bon magazin.pdf',
  contentType: 'application/pdf',
  fileSize: 12,
  checksumSha256: 'abc123',
  fileData: Buffer.from('hello world'),
  activityId: null,
  activityName: null,
  notes: 'alimente camp',
  reviewerNotes: null,
  keezExternalId: null,
  keezSubmittedAt: null,
  createdAt: new Date('2026-07-07T10:00:00Z'),
  updatedAt: new Date('2026-07-07T10:00:00Z'),
} satisfies FinancialDocument;

const configService = (values: Record<string, string | undefined>) =>
  ({
    get: jest.fn((key: string) => values[key]),
  }) as unknown as ConfigService;

const decodeRawMessage = (raw: string) => {
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
};

describe('KeezService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires the configured sender to match the expected Keez account email', () => {
    const service = new KeezService(
      configService({
        FINANCE_GMAIL_CLIENT_ID: 'client-id',
        FINANCE_GMAIL_CLIENT_SECRET: 'client-secret',
        FINANCE_GMAIL_REFRESH_TOKEN: 'refresh-token',
        FINANCE_GMAIL_SENDER_EMAIL: 'andrei.tudorica@scout.ro',
      }),
    );

    expect(service.getConfigurationStatus()).toMatchObject({
      documentUploadAvailable: false,
      emailHandoffAvailable: false,
      emailSender: 'andrei.tudorica@scout.ro',
      expectedEmailSender: 'cluj.napoca@scout.ro',
      emailRecipient: 'cui@keez.ro',
    });
  });

  it('builds generated attachment filenames from the document id and type', () => {
    expect(buildKeezAttachmentFilename(document)).toBe(
      'document-financiar-000123.pdf',
    );
  });

  it('sends one Gmail message with the generated attachment name', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'access-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'gmail-message-id' }), {
          status: 200,
        }),
      );
    const service = new KeezService(
      configService({
        FINANCE_GMAIL_CLIENT_ID: 'client-id',
        FINANCE_GMAIL_CLIENT_SECRET: 'client-secret',
        FINANCE_GMAIL_REFRESH_TOKEN: 'refresh-token',
        FINANCE_GMAIL_SENDER_EMAIL: 'cluj.napoca@scout.ro',
      }),
    );

    const result = await service.submitDocument({
      document,
      uploaderName: 'Andrei',
      activityName: 'Camp test',
    });

    expect(result).toMatchObject({
      provider: 'gmail',
      providerMessageId: 'gmail-message-id',
      senderEmail: 'cluj.napoca@scout.ro',
      recipientEmail: 'cui@keez.ro',
      attachmentFilename: 'document-financiar-000123.pdf',
    });
    const gmailCall = fetchMock.mock.calls[1];
    expect(gmailCall[0]).toBe(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    );
    const requestBody = JSON.parse(
      (gmailCall[1]?.body as string | undefined) ?? '{}',
    ) as { raw: string };
    const message = decodeRawMessage(requestBody.raw);
    expect(message).toContain('From: cluj.napoca@scout.ro');
    expect(message).toContain('To: cui@keez.ro');
    expect(message).toContain(
      'Subject: Document financiar Resurse Scouts Cluj - #000123',
    );
    expect(message).toContain('Document Resurse: #000123');
    expect(message).toContain('Activitate: Camp test');
    expect(message).toContain('filename="document-financiar-000123.pdf"');
  });
});

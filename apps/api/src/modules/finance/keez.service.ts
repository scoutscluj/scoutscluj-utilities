import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinancialDocument } from './entities/financial-document.entity';

const KEEZ_DOCUMENT_UPLOAD_AVAILABLE = false;
const DEFAULT_KEEZ_EMAIL_RECIPIENT = 'cui@keez.ro';
const DEFAULT_KEEZ_EMAIL_EXPECTED_SENDER = 'cluj.napoca@scout.ro';
const OFFICIAL_ORGANIZATION_NAME =
  'ASOCIAŢIA ORGANIZAŢIA NAŢIONALĂ CERCETAŞII ROMÂNIEI FILIALA CLUJ';

type SubmitDocumentInput = {
  document: FinancialDocument;
  uploaderName: string;
  activityName?: string;
};

type GmailTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GmailSendResponse = {
  id?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

export type KeezDocumentSubmissionResult = {
  provider: 'gmail';
  providerMessageId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  attachmentFilename: string;
};

const cleanConfigValue = (value?: string) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const normalizeEmail = (value?: string) =>
  cleanConfigValue(value)?.toLowerCase();

const base64Url = (value: string) =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const wrapBase64 = (value: string) =>
  value.match(/.{1,76}/g)?.join('\r\n') ?? '';

const sanitizeHeaderValue = (value: string) => value.replace(/[\r\n"]/g, '_');

const contentTypeExtension = (contentType: string) => {
  switch (contentType.toLowerCase()) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'bin';
  }
};

export const buildKeezAttachmentFilename = (document: FinancialDocument) =>
  `document-financiar-${String(document.id).padStart(6, '0')}.${contentTypeExtension(
    document.contentType,
  )}`;

@Injectable()
export class KeezService {
  constructor(private readonly config: ConfigService) {}

  getConfigurationStatus() {
    const appId = this.config.get<string>('KEEZ_APP_ID');
    const clientId = this.config.get<string>('KEEZ_CLIENT_ID');
    const clientSecret = this.config.get<string>('KEEZ_CLIENT_SECRET');
    const emailConfig = this.getEmailConfig();

    return {
      configured: Boolean(appId && clientId && clientSecret),
      environment: this.config.get<string>('KEEZ_ENVIRONMENT') ?? 'staging',
      documentUploadAvailable:
        KEEZ_DOCUMENT_UPLOAD_AVAILABLE || emailConfig.available,
      directApiDocumentUploadAvailable: KEEZ_DOCUMENT_UPLOAD_AVAILABLE,
      emailHandoffAvailable: emailConfig.available,
      emailSender: emailConfig.senderEmail,
      emailRecipient: emailConfig.recipientEmail,
      expectedEmailSender: emailConfig.expectedSenderEmail,
    };
  }

  getDocumentSubmissionMetadata(document: FinancialDocument) {
    const emailConfig = this.getEmailConfig();
    const subject = `Document financiar Resurse Scouts Cluj - #${String(
      document.id,
    ).padStart(6, '0')}`;

    return {
      senderEmail: emailConfig.senderEmail ?? emailConfig.expectedSenderEmail,
      recipientEmail: emailConfig.recipientEmail,
      subject,
      attachmentFilename: buildKeezAttachmentFilename(document),
    };
  }

  async submitDocument(
    input: SubmitDocumentInput,
  ): Promise<KeezDocumentSubmissionResult> {
    const emailConfig = this.getEmailConfig();
    if (!emailConfig.available) {
      throw new Error(
        'Gmail handoff is not configured for the expected Keez sender.',
      );
    }

    const accessToken = await this.getGmailAccessToken(emailConfig);
    const metadata = this.getDocumentSubmissionMetadata(input.document);
    const raw = this.buildGmailRawMessage({
      ...input,
      ...metadata,
    });

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      },
    );
    const body = (await this.readJson<GmailSendResponse>(response)) ?? {};

    if (!response.ok || !body.id) {
      throw new Error(
        this.safeRemoteError(
          body.error?.message ?? body.message,
          'Gmail did not accept the document email.',
        ),
      );
    }

    return {
      provider: 'gmail',
      providerMessageId: body.id,
      senderEmail: metadata.senderEmail,
      recipientEmail: metadata.recipientEmail,
      subject: metadata.subject,
      attachmentFilename: metadata.attachmentFilename,
    };
  }

  private getEmailConfig() {
    const clientId =
      cleanConfigValue(this.config.get<string>('FINANCE_GMAIL_CLIENT_ID')) ??
      cleanConfigValue(this.config.get<string>('GMAIL_CLIENT_ID'));
    const clientSecret =
      cleanConfigValue(
        this.config.get<string>('FINANCE_GMAIL_CLIENT_SECRET'),
      ) ?? cleanConfigValue(this.config.get<string>('GMAIL_CLIENT_SECRET'));
    const refreshToken =
      cleanConfigValue(
        this.config.get<string>('FINANCE_GMAIL_REFRESH_TOKEN'),
      ) ?? cleanConfigValue(this.config.get<string>('GMAIL_REFRESH_TOKEN'));
    const senderEmail =
      normalizeEmail(this.config.get<string>('FINANCE_GMAIL_SENDER_EMAIL')) ??
      normalizeEmail(this.config.get<string>('GMAIL_SENDER_EMAIL'));
    const expectedSenderEmail =
      normalizeEmail(
        this.config.get<string>('KEEZ_DOCUMENT_EMAIL_EXPECTED_SENDER'),
      ) ?? DEFAULT_KEEZ_EMAIL_EXPECTED_SENDER;
    const recipientEmail =
      normalizeEmail(
        this.config.get<string>('KEEZ_DOCUMENT_EMAIL_RECIPIENT'),
      ) ?? DEFAULT_KEEZ_EMAIL_RECIPIENT;

    return {
      clientId,
      clientSecret,
      refreshToken,
      senderEmail,
      expectedSenderEmail,
      recipientEmail,
      available: Boolean(
        clientId &&
        clientSecret &&
        refreshToken &&
        senderEmail &&
        senderEmail === expectedSenderEmail &&
        recipientEmail === DEFAULT_KEEZ_EMAIL_RECIPIENT,
      ),
    };
  }

  private async getGmailAccessToken(
    emailConfig: ReturnType<KeezService['getEmailConfig']>,
  ) {
    const body = new URLSearchParams({
      client_id: emailConfig.clientId ?? '',
      client_secret: emailConfig.clientSecret ?? '',
      refresh_token: emailConfig.refreshToken ?? '',
      grant_type: 'refresh_token',
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const payload = (await this.readJson<GmailTokenResponse>(response)) ?? {};

    if (!response.ok || !payload.access_token) {
      throw new Error(
        this.safeRemoteError(
          payload.error_description ?? payload.error,
          'Gmail token refresh failed.',
        ),
      );
    }

    return payload.access_token;
  }

  private buildGmailRawMessage(input: {
    document: FinancialDocument;
    uploaderName: string;
    activityName?: string;
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    attachmentFilename: string;
  }) {
    const boundary = `scoutscluj-${input.document.id}-${Date.now()}`;
    const notes = input.document.notes?.trim();
    const textBody = [
      `Organizatie: ${OFFICIAL_ORGANIZATION_NAME}`,
      'Sursa: Resurse Scouts Cluj',
      `Document Resurse: #${String(input.document.id).padStart(6, '0')}`,
      `Incarcat de: ${input.uploaderName}`,
      input.activityName ? `Activitate: ${input.activityName}` : undefined,
      notes ? `Notite: ${notes}` : undefined,
      `Checksum SHA-256: ${input.document.checksumSha256}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\r\n');
    const attachment = wrapBase64(input.document.fileData.toString('base64'));
    const filename = sanitizeHeaderValue(input.attachmentFilename);
    const message = [
      `From: ${input.senderEmail}`,
      `To: ${input.recipientEmail}`,
      `Subject: ${sanitizeHeaderValue(input.subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      textBody,
      '',
      `--${boundary}`,
      `Content-Type: ${input.document.contentType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      attachment,
      `--${boundary}--`,
      '',
    ].join('\r\n');

    return base64Url(message);
  }

  private async readJson<T>(response: Response) {
    const text = await response.text();
    if (!text) {
      return undefined;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return { message: text } as T;
    }
  }

  private safeRemoteError(value: string | undefined, fallback: string) {
    return (value?.replace(/\s+/g, ' ').trim() || fallback).slice(0, 1000);
  }
}

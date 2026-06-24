import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinancialDocument } from './entities/financial-document.entity';

const KEEZ_DOCUMENT_UPLOAD_AVAILABLE = false;

@Injectable()
export class KeezService {
  constructor(private readonly config: ConfigService) {}

  getConfigurationStatus() {
    const appId = this.config.get<string>('KEEZ_APP_ID');
    const clientId = this.config.get<string>('KEEZ_CLIENT_ID');
    const clientSecret = this.config.get<string>('KEEZ_CLIENT_SECRET');

    return {
      configured: Boolean(appId && clientId && clientSecret),
      environment: this.config.get<string>('KEEZ_ENVIRONMENT') ?? 'staging',
      documentUploadAvailable: KEEZ_DOCUMENT_UPLOAD_AVAILABLE,
    };
  }

  submitDocument(document: FinancialDocument) {
    const status = this.getConfigurationStatus();

    if (!status.documentUploadAvailable) {
      throw new NotImplementedException(
        `Keez public API document upload is not confirmed yet for document ${document.id}.`,
      );
    }
  }
}

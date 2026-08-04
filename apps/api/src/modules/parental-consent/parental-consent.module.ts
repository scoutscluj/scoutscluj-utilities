import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Activity } from '../activities/entities/activity.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ParentalConsentActivityDraft } from './entities/parental-consent-activity-draft.entity';
import { ParentalConsentAsset } from './entities/parental-consent-asset.entity';
import { ParentalConsentDocument } from './entities/parental-consent-document.entity';
import { ParentalConsentOrganizationSettings } from './entities/parental-consent-organization-settings.entity';
import { ParentalConsentPublication } from './entities/parental-consent-publication.entity';
import { ParentalConsentTemplateVersion } from './entities/parental-consent-template-version.entity';
import {
  ParentalConsentActivityController,
  ParentalConsentAdminController,
} from './parental-consent.controller';
import { ParentalConsentRendererService } from './parental-consent-renderer.service';
import { ParentalConsentSeedService } from './parental-consent-seed.service';
import { ParentalConsentService } from './parental-consent.service';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    MikroOrmModule.forFeature([
      Activity,
      ParentalConsentOrganizationSettings,
      ParentalConsentAsset,
      ParentalConsentTemplateVersion,
      ParentalConsentActivityDraft,
      ParentalConsentPublication,
      ParentalConsentDocument,
    ]),
  ],
  controllers: [
    ParentalConsentAdminController,
    ParentalConsentActivityController,
  ],
  providers: [
    ParentalConsentService,
    ParentalConsentRendererService,
    ParentalConsentSeedService,
  ],
  exports: [ParentalConsentService],
})
export class ParentalConsentModule {}

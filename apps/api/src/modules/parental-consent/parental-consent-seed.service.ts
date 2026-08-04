import {
  PARENTAL_CONSENT_SCHEMA_VERSION,
  defaultLayoutSettings,
  initialTemplateDocument,
} from '@scouts-cluj/parental-consent-schema';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { ParentalConsentAsset } from './entities/parental-consent-asset.entity';
import { ParentalConsentOrganizationSettings } from './entities/parental-consent-organization-settings.entity';
import { ParentalConsentTemplateVersion } from './entities/parental-consent-template-version.entity';
import { ParentalConsentTemplateStatus } from './entities/parental-consent.enums';

type SeedAsset = {
  filename: string;
  name: string;
  altText: string;
  checksumSha256: string;
};

export const PARENTAL_CONSENT_SEED_ASSETS: SeedAsset[] = [
  {
    filename: 'cercetasii-romaniei.png',
    name: 'Cercetașii României',
    altText: 'Sigla Cercetașii României',
    checksumSha256:
      '8157f4d72350b410997ab5c5e3227a3322bd72f6982a5c253e5a8904fd825cb5',
  },
  {
    filename: 'safe-from-harm-romania.png',
    name: 'Safe from Harm România',
    altText: 'Sigla Safe from Harm România',
    checksumSha256:
      '19d2facab26a97bb8c2b6c50e41251040c6a116e01277853656c7a9d4114add9',
  },
  {
    filename: 'scouts-cluj.png',
    name: 'Cercetașii Cluj',
    altText: 'Sigla Cercetașii Cluj',
    checksumSha256:
      'b457541841f4880aee22829709d8f20c691eb47c6b8ca783d96bb54c33f98cca',
  },
];

@Injectable()
export class ParentalConsentSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ParentalConsentSeedService.name);

  constructor(
    @InjectRepository(ParentalConsentOrganizationSettings)
    private readonly organizationRepository: EntityRepository<ParentalConsentOrganizationSettings>,
    @InjectRepository(ParentalConsentAsset)
    private readonly assetRepository: EntityRepository<ParentalConsentAsset>,
    @InjectRepository(ParentalConsentTemplateVersion)
    private readonly templateRepository: EntityRepository<ParentalConsentTemplateVersion>,
    @Inject(EntityManager) private readonly em: EntityManager,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.PARENTAL_CONSENT_AUTO_SEED === 'false') return;
    try {
      await this.seed();
    } catch (error) {
      this.logger.error('Parental-consent seed failed.', error);
      throw error;
    }
  }

  async seed() {
    let organization = await this.organizationRepository.findOne({ id: 1 });
    if (!organization) {
      organization = this.organizationRepository.create({
        id: 1,
        name: 'Cercetașii României – Centrul Local Cluj-Napoca',
        legalName: 'Organizația Națională Cercetașii României',
        address: 'Cluj-Napoca, România',
        email: 'contact@scoutscluj.ro',
        phone: '',
        website: 'https://scoutscluj.ro',
        revision: 1,
      });
      this.em.persist(organization);
    }

    const assets: ParentalConsentAsset[] = [];
    for (const definition of PARENTAL_CONSENT_SEED_ASSETS) {
      let asset = await this.assetRepository.findOne({
        checksumSha256: definition.checksumSha256,
      });
      if (!asset) {
        const fileData = await readFile(
          join(__dirname, 'seed-assets', definition.filename),
        );
        const checksumSha256 = createHash('sha256')
          .update(fileData)
          .digest('hex');
        if (checksumSha256 !== definition.checksumSha256) {
          throw new Error(
            `Seed asset checksum mismatch: ${definition.filename}`,
          );
        }
        const metadata = await sharp(fileData).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error(
            `Seed asset dimensions unavailable: ${definition.filename}`,
          );
        }
        asset = this.assetRepository.create({
          name: definition.name,
          altText: definition.altText,
          contentType: 'image/png',
          fileSize: fileData.length,
          width: metadata.width,
          height: metadata.height,
          checksumSha256,
          fileData,
        });
        this.em.persist(asset);
      }
      assets.push(asset);
    }
    await this.em.flush();

    if ((await this.templateRepository.count()) === 0) {
      const template = this.templateRepository.create({
        version: 1,
        name: 'Acord parental Scouts Cluj',
        status: ParentalConsentTemplateStatus.Active,
        schemaVersion: PARENTAL_CONSENT_SCHEMA_VERSION,
        document: structuredClone(initialTemplateDocument),
        layout: {
          ...defaultLayoutSettings,
          headerAssetIds: assets.map((asset) => asset.id),
        },
        activatedAt: new Date(),
      });
      this.em.persist(template);
      await this.em.flush();
    }

    return {
      organizationId: organization.id,
      assetIds: assets.map((asset) => asset.id),
    };
  }
}

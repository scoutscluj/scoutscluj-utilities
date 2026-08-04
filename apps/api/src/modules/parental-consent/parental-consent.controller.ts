import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser as CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import {
  CreateParentalConsentAssetDto,
  CreateParentalConsentTemplateDto,
  UpdateParentalConsentDraftDto,
  UpdateParentalConsentOrganizationDto,
  UpdateParentalConsentTemplateDto,
} from './dto/parental-consent.dto';
import { ParentalConsentService } from './parental-consent.service';

const safeFilename = (filename: string) => filename.replace(/[\r\n"]/g, '_');

const sendFile = (
  response: Response,
  file: {
    fileData: Buffer;
    contentType: string;
    filename: string;
    checksumSha256?: string;
  },
  disposition: 'inline' | 'attachment',
) => {
  response.setHeader('Content-Type', file.contentType);
  response.setHeader('Content-Length', file.fileData.length);
  response.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${safeFilename(file.filename)}"`,
  );
  response.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  if (file.checksumSha256) {
    response.setHeader(
      'Digest',
      `sha-256=${Buffer.from(file.checksumSha256, 'hex').toString('base64')}`,
    );
    response.setHeader('X-Checksum-Sha256', file.checksumSha256);
  }
  response.send(file.fileData);
};

@ApiTags('parental-consent-admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Controller('parental-consent/admin')
export class ParentalConsentAdminController {
  constructor(private readonly service: ParentalConsentService) {}

  @Get('organization')
  @ApiOperation({
    summary:
      'Read the singleton Scouts Cluj identity used by parental-consent templates.',
  })
  getOrganization(@CurrentUserDecorator() user: AuthenticatedUser) {
    return this.service.getOrganization(user);
  }

  @Patch('organization')
  @ApiOperation({
    summary: 'Update the Scouts Cluj identity with optimistic concurrency.',
  })
  @Roles(UserRole.SuperAdmin)
  updateOrganization(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Body() body: UpdateParentalConsentOrganizationDto,
  ) {
    return this.service.updateOrganization(user, body);
  }

  @Get('assets')
  @ApiOperation({
    summary: 'List approved local image assets available to template editors.',
  })
  listAssets(@CurrentUserDecorator() user: AuthenticatedUser) {
    return this.service.listAssets(user);
  }

  @Post('assets')
  @ApiOperation({
    summary: 'Upload and checksum a constrained PNG or JPEG asset.',
  })
  @Roles(UserRole.SuperAdmin)
  createAsset(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Body() body: CreateParentalConsentAssetDto,
  ) {
    return this.service.createAsset(user, body);
  }

  @Get('assets/:assetId/file')
  @ApiOperation({ summary: 'Read exact bytes for an approved image asset.' })
  @ApiProduces('image/png', 'image/jpeg')
  async getAssetFile(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('assetId', ParseIntPipe) assetId: number,
    @Res() response: Response,
  ) {
    const asset = await this.service.getAssetFile(user, assetId);
    sendFile(
      response,
      {
        fileData: asset.fileData,
        contentType: asset.contentType,
        filename: `asset-${asset.id}.${asset.contentType === 'image/png' ? 'png' : 'jpg'}`,
        checksumSha256: asset.checksumSha256,
      },
      'inline',
    );
  }

  @Delete('assets/:assetId')
  @ApiOperation({ summary: 'Delete an unreferenced approved asset.' })
  @Roles(UserRole.SuperAdmin)
  deleteAsset(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('assetId', ParseIntPipe) assetId: number,
  ) {
    return this.service.deleteAsset(user, assetId);
  }

  @Get('templates')
  @ApiOperation({
    summary:
      'List all parental-consent template versions and lifecycle states.',
  })
  listTemplates(@CurrentUserDecorator() user: AuthenticatedUser) {
    return this.service.listTemplates(user);
  }

  @Post('templates')
  @ApiOperation({
    summary:
      'Create a new template draft, optionally cloned from another version.',
  })
  createTemplate(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Body() body: CreateParentalConsentTemplateDto,
  ) {
    return this.service.createTemplate(user, body);
  }

  @Get('templates/:templateId')
  @ApiOperation({
    summary: 'Read a structured parental-consent template version.',
  })
  getTemplate(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.service.getTemplate(user, templateId);
  }

  @Patch('templates/:templateId')
  @ApiOperation({
    summary:
      'Update a mutable template draft using its expected update timestamp.',
  })
  updateTemplate(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() body: UpdateParentalConsentTemplateDto,
  ) {
    return this.service.updateTemplate(user, templateId, body);
  }

  @Post('templates/:templateId/activate')
  @ApiOperation({
    summary:
      'Activate a template version and archive the previously active version.',
  })
  @Roles(UserRole.SuperAdmin)
  activateTemplate(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.service.activateTemplate(user, templateId);
  }

  @Get('templates/:templateId/preview/:branch')
  @ApiOperation({
    summary:
      'Render a template with the fixed representative fixture without persistence.',
  })
  @ApiParam({ name: 'branch', enum: ['lupisori', 'temerari', 'exploratori'] })
  @ApiProduces('application/pdf')
  @Header('Cache-Control', 'no-store')
  async previewTemplate(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('branch') branch: string,
    @Res() response: Response,
  ) {
    const pdf = await this.service.previewTemplate(user, templateId, branch);
    sendFile(
      response,
      {
        fileData: pdf,
        contentType: 'application/pdf',
        filename: `preview-template-${templateId}-${branch}.pdf`,
      },
      'inline',
    );
  }
}

@ApiTags('parental-consent-activities')
@UseGuards(AuthGuard)
@Controller('activities/:activityId/parental-consent')
export class ParentalConsentActivityController {
  constructor(private readonly service: ParentalConsentService) {}

  @Get('draft')
  @ApiOperation({
    summary:
      'Read or initialize the coordinator-managed draft for an activity.',
  })
  getDraft(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.service.getDraft(user, activityId);
  }

  @Patch('draft')
  @ApiOperation({
    summary:
      'Recursively merge a full or partial organizer draft at an expected revision.',
  })
  updateDraft(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: UpdateParentalConsentDraftDto,
  ) {
    return this.service.updateDraft(user, activityId, body);
  }

  @Post('validate')
  @ApiOperation({
    summary:
      'Validate the current organizer draft and return stable Romanian field errors.',
  })
  validateDraft(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.service.validateDraft(user, activityId);
  }

  @Get('preview/:branch')
  @ApiOperation({
    summary: 'Render a non-persistent branch preview for an activity manager.',
  })
  @ApiParam({ name: 'branch', enum: ['lupisori', 'temerari', 'exploratori'] })
  @ApiProduces('application/pdf')
  @Header('Cache-Control', 'no-store')
  async previewBranch(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('branch') branch: string,
    @Res() response: Response,
  ) {
    const file = await this.service.previewBranch(user, activityId, branch);
    sendFile(
      response,
      {
        fileData: file.pdf,
        contentType: 'application/pdf',
        filename: file.filename,
      },
      'inline',
    );
  }

  @Post('publish')
  @ApiOperation({
    summary: 'Atomically publish immutable PDFs for every enabled branch.',
  })
  publish(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.service.publish(user, activityId);
  }

  @Get('publication')
  @ApiOperation({
    summary:
      'Read current publication metadata for an authenticated activity viewer.',
  })
  getCurrentPublication(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.service.getCurrentPublication(user, activityId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'List active and archived publications for an activity manager.',
  })
  listHistory(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.service.listHistory(user, activityId);
  }

  @Get('documents/:documentId/file')
  @ApiOperation({
    summary:
      'Download exact current-publication PDF bytes as an authenticated viewer.',
  })
  @ApiProduces('application/pdf')
  async downloadCurrent(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() response: Response,
  ) {
    const document = await this.service.downloadCurrent(
      user,
      activityId,
      documentId,
    );
    sendFile(response, document, 'attachment');
  }

  @Get('publications/:publicationId/documents/:documentId/file')
  @ApiOperation({
    summary:
      'Download exact archived-publication PDF bytes as an activity manager.',
  })
  @ApiProduces('application/pdf')
  async downloadHistorical(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('publicationId', ParseIntPipe) publicationId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() response: Response,
  ) {
    const document = await this.service.downloadHistorical(
      user,
      activityId,
      publicationId,
      documentId,
    );
    sendFile(response, document, 'attachment');
  }
}

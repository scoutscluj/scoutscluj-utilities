import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser as CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import {
  CreateFinancialDocumentDto,
  FinanceSettingsDto,
  FinanceSummaryDto,
  FinancialDocumentAuditDto,
  FinancialDocumentDto,
  UpdateFinanceSettingsDto,
  UpdateFinancialDocumentStatusDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

const safeDispositionFilename = (filename: string) =>
  filename.replace(/[\r\n"]/g, '_');

@ApiTags('finance')
@UseGuards(AuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('documents')
  @ApiOkResponse({ type: [FinancialDocumentDto] })
  listDocuments(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Query('activityId') activityId?: string,
  ) {
    return this.financeService.listDocuments(user, { activityId });
  }

  @Post('documents')
  @ApiOkResponse({ type: FinancialDocumentDto })
  createDocument(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Body() body: CreateFinancialDocumentDto,
  ) {
    return this.financeService.createDocument(user, body);
  }

  @Get('documents/:id/audits')
  @ApiOkResponse({ type: [FinancialDocumentAuditDto] })
  listAudits(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) documentId: number,
  ) {
    return this.financeService.listAudits(user, documentId);
  }

  @Get('documents/:id/file')
  @Header('Cache-Control', 'private, max-age=0, must-revalidate')
  async downloadDocument(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) documentId: number,
    @Res() response: Response,
  ) {
    const file = await this.financeService.getDocumentFile(user, documentId);

    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', file.fileData.length);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeDispositionFilename(file.originalFilename)}"`,
    );
    return response.send(file.fileData);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.FinanceManager)
  @Patch('documents/:id/status')
  @ApiOkResponse({ type: FinancialDocumentDto })
  updateDocumentStatus(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) documentId: number,
    @Body() body: UpdateFinancialDocumentStatusDto,
  ) {
    return this.financeService.updateDocumentStatus(user, documentId, body);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.FinanceManager)
  @Get('settings')
  @ApiOkResponse({ type: FinanceSettingsDto })
  getSettings() {
    return this.financeService.getSettings();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.FinanceManager)
  @Patch('settings')
  @ApiOkResponse({ type: FinanceSettingsDto })
  updateSettings(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Body() body: UpdateFinanceSettingsDto,
  ) {
    return this.financeService.updateSettings(user, body);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.FinanceManager)
  @Get('summary')
  @ApiOkResponse({ type: FinanceSummaryDto })
  getSummary(@CurrentUserDecorator() user: AuthenticatedUser) {
    return this.financeService.getSummary(user);
  }
}

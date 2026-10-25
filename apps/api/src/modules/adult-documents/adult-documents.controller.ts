import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { CurrentUser as CurrentUserType } from '../users/users.types';
import { AdultDocumentsService } from './adult-documents.service';

@ApiTags('adult-documents')
@UseGuards(AuthGuard)
@Controller('adult-documents')
export class AdultDocumentsController {
  constructor(private readonly documents: AdultDocumentsService) {}

  @Get('access')
  @Header('Cache-Control', 'private, no-store')
  access(@CurrentUser() user: CurrentUserType) {
    return this.documents.access(user);
  }

  @Get('mine')
  @Header('Cache-Control', 'private, no-store')
  mine(@CurrentUser() user: CurrentUserType, @Query('year') year?: string) {
    return this.documents.mine(user, year);
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list(
    @CurrentUser() user: CurrentUserType,
    @Query()
    query: {
      year?: string;
      search?: string;
      status?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    return this.documents.list(user, query);
  }

  @Get('members/:memberId')
  @Header('Cache-Control', 'private, no-store')
  dossier(
    @CurrentUser() user: CurrentUserType,
    @Param('memberId', ParseUUIDPipe) id: string,
    @Query('year') year?: string,
  ) {
    return this.documents.getDossier(user, id, year);
  }

  @Post('members/:memberId')
  upload(
    @CurrentUser() user: CurrentUserType,
    @Param('memberId', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.documents.upload(user, id, input);
  }

  @Post('versions/:id/review')
  review(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    return this.documents.review(user, id, input);
  }

  @Get('versions/:id/download')
  async download(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const file = await this.documents.download(user, id);
    response.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': String(file.data.length),
    });
    response.send(file.data);
  }
}

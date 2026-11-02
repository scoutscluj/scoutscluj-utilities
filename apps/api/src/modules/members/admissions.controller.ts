import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { bodyObject } from './member-input';
import { AdmissionsService } from './admissions.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUser as Actor } from '../users/users.types';

@Controller('member-applications')
export class AdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  @Get('options') @Header('Cache-Control', 'no-store') options() {
    return this.admissions.options();
  }
  @Post() submit(@Body() body: unknown, @Req() request: Request) {
    const now = Date.now();
    for (const [key, row] of this.attempts)
      if (row.until < now) this.attempts.delete(key);
    const data = bodyObject(body);
    const contact = [data.email, data.guardianEmail, data.guardianPhone]
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim().toLowerCase())
      .join('|');
    // SSR clients share the web server address; contact limits must not block the whole center.
    const keys = [
      { key: 'ip:' + (request.ip ?? 'unknown'), limit: 300 },
      {
        key: 'contact:' + createHash('sha256').update(contact).digest('hex'),
        limit: 10,
      },
    ];
    for (const { key, limit } of keys) {
      const row = this.attempts.get(key) ?? { count: 0, until: now + 3600000 };
      if (row.count >= limit || this.attempts.size >= 10000)
        throw new HttpException(
          'Prea multe cereri. Reîncearcă mai târziu.',
          429,
        );
      row.count++;
      this.attempts.set(key, row);
    }
    return this.admissions.submit(body);
  }
  @Get()
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'private, no-store')
  list(@CurrentUser() user: Actor) {
    return this.admissions.list(user);
  }
  @Post('create')
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: Actor, @Body() body: unknown) {
    return this.admissions.submit(body, user);
  }
  @Post(':id/review')
  @UseGuards(AuthGuard)
  review(
    @CurrentUser() user: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.admissions.review(user, id, body);
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Param,
  Query,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentUser as Actor } from '../auth/decorators/current-user.decorator';
import type { CurrentUser } from '../users/users.types';
import { RegistrationService } from './registration.service';
import { RegistrationPaymentsService } from './registration-payments.service';

class RegistrationNoStore implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Cache-Control', 'private, no-store');
    return next.handle();
  }
}
@Controller('activity-registrations')
@UseInterceptors(RegistrationNoStore)
export class RegistrationController {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(
    private readonly registrations: RegistrationService,
    private readonly payments: RegistrationPaymentsService,
    private readonly auth: AuthService,
  ) {}
  private limit(request: Request) {
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (value.until < now) this.attempts.delete(key);
    const key = request.ip ?? 'unknown';
    const row = this.attempts.get(key) ?? { count: 0, until: now + 60000 };
    if (row.count >= 30 || this.attempts.size > 10000)
      throw new HttpException(
        'Prea multe încercări. Reîncearcă mai târziu.',
        429,
      );
    row.count++;
    this.attempts.set(key, row);
  }
  private async optionalUser(request: Request) {
    const token = this.auth.extractSessionToken(request.headers);
    return token ? this.auth.getCurrentUserFromToken(token) : undefined;
  }
  @Get() catalog() {
    return this.registrations.catalog();
  }
  @Get('eligible')
  @UseGuards(AuthGuard)
  eligible(@Actor() user: CurrentUser) {
    return this.registrations.eligibleActivities(user);
  }
  @Get('setup-options')
  @UseGuards(AuthGuard)
  setupOptions() {
    return this.registrations.setupOptions();
  }
  @Get(':activityId/consent-preview/:branch')
  @UseGuards(AuthGuard)
  async consentPreview(
    @Actor() user: CurrentUser,
    @Param('activityId', ParseIntPipe) id: number,
    @Param('branch') branch: string,
    @Res() response: Response,
    @Query('unitId') unitId?: string,
  ) {
    const bytes = await this.registrations.consentPreview(
      user,
      id,
      branch,
      unitId,
    );
    response
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="acord-preview.pdf"',
        'Cache-Control': 'private, no-store',
      })
      .send(bytes);
  }
  @Post('consent-preview')
  @UseGuards(AuthGuard)
  async draftConsentPreview(
    @Body() body: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    this.limit(request);
    const bytes = await this.registrations.draftConsentPreview(body);
    response
      .set({
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
      })
      .send(bytes);
  }
  @Post(':activityId/consent-preview/:branch')
  @UseGuards(AuthGuard)
  async liveConsentPreview(
    @Actor() user: CurrentUser,
    @Param('activityId', ParseIntPipe) id: number,
    @Param('branch') branch: string,
    @Query('unitId') unitId: string | undefined,
    @Body() body: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    this.limit(request);
    const bytes = await this.registrations.consentPreview(
      user,
      id,
      branch,
      unitId,
      body,
    );
    response
      .set({
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, no-store',
      })
      .send(bytes);
  }
  @Post(':activityId/registrations/:id/check-in')
  @UseGuards(AuthGuard)
  checkIn(
    @Actor() user: CurrentUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.registrations.checkIn(activityId, id, body, user);
  }
  @Post(':activityId/apply-installments')
  @UseGuards(AuthGuard)
  applyInstallments(
    @Actor() user: CurrentUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: unknown,
  ) {
    return this.registrations.applyInstallments(activityId, body, user);
  }
  @Get(':activityId') async info(
    @Param('activityId', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    return this.registrations.publicPage(id, await this.optionalUser(request));
  }
  @Post(':activityId/register') async register(
    @Param('activityId', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.registrations.register(
      id,
      body,
      await this.optionalUser(request),
    );
  }
  @UseGuards(AuthGuard) @Post('prefill') prefill(
    @Actor() user: CurrentUser,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.registrations.prefill(user, body);
  }
  @Post(':activityId/lookup') lookup(
    @Param('activityId', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.payments.lookup(id, body);
  }
  @Post(':activityId/checkout') checkout(
    @Param('activityId', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.payments.checkout(id, body);
  }
  @Get(':activityId/personal/:token') personal(
    @Param('activityId', ParseIntPipe) id: number,
    @Param('token') token: string,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.registrations.personal(id, token);
  }
  @UseGuards(AuthGuard) @Get(':activityId/mine') mine(
    @Param('activityId', ParseIntPipe) id: number,
    @Actor() user: CurrentUser,
  ) {
    return this.registrations.mine(id, user);
  }
  @UseGuards(AuthGuard) @Get(':activityId/access') access(
    @Param('activityId', ParseIntPipe) id: number,
    @Actor() user: CurrentUser,
  ) {
    return this.registrations.access(id, user);
  }
  @UseGuards(AuthGuard) @Get(':activityId/registrations/:id') detail(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Actor() user: CurrentUser,
  ) {
    return this.registrations.ownDetail(activityId, id, user);
  }
  @UseGuards(AuthGuard) @Get(':activityId/overview') overview(
    @Param('activityId', ParseIntPipe) id: number,
    @Actor() user: CurrentUser,
  ) {
    return this.registrations.overview(id, user);
  }
  @UseGuards(AuthGuard) @Post(':activityId/settings') settings(
    @Param('activityId', ParseIntPipe) id: number,
    @Actor() user: CurrentUser,
    @Body() body: unknown,
  ) {
    return this.registrations.saveSettings(user, id, body);
  }
  @UseGuards(AuthGuard) @Get(':activityId/publication') publication(
    @Param('activityId', ParseIntPipe) id: number,
    @Actor() user: CurrentUser,
  ) {
    return this.registrations.publication(id, user);
  }
  @UseGuards(AuthGuard) @Post(':activityId/publication') setPublication(
    @Param('activityId', ParseIntPipe) id: number,
    @Actor() user: CurrentUser,
    @Body() body: unknown,
  ) {
    return this.registrations.setPublication(id, user, body);
  }
  @UseGuards(AuthGuard) @Patch(':activityId/registrations/:id') update(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Actor() user: CurrentUser,
    @Body() body: unknown,
  ) {
    return this.registrations.update(activityId, id, body, user);
  }
  @UseGuards(AuthGuard) @Post(':activityId/family') family(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Actor() user: CurrentUser,
    @Body() body: unknown,
  ) {
    return this.registrations.family(activityId, body, user);
  }
  @UseGuards(AuthGuard) @Post(':activityId/renew-consent') renew(
    @Param('activityId', ParseIntPipe) id: number,
    @Actor() user: CurrentUser,
  ) {
    return this.registrations.renewConsent(id, user);
  }
  @UseGuards(AuthGuard) @Post(':activityId/checkouts/:id/close') close(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Actor() user: CurrentUser,
    @Body() body: unknown,
  ) {
    return this.payments.closeAttempt(activityId, id, body, user);
  }
  @Post(':activityId/registrations/:id/generate') async generate(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Headers('x-registration-token') token: string,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.registrations.generate(
      activityId,
      id,
      token,
      await this.optionalUser(request),
    );
  }
  @Post(':activityId/registrations/:id/upload') async upload(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Headers('x-registration-token') token: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.registrations.upload(
      activityId,
      id,
      body,
      token,
      await this.optionalUser(request),
    );
  }
  @Post(':activityId/registrations/:id/answers') async answers(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Headers('x-registration-token') token: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    this.limit(request);
    return this.registrations.editAnswers(
      activityId,
      id,
      body,
      token,
      await this.optionalUser(request),
    );
  }
  @Get(':activityId/registrations/:id/documents/:documentId') async file(
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Headers('x-registration-token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    this.limit(request);
    const file = await this.registrations.file(
      activityId,
      id,
      documentId,
      token,
      await this.optionalUser(request),
    );
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    response.send(file.data);
  }
}

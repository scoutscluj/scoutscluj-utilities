import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MembershipService } from './membership.service';

@Controller('membership')
export class MembershipController {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(private readonly membership: MembershipService) {}

  private rateLimit(request: Request) {
    const now = Date.now();
    for (const [key, item] of this.attempts)
      if (item.until < now) this.attempts.delete(key);
    const key = request.ip ?? 'unknown';
    const entry = this.attempts.get(key) ?? { count: 0, until: now + 60000 };
    if (entry.count >= 10 || this.attempts.size >= 10000)
      throw new HttpException(
        'Prea multe încercări. Reîncearcă mai târziu.',
        429,
      );
    entry.count++;
    this.attempts.set(key, entry);
  }

  @Get('catalog')
  @Header('Cache-Control', 'no-store')
  catalog() {
    return this.membership.catalog();
  }

  @Post('guest-checkout')
  guest(@Body() body: unknown, @Req() request: Request) {
    this.rateLimit(request);
    return this.membership.checkout(body);
  }

  @Post('guest-lookup')
  guestLookup(@Body() body: unknown, @Req() request: Request) {
    this.rateLimit(request);
    return this.membership.guestLookup(body);
  }

  @Get('status/:token')
  @Header('Cache-Control', 'no-store')
  status(@Param('token') token: string) {
    return this.membership.status(token);
  }

  @Post('restart')
  restart(@Body() body: { attemptToken?: string }, @Req() request: Request) {
    this.rateLimit(request);
    return this.membership.restart(body?.attemptToken ?? '');
  }

  @Post('netopia/notify')
  @HttpCode(200)
  notify(@Body() body: unknown, @Headers('verification-token') token: string) {
    if (!Buffer.isBuffer(body) || !token)
      throw new HttpException('Notificare invalidă.', 400);
    return this.membership.notifyNetopia(body, token);
  }

  @Post('stripe/notify')
  @HttpCode(200)
  stripeNotify(
    @Body() body: unknown,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!Buffer.isBuffer(body) || !signature)
      throw new HttpException('Notificare invalidă.', 400);
    return this.membership.notifyStripe(body, signature);
  }

  @UseGuards(AuthGuard)
  @Get('mine')
  @Header('Cache-Control', 'no-store')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.membership.mine(user);
  }

  @UseGuards(AuthGuard)
  @Post('checkout')
  checkout(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.checkout(body, user);
  }

  @UseGuards(AuthGuard)
  @Get('admin')
  @Header('Cache-Control', 'no-store')
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.membership.dashboard(user);
    this.membership.scheduleAutomaticRosterSync(user);
    return result;
  }

  @UseGuards(AuthGuard)
  @Post('roster/preview')
  rosterPreview(@CurrentUser() user: AuthenticatedUser) {
    return this.membership.rosterPreview(user);
  }

  @UseGuards(AuthGuard)
  @Post('roster/initialize')
  initializeRoster(@CurrentUser() user: AuthenticatedUser) {
    return this.membership.synchronizeRoster(user, 'initialization');
  }

  @UseGuards(AuthGuard)
  @Post('roster/sync')
  syncRoster(@CurrentUser() user: AuthenticatedUser) {
    return this.membership.synchronizeRoster(user, 'manual');
  }

  @UseGuards(AuthGuard)
  @Post('payment-provider')
  paymentProvider(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.membership.selectPaymentProvider(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('payment-provider/configuration')
  paymentProviderConfiguration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return this.membership.configurePaymentProvider(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('payment-provider/processing-fee')
  processingFee(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.configureProcessingFee(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('national-items/:id/retry')
  retryOrgo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.membership.retryOrgo(user, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('periods')
  period(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.createPeriod(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('periods/:id/activate')
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.membership.activatePeriod(user, id);
  }

  @UseGuards(AuthGuard)
  @Post('obligations')
  obligation(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.createObligation(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('bank-receipts')
  receipt(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.bankReceipt(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('receipts/:id/reconcile')
  reconcile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.membership.reconcileReceipt(user, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('payouts')
  payout(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.recordPayout(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('checkouts/:id/close')
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.membership.closeAttempt(user, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('allocations')
  allocate(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.allocate(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('allocations/:id/reverse')
  reverse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.membership.reverse(user, id, body);
  }

  @UseGuards(AuthGuard)
  @Post('national-batches')
  batch(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.membership.nationalBatch(user, body);
  }

  @UseGuards(AuthGuard)
  @Post('national-items/:id/confirm')
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.membership.confirmOrgo(user, id, body);
  }
}

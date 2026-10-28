import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { MembershipModule } from '../membership/membership.module';
import { ParentalConsentModule } from '../parental-consent/parental-consent.module';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { RegistrationPaymentsService } from './registration-payments.service';
import { RegistrationMailService } from './registration-mail.service';
@Module({
  imports: [AuthModule, MembersModule, MembershipModule, ParentalConsentModule],
  controllers: [RegistrationController],
  providers: [
    RegistrationService,
    RegistrationPaymentsService,
    RegistrationMailService,
  ],
  exports: [RegistrationService],
})
export class RegistrationModule {}

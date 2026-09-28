import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../auth/auth.module';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import { MEMBERSHIP_ENTITIES } from './entities/membership.entity';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { NetopiaService } from './netopia.service';
import { StripeService } from './stripe.service';
import { PaymentConfigurationService } from './payment-configuration.service';
import { PaymentSecretVault } from './payment-secret-vault.service';

@Module({
  imports: [
    AuthModule,
    MikroOrmModule.forFeature([...MEMBERSHIP_ENTITIES, AuditEntry]),
  ],
  controllers: [MembershipController],
  providers: [
    MembershipService,
    NetopiaService,
    StripeService,
    PaymentConfigurationService,
    PaymentSecretVault,
  ],
})
export class MembershipModule {}

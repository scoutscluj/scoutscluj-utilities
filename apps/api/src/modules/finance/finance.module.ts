import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Activity } from '../activities/entities/activity.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { FinanceSettings } from './entities/finance-settings.entity';
import { FinancialDocumentAudit } from './entities/financial-document-audit.entity';
import { FinancialDocumentHandoffAttempt } from './entities/financial-document-handoff-attempt.entity';
import { FinancialDocument } from './entities/financial-document.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { KeezService } from './keez.service';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    MikroOrmModule.forFeature([
      FinancialDocument,
      FinancialDocumentAudit,
      FinancialDocumentHandoffAttempt,
      FinanceSettings,
      Activity,
      User,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService, KeezService],
  exports: [FinanceService],
})
export class FinanceModule {}

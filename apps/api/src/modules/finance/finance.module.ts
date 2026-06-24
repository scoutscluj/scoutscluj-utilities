import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { FinanceSettings } from './entities/finance-settings.entity';
import { FinancialDocumentAudit } from './entities/financial-document-audit.entity';
import { FinancialDocument } from './entities/financial-document.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { KeezService } from './keez.service';

@Module({
  imports: [
    AuthModule,
    MikroOrmModule.forFeature([
      FinancialDocument,
      FinancialDocumentAudit,
      FinanceSettings,
      User,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService, KeezService],
})
export class FinanceModule {}

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CalendarsModule } from './modules/calendars/calendars.module';
import { MembershipModule } from './modules/membership/membership.module';
import { MembersModule } from './modules/members/members.module';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createMikroOrmOptions } from './config/database.config';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { UsersAdminModule } from './modules/users/users-admin.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ParentalConsentModule } from './modules/parental-consent/parental-consent.module';
import { PersonalObjectivesModule } from './modules/personal-objectives/personal-objectives.module';
import { AdultDocumentsModule } from './modules/adult-documents/adult-documents.module';
import { RegistrationModule } from './modules/activity-registrations/registration.module';
import { StructuredExceptionFilter } from './common/logging/structured-exception.filter';
import { StructuredExceptionLogger } from './common/logging/structured-exception.logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env', '.env.local', '.env'],
    }),
    MikroOrmModule.forRoot(createMikroOrmOptions()),
    HealthModule,
    CalendarsModule,
    AuthModule,
    UsersAdminModule,
    AuditModule,
    ActivitiesModule,
    FinanceModule,
    MembershipModule,
    MembersModule,
    InventoryModule,
    KitchenModule,
    NotificationsModule,
    ParentalConsentModule,
    PersonalObjectivesModule,
    AdultDocumentsModule,
    RegistrationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    StructuredExceptionLogger,
    { provide: APP_FILTER, useClass: StructuredExceptionFilter },
  ],
})
export class AppModule {}

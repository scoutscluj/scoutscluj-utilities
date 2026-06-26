import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationDeliveryLog } from './entities/notification-delivery-log.entity';
import { NotificationMessage } from './entities/notification-message.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    AuthModule,
    MikroOrmModule.forFeature([
      PushSubscription,
      NotificationMessage,
      NotificationDeliveryLog,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

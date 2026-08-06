import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Activity } from '../activities/entities/activity.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { InventoryItemImage } from './entities/inventory-item-image.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    MikroOrmModule.forFeature([
      InventoryItem,
      InventoryItemImage,
      Activity,
      User,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

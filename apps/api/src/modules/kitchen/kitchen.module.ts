import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Activity } from '../activities/entities/activity.entity';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FinancialDocument } from '../finance/entities/financial-document.entity';
import { FinanceModule } from '../finance/finance.module';
import { KitchenDay } from './entities/kitchen-day.entity';
import { KitchenIngredient } from './entities/kitchen-ingredient.entity';
import { KitchenMealAttendance } from './entities/kitchen-meal-attendance.entity';
import { KitchenMealRecipe } from './entities/kitchen-meal-recipe.entity';
import { KitchenMeal } from './entities/kitchen-meal.entity';
import { KitchenPlanIngredientEstimate } from './entities/kitchen-plan-ingredient-estimate.entity';
import { KitchenPlan } from './entities/kitchen-plan.entity';
import { KitchenProcurementDocument } from './entities/kitchen-procurement-document.entity';
import { KitchenProcurementEvent } from './entities/kitchen-procurement-event.entity';
import { KitchenProcurementItem } from './entities/kitchen-procurement-item.entity';
import { KitchenQuantityAdjustment } from './entities/kitchen-quantity-adjustment.entity';
import { KitchenRecipeIngredient } from './entities/kitchen-recipe-ingredient.entity';
import { KitchenRecipe } from './entities/kitchen-recipe.entity';
import { KitchenCalculationService } from './kitchen-calculation.service';
import { KitchenController } from './kitchen.controller';
import { KitchenSeedService } from './kitchen-seed.service';
import { KitchenService } from './kitchen.service';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    FinanceModule,
    MikroOrmModule.forFeature([
      Activity,
      FinancialDocument,
      KitchenIngredient,
      KitchenRecipe,
      KitchenRecipeIngredient,
      KitchenPlan,
      KitchenDay,
      KitchenMeal,
      KitchenMealRecipe,
      KitchenMealAttendance,
      KitchenQuantityAdjustment,
      KitchenPlanIngredientEstimate,
      KitchenProcurementEvent,
      KitchenProcurementItem,
      KitchenProcurementDocument,
    ]),
  ],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenCalculationService, KitchenSeedService],
  exports: [KitchenSeedService],
})
export class KitchenModule {}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  KitchenAttendanceMode,
  KitchenDayStatus,
  KitchenMealSlot,
  KitchenProcurementMethod,
  KitchenProcurementStatus,
  KitchenRecipeScalingMode,
  KitchenUnitFamily,
} from '../entities/kitchen.enums';

export class KitchenIngredientDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  legacySourceId?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ enum: KitchenUnitFamily })
  unitFamily!: KitchenUnitFamily;

  @ApiProperty()
  defaultUnit!: string;

  @ApiProperty()
  defaultPricePerUnit!: number;
}

export class UpsertKitchenIngredientDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  defaultUnit!: string;

  @ApiProperty()
  defaultPricePerUnit!: number;
}

export class KitchenRecipeIngredientDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  ingredientName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit!: string;
}

export class KitchenRecipeDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  legacySourceId?: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  servings!: number;

  @ApiProperty({ type: [KitchenRecipeIngredientDto] })
  ingredients!: KitchenRecipeIngredientDto[];
}

export class UpsertKitchenRecipeIngredientDto {
  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit!: string;
}

export class UpsertKitchenRecipeDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  servings!: number;

  @ApiPropertyOptional({ type: [UpsertKitchenRecipeIngredientDto] })
  ingredients?: UpsertKitchenRecipeIngredientDto[];
}

export class KitchenPlanDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  activityId!: number;

  @ApiProperty()
  defaultParticipantCount!: number;

  @ApiProperty()
  hasCompleteActivityDates!: boolean;
}

export class CreateKitchenPlanDto {
  @ApiPropertyOptional()
  defaultParticipantCount?: number;
}

export class KitchenDayDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  date!: string;

  @ApiProperty({ enum: KitchenDayStatus })
  dateStatus!: KitchenDayStatus;
}

export class KitchenMealRecipeDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  mealId!: number;

  @ApiProperty()
  recipeId!: number;

  @ApiProperty()
  recipeName!: string;

  @ApiProperty()
  servings!: number;

  @ApiPropertyOptional()
  servingOverride?: number;

  @ApiProperty({ enum: KitchenRecipeScalingMode })
  scalingMode!: KitchenRecipeScalingMode;
}

export class KitchenMealAttendanceDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  subgroupName!: string;

  @ApiProperty()
  attendance!: number;
}

export class KitchenQuantityAdjustmentDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  mealId!: number;

  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  ingredientName!: string;

  @ApiProperty()
  quantityDelta!: number;

  @ApiProperty()
  unit!: string;

  @ApiPropertyOptional()
  notes?: string;
}

export class KitchenMealDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  kitchenDayId!: number;

  @ApiProperty({ enum: KitchenMealSlot })
  slot!: KitchenMealSlot;

  @ApiPropertyOptional()
  context?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ enum: KitchenAttendanceMode })
  attendanceMode!: KitchenAttendanceMode;

  @ApiProperty()
  attendanceTotal!: number;

  @ApiProperty({ type: [KitchenMealRecipeDto] })
  recipes!: KitchenMealRecipeDto[];

  @ApiProperty({ type: [KitchenMealAttendanceDto] })
  attendance!: KitchenMealAttendanceDto[];

  @ApiProperty({ type: [KitchenQuantityAdjustmentDto] })
  adjustments!: KitchenQuantityAdjustmentDto[];
}

export class UpsertKitchenMealDto {
  @ApiProperty()
  kitchenDayId!: number;

  @ApiProperty({ enum: KitchenMealSlot })
  slot!: KitchenMealSlot;

  @ApiPropertyOptional()
  context?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: KitchenAttendanceMode })
  attendanceMode?: KitchenAttendanceMode;
}

export class AssignKitchenMealRecipeDto {
  @ApiProperty()
  recipeId!: number;

  @ApiPropertyOptional()
  servingOverride?: number;

  @ApiPropertyOptional({ enum: KitchenRecipeScalingMode })
  scalingMode?: KitchenRecipeScalingMode;
}

export class ReplaceKitchenMealAttendanceDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        subgroupName: { type: 'string' },
        attendance: { type: 'number' },
      },
    },
  })
  rows!: Array<{ subgroupName: string; attendance: number }>;
}

export class CreateKitchenQuantityAdjustmentDto {
  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  quantityDelta!: number;

  @ApiProperty()
  unit!: string;

  @ApiPropertyOptional()
  notes?: string;
}

export class KitchenIngredientNeedDto {
  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  ingredientName!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  neededQuantity!: number;

  @ApiProperty()
  procuredQuantity!: number;

  @ApiProperty()
  remainingQuantity!: number;

  @ApiProperty()
  coveragePercent!: number;

  @ApiProperty()
  estimatedCost!: number;

  @ApiProperty()
  breakdown!: Array<{
    date: string;
    mealId: number;
    mealLabel: string;
    quantity: number;
  }>;
}

export class KitchenOverviewDto {
  @ApiProperty({ type: KitchenPlanDto })
  plan!: KitchenPlanDto;

  @ApiProperty({ type: [KitchenDayDto] })
  days!: KitchenDayDto[];

  @ApiProperty({ type: [KitchenMealDto] })
  meals!: KitchenMealDto[];

  @ApiProperty({ type: [KitchenIngredientNeedDto] })
  ingredientNeeds!: KitchenIngredientNeedDto[];
}

export class KitchenProcurementItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  procurementEventId!: number;

  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  ingredientName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit!: string;

  @ApiPropertyOptional()
  estimatedUnitPrice?: number;

  @ApiPropertyOptional()
  estimatedTotalCost?: number;

  @ApiPropertyOptional()
  realUnitPrice?: number;

  @ApiPropertyOptional()
  realTotalCost?: number;

  @ApiPropertyOptional()
  notes?: string;
}

export class KitchenProcurementDocumentDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  procurementEventId!: number;

  @ApiProperty()
  financialDocumentId!: number;
}

export class KitchenProcurementEventDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  kitchenPlanId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  supplier?: string;

  @ApiPropertyOptional()
  date?: string;

  @ApiProperty({ enum: KitchenProcurementMethod })
  method!: KitchenProcurementMethod;

  @ApiProperty({ enum: KitchenProcurementStatus })
  status!: KitchenProcurementStatus;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: [KitchenProcurementItemDto] })
  items!: KitchenProcurementItemDto[];

  @ApiProperty({ type: [KitchenProcurementDocumentDto] })
  documents!: KitchenProcurementDocumentDto[];
}

export class UpsertKitchenProcurementEventDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  supplier?: string;

  @ApiPropertyOptional()
  date?: string;

  @ApiPropertyOptional({ enum: KitchenProcurementMethod })
  method?: KitchenProcurementMethod;

  @ApiPropertyOptional({ enum: KitchenProcurementStatus })
  status?: KitchenProcurementStatus;

  @ApiPropertyOptional()
  notes?: string;
}

export class UpsertKitchenProcurementItemDto {
  @ApiProperty()
  ingredientId!: number;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unit!: string;

  @ApiPropertyOptional()
  estimatedUnitPrice?: number;

  @ApiPropertyOptional()
  estimatedTotalCost?: number;

  @ApiPropertyOptional()
  realUnitPrice?: number;

  @ApiPropertyOptional()
  realTotalCost?: number;

  @ApiPropertyOptional()
  notes?: string;
}

export class LinkProcurementDocumentDto {
  @ApiProperty()
  financialDocumentId!: number;
}

export class UploadProcurementDocumentDto {
  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  contentBase64!: string;

  @ApiPropertyOptional()
  notes?: string;
}

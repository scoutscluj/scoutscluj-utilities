import { BadRequestException } from '@nestjs/common';
import { KitchenCalculationService } from './kitchen-calculation.service';
import type { KitchenDay } from './entities/kitchen-day.entity';
import {
  KitchenAttendanceMode,
  KitchenDayStatus,
  KitchenMealSlot,
  KitchenRecipeScalingMode,
  KitchenUnitFamily,
} from './entities/kitchen.enums';
import type { KitchenIngredient } from './entities/kitchen-ingredient.entity';
import type { KitchenMealAttendance } from './entities/kitchen-meal-attendance.entity';
import type { KitchenMealRecipe } from './entities/kitchen-meal-recipe.entity';
import type { KitchenMeal } from './entities/kitchen-meal.entity';
import type { KitchenPlanIngredientEstimate } from './entities/kitchen-plan-ingredient-estimate.entity';
import type { KitchenPlan } from './entities/kitchen-plan.entity';
import type { KitchenProcurementItem } from './entities/kitchen-procurement-item.entity';
import type { KitchenQuantityAdjustment } from './entities/kitchen-quantity-adjustment.entity';
import type { KitchenRecipeIngredient } from './entities/kitchen-recipe-ingredient.entity';
import type { KitchenRecipe } from './entities/kitchen-recipe.entity';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

const plan = (overrides: Partial<KitchenPlan> = {}): KitchenPlan =>
  ({
    id: 1,
    activityId: 10,
    defaultParticipantCount: 25,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenPlan;

const day = (overrides: Partial<KitchenDay> = {}): KitchenDay =>
  ({
    id: 1,
    kitchenPlanId: 1,
    date: new Date('2026-07-01T00:00:00.000Z'),
    dateStatus: KitchenDayStatus.Current,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenDay;

const ingredient = (
  overrides: Partial<KitchenIngredient> = {},
): KitchenIngredient =>
  ({
    id: 1,
    legacySourceId: null,
    name: 'Orez',
    category: 'Baza',
    unitFamily: KitchenUnitFamily.Mass,
    defaultUnit: 'KG',
    defaultPricePerUnit: 8,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenIngredient;

const recipe = (overrides: Partial<KitchenRecipe> = {}): KitchenRecipe =>
  ({
    id: 1,
    legacySourceId: null,
    name: 'Orez cu legume',
    description: null,
    servings: 10,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenRecipe;

const meal = (overrides: Partial<KitchenMeal> = {}): KitchenMeal =>
  ({
    id: 1,
    kitchenDayId: 1,
    slot: KitchenMealSlot.Lunch,
    context: null,
    name: null,
    sortOrder: 0,
    attendanceMode: KitchenAttendanceMode.PlanDefault,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenMeal;

const mealRecipe = (
  overrides: Partial<KitchenMealRecipe> = {},
): KitchenMealRecipe =>
  ({
    id: 1,
    mealId: 1,
    recipeId: 1,
    servingOverride: null,
    scalingMode: KitchenRecipeScalingMode.Proportional,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenMealRecipe;

const recipeIngredient = (
  overrides: Partial<KitchenRecipeIngredient> = {},
): KitchenRecipeIngredient =>
  ({
    id: 1,
    legacySourceId: null,
    recipeId: 1,
    ingredientId: 1,
    quantity: 1,
    unit: 'KG',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenRecipeIngredient;

const attendance = (
  overrides: Partial<KitchenMealAttendance> = {},
): KitchenMealAttendance =>
  ({
    id: 1,
    mealId: 1,
    subgroupName: 'Lupisori',
    attendance: 12,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenMealAttendance;

const adjustment = (
  overrides: Partial<KitchenQuantityAdjustment> = {},
): KitchenQuantityAdjustment =>
  ({
    id: 1,
    mealId: 1,
    ingredientId: 1,
    quantityDelta: -250,
    unit: 'G',
    notes: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenQuantityAdjustment;

const estimate = (
  overrides: Partial<KitchenPlanIngredientEstimate> = {},
): KitchenPlanIngredientEstimate =>
  ({
    id: 1,
    kitchenPlanId: 1,
    ingredientId: 1,
    estimatedUnitPrice: 9,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenPlanIngredientEstimate;

const procurementItem = (
  overrides: Partial<KitchenProcurementItem> = {},
): KitchenProcurementItem =>
  ({
    id: 1,
    procurementEventId: 1,
    ingredientId: 1,
    quantity: 2,
    unit: 'KG',
    estimatedUnitPrice: null,
    estimatedTotalCost: null,
    realUnitPrice: null,
    realTotalCost: null,
    notes: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }) as KitchenProcurementItem;

describe(KitchenCalculationService.name, () => {
  const service = new KitchenCalculationService();

  const calculate = (
    overrides: Partial<Parameters<typeof service.calculateIngredientNeeds>[0]> =
      {},
  ) =>
    service.calculateIngredientNeeds({
      plan: plan(),
      days: [day()],
      meals: [meal()],
      mealRecipes: [mealRecipe()],
      mealAttendance: [],
      adjustments: [],
      ingredients: [ingredient()],
      recipes: [recipe()],
      recipeIngredients: [recipeIngredient()],
      estimates: [],
      procurementItems: [],
      ...overrides,
    });

  it('scales proportionally, aggregates duplicate ingredients, applies adjustments, and calculates coverage', () => {
    const [need] = calculate({
      recipeIngredients: [
        recipeIngredient({ id: 1, quantity: 1, unit: 'KG' }),
        recipeIngredient({ id: 2, quantity: 500, unit: 'G' }),
      ],
      adjustments: [adjustment()],
      estimates: [estimate()],
      procurementItems: [procurementItem()],
    });

    expect(need).toMatchObject({
      ingredientId: 1,
      neededQuantity: 3.5,
      procuredQuantity: 2,
      remainingQuantity: 1.5,
      coveragePercent: 57.1429,
      estimatedCost: 31.5,
    });
    expect(need.breakdown).toHaveLength(3);
  });

  it('uses custom attendance rows instead of the plan default', () => {
    const [need] = calculate({
      meals: [meal({ attendanceMode: KitchenAttendanceMode.Custom })],
      mealAttendance: [
        attendance({ id: 1, subgroupName: 'Lupisori', attendance: 7 }),
        attendance({ id: 2, subgroupName: 'Temerari', attendance: 5 }),
      ],
    });

    expect(need.neededQuantity).toBe(1.2);
  });

  it('rounds whole-batch recipes up to the next full batch', () => {
    const [need] = calculate({
      mealRecipes: [
        mealRecipe({ scalingMode: KitchenRecipeScalingMode.WholeBatch }),
      ],
    });

    expect(need.neededQuantity).toBe(3);
  });

  it('rejects incompatible unit families', () => {
    expect(() =>
      calculate({
        recipeIngredients: [recipeIngredient({ unit: 'L' })],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects automatic conversion between count units', () => {
    expect(() =>
      calculate({
        ingredients: [
          ingredient({
            unitFamily: KitchenUnitFamily.Count,
            defaultUnit: 'UNIT',
          }),
        ],
        recipeIngredients: [recipeIngredient({ quantity: 2, unit: 'PACK' })],
      }),
    ).toThrow(BadRequestException);
  });
});

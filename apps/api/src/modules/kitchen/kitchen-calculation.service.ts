import { BadRequestException, Injectable } from '@nestjs/common';
import type { KitchenDay } from './entities/kitchen-day.entity';
import {
  KitchenAttendanceMode,
  KitchenMealSlot,
  KitchenRecipeScalingMode,
  KitchenUnitFamily,
} from './entities/kitchen.enums';
import type { KitchenIngredient } from './entities/kitchen-ingredient.entity';
import type { KitchenMealAttendance } from './entities/kitchen-meal-attendance.entity';
import type {
  KitchenAssignedRecipeIngredientSnapshot,
  KitchenMealRecipe,
} from './entities/kitchen-meal-recipe.entity';
import type { KitchenMeal } from './entities/kitchen-meal.entity';
import type { KitchenPlanIngredientEstimate } from './entities/kitchen-plan-ingredient-estimate.entity';
import type { KitchenPlan } from './entities/kitchen-plan.entity';
import type { KitchenProcurementItem } from './entities/kitchen-procurement-item.entity';
import type { KitchenQuantityAdjustment } from './entities/kitchen-quantity-adjustment.entity';
import type { KitchenRecipeIngredient } from './entities/kitchen-recipe-ingredient.entity';
import type { KitchenRecipe } from './entities/kitchen-recipe.entity';

export type IngredientNeedBreakdown = {
  date: string;
  mealId: number;
  mealLabel: string;
  quantity: number;
  estimatedCost: number;
};

export type IngredientNeed = {
  ingredientId: number;
  ingredientName: string;
  category: string;
  unit: string;
  neededQuantity: number;
  procuredQuantity: number;
  remainingQuantity: number;
  coveragePercent: number;
  estimatedCost: number;
  breakdown: IngredientNeedBreakdown[];
};

export type MealCoverageItem = {
  ingredientId: number;
  ingredientName: string;
  neededQuantity: number;
  coveredQuantity: number;
  remainingQuantity: number;
  overCoveredQuantity: number;
  unit: string;
  state: 'uncovered' | 'partial' | 'covered';
};

export type MealCoverage = {
  mealId: number;
  kitchenDayId: number;
  date: string;
  slot: KitchenMealSlot;
  mealLabel: string;
  items: MealCoverageItem[];
  condiments: string[];
};

export type KitchenCalculationInput = {
  plan: KitchenPlan;
  days: KitchenDay[];
  meals: KitchenMeal[];
  mealRecipes: KitchenMealRecipe[];
  mealAttendance: KitchenMealAttendance[];
  adjustments: KitchenQuantityAdjustment[];
  ingredients: KitchenIngredient[];
  recipes: KitchenRecipe[];
  recipeIngredients: KitchenRecipeIngredient[];
  estimates: KitchenPlanIngredientEstimate[];
  procurementItems: KitchenProcurementItem[];
};

const unitAliases = new Map<string, string>([
  ['GRAM', 'G'],
  ['GRAME', 'G'],
  ['G', 'G'],
  ['KG', 'KG'],
  ['KILOGRAM', 'KG'],
  ['KILOGRAME', 'KG'],
  ['ML', 'ML'],
  ['L', 'L'],
  ['LITRU', 'L'],
  ['LITRI', 'L'],
  ['UNIT', 'UNIT'],
  ['BUC', 'UNIT'],
  ['BUCATA', 'UNIT'],
  ['BUCATI', 'UNIT'],
  ['PACK', 'PACK'],
  ['PACHET', 'PACK'],
  ['PACHETE', 'PACK'],
]);

const normalizeUnit = (unit: string) =>
  unitAliases.get(unit.trim().toUpperCase()) ?? unit.trim().toUpperCase();

export const inferKitchenUnitFamily = (unit: string): KitchenUnitFamily => {
  const normalized = normalizeUnit(unit);
  if (normalized === 'G' || normalized === 'KG') {
    return KitchenUnitFamily.Mass;
  }

  if (normalized === 'ML' || normalized === 'L') {
    return KitchenUnitFamily.Volume;
  }

  if (normalized === 'UNIT' || normalized === 'PACK') {
    return KitchenUnitFamily.Count;
  }

  throw new BadRequestException(`Unitatea ${unit} nu este acceptată.`);
};

const toBaseQuantity = (quantity: number, unit: string) => {
  const normalized = normalizeUnit(unit);
  switch (normalized) {
    case 'KG':
      return quantity * 1000;
    case 'G':
      return quantity;
    case 'L':
      return quantity * 1000;
    case 'ML':
      return quantity;
    case 'UNIT':
    case 'PACK':
      return quantity;
    default:
      throw new BadRequestException(`Unitatea ${unit} nu este acceptată.`);
  }
};

const fromBaseQuantity = (quantity: number, unit: string) => {
  const normalized = normalizeUnit(unit);
  switch (normalized) {
    case 'KG':
      return quantity / 1000;
    case 'G':
      return quantity;
    case 'L':
      return quantity / 1000;
    case 'ML':
      return quantity;
    case 'UNIT':
    case 'PACK':
      return quantity;
    default:
      throw new BadRequestException(`Unitatea ${unit} nu este acceptată.`);
  }
};

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;
const customAttendanceMode: string = KitchenAttendanceMode.Custom;
const wholeBatchScalingMode: string = KitchenRecipeScalingMode.WholeBatch;

export const convertKitchenQuantity = (
  quantity: number,
  fromUnit: string,
  ingredient: KitchenIngredient,
) => {
  const sourceFamily = inferKitchenUnitFamily(fromUnit);
  const targetFamily = inferKitchenUnitFamily(ingredient.defaultUnit);
  if (
    sourceFamily !== ingredient.unitFamily ||
    targetFamily !== ingredient.unitFamily
  ) {
    throw new BadRequestException(
      `Unitatea ${fromUnit} nu este compatibilă cu ingredientul ${ingredient.name}.`,
    );
  }

  const sourceUnit = normalizeUnit(fromUnit);
  const targetUnit = normalizeUnit(ingredient.defaultUnit);
  if (
    ingredient.unitFamily === KitchenUnitFamily.Count &&
    sourceUnit !== targetUnit
  ) {
    throw new BadRequestException(
      `Unitatea ${fromUnit} nu poate fi convertită automat în ${ingredient.defaultUnit}.`,
    );
  }

  return round(
    fromBaseQuantity(toBaseQuantity(quantity, fromUnit), targetUnit),
  );
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const mealLabel = (meal: KitchenMeal) =>
  [meal.slot, meal.context, meal.name].filter(Boolean).join(' - ');

const mealSlotOrder = (slot: KitchenMealSlot) =>
  [
    KitchenMealSlot.Breakfast,
    KitchenMealSlot.Snack1,
    KitchenMealSlot.Lunch,
    KitchenMealSlot.Snack2,
    KitchenMealSlot.Dinner,
  ].indexOf(slot);

type CalculationContext = {
  ingredients: Map<number, KitchenIngredient>;
  recipes: Map<number, KitchenRecipe>;
  recipeIngredientsByRecipe: Map<number, KitchenRecipeIngredient[]>;
  mealRecipesByMeal: Map<number, KitchenMealRecipe[]>;
  attendanceByMeal: Map<number, KitchenMealAttendance[]>;
  adjustmentsByMeal: Map<number, KitchenQuantityAdjustment[]>;
  days: Map<number, KitchenDay>;
  estimates: Map<number, number>;
};

type MealIngredientNeed = {
  ingredient: KitchenIngredient;
  quantity: number;
  estimatedCost: number;
  label: string;
};

@Injectable()
export class KitchenCalculationService {
  calculateIngredientNeeds(input: KitchenCalculationInput): IngredientNeed[] {
    const context = this.buildContext(input);
    const procuredByIngredient = this.procuredQuantities(
      input.procurementItems,
      context.ingredients,
    );
    const totals = new Map<
      number,
      {
        ingredient: KitchenIngredient;
        neededQuantity: number;
        estimatedCost: number;
        breakdown: IngredientNeedBreakdown[];
      }
    >();

    for (const meal of input.meals) {
      const day = context.days.get(meal.kitchenDayId);
      const mealDate = day ? dateKey(day.date) : '';
      for (const item of this.calculateMealIngredientNeeds(
        input,
        meal,
        context,
      )) {
        this.addNeed(totals, item.ingredient, item.quantity, {
          date: mealDate,
          mealId: meal.id,
          mealLabel: item.label,
          quantity: item.quantity,
          estimatedCost: item.estimatedCost,
        });
      }
    }

    return Array.from(totals.entries())
      .map(([ingredientId, total]) => {
        const neededQuantity = round(total.neededQuantity);
        const procuredQuantity = round(
          procuredByIngredient.get(ingredientId) ?? 0,
        );
        const remainingQuantity = round(
          Math.max(neededQuantity - procuredQuantity, 0),
        );
        const coveragePercent =
          neededQuantity > 0
            ? round(Math.min((procuredQuantity / neededQuantity) * 100, 100))
            : 100;

        return {
          ingredientId,
          ingredientName: total.ingredient.name,
          category: total.ingredient.category,
          unit: total.ingredient.defaultUnit,
          neededQuantity,
          procuredQuantity,
          remainingQuantity,
          coveragePercent,
          estimatedCost: round(total.estimatedCost),
          breakdown: total.breakdown,
        };
      })
      .sort((left, right) =>
        left.category === right.category
          ? left.ingredientName.localeCompare(right.ingredientName, 'ro')
          : left.category.localeCompare(right.category, 'ro'),
      );
  }

  calculateMealCoverage(input: KitchenCalculationInput): MealCoverage[] {
    const context = this.buildContext(input);
    const available = this.procuredQuantities(
      input.procurementItems,
      context.ingredients,
    );
    const meals = [...input.meals].sort((left, right) => {
      const leftDay = context.days.get(left.kitchenDayId);
      const rightDay = context.days.get(right.kitchenDayId);
      const dateCompare = (leftDay ? dateKey(leftDay.date) : '').localeCompare(
        rightDay ? dateKey(rightDay.date) : '',
      );
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return (
        mealSlotOrder(left.slot) - mealSlotOrder(right.slot) ||
        left.sortOrder - right.sortOrder ||
        left.id - right.id
      );
    });

    return meals.map((meal) => {
      const day = context.days.get(meal.kitchenDayId);
      const mealNeeds = this.calculateMealIngredientNeeds(input, meal, context);
      const groupedNeeds = new Map<
        number,
        { ingredient: KitchenIngredient; neededQuantity: number }
      >();

      for (const need of mealNeeds) {
        const existing = groupedNeeds.get(need.ingredient.id) ?? {
          ingredient: need.ingredient,
          neededQuantity: 0,
        };
        existing.neededQuantity = round(
          existing.neededQuantity + need.quantity,
        );
        groupedNeeds.set(need.ingredient.id, existing);
      }

      const items = Array.from(groupedNeeds.values()).map((need) => {
        const supply = available.get(need.ingredient.id) ?? 0;
        const coveredQuantity = round(
          Math.min(Math.max(supply, 0), need.neededQuantity),
        );
        const remainingQuantity = round(
          Math.max(need.neededQuantity - coveredQuantity, 0),
        );
        const overCoveredQuantity = round(
          Math.max(supply - need.neededQuantity, 0),
        );
        available.set(
          need.ingredient.id,
          round(Math.max(supply - need.neededQuantity, 0)),
        );

        return {
          ingredientId: need.ingredient.id,
          ingredientName: need.ingredient.name,
          neededQuantity: round(need.neededQuantity),
          coveredQuantity,
          remainingQuantity,
          overCoveredQuantity,
          unit: need.ingredient.defaultUnit,
          state:
            remainingQuantity === 0
              ? 'covered'
              : coveredQuantity > 0
                ? 'partial'
                : 'uncovered',
        } satisfies MealCoverageItem;
      });

      return {
        mealId: meal.id,
        kitchenDayId: meal.kitchenDayId,
        date: day ? dateKey(day.date) : '',
        slot: meal.slot,
        mealLabel: mealLabel(meal),
        items,
        condiments: this.condimentsForMeal(meal, context),
      };
    });
  }

  mealAttendance(
    plan: KitchenPlan,
    meal: KitchenMeal,
    rows: KitchenMealAttendance[],
  ) {
    if (meal.attendanceMode === customAttendanceMode) {
      return rows.reduce((sum, row) => sum + row.attendance, 0);
    }

    return plan.defaultParticipantCount;
  }

  private addNeed(
    totals: Map<
      number,
      {
        ingredient: KitchenIngredient;
        neededQuantity: number;
        estimatedCost: number;
        breakdown: IngredientNeedBreakdown[];
      }
    >,
    ingredient: KitchenIngredient,
    quantity: number,
    breakdown: IngredientNeedBreakdown,
  ) {
    const existing = totals.get(ingredient.id) ?? {
      ingredient,
      neededQuantity: 0,
      estimatedCost: 0,
      breakdown: [],
    };
    existing.neededQuantity += quantity;
    existing.estimatedCost += breakdown.estimatedCost;
    existing.breakdown.push({
      ...breakdown,
      quantity: round(breakdown.quantity),
      estimatedCost: round(breakdown.estimatedCost),
    });
    totals.set(ingredient.id, existing);
  }

  private buildContext(input: KitchenCalculationInput): CalculationContext {
    return {
      ingredients: new Map(
        input.ingredients.map((ingredient) => [ingredient.id, ingredient]),
      ),
      recipes: new Map(input.recipes.map((recipe) => [recipe.id, recipe])),
      recipeIngredientsByRecipe: this.groupBy(
        input.recipeIngredients,
        (recipeIngredient) => recipeIngredient.recipeId,
      ),
      mealRecipesByMeal: this.groupBy(
        input.mealRecipes,
        (mealRecipe) => mealRecipe.mealId,
      ),
      attendanceByMeal: this.groupBy(
        input.mealAttendance,
        (attendance) => attendance.mealId,
      ),
      adjustmentsByMeal: this.groupBy(
        input.adjustments,
        (adjustment) => adjustment.mealId,
      ),
      days: new Map(input.days.map((day) => [day.id, day])),
      estimates: new Map(
        input.estimates.map((estimate) => [
          estimate.ingredientId,
          estimate.estimatedUnitPrice,
        ]),
      ),
    };
  }

  private calculateMealIngredientNeeds(
    input: KitchenCalculationInput,
    meal: KitchenMeal,
    context: CalculationContext,
  ): MealIngredientNeed[] {
    const attendance = this.mealAttendance(
      input.plan,
      meal,
      context.attendanceByMeal.get(meal.id) ?? [],
    );
    const needs: MealIngredientNeed[] = [];

    for (const mealRecipe of context.mealRecipesByMeal.get(meal.id) ?? []) {
      const recipe = context.recipes.get(mealRecipe.recipeId);
      const effectiveServings =
        mealRecipe.servingOverride ??
        mealRecipe.recipeServingsSnapshot ??
        recipe?.servings ??
        0;
      if (effectiveServings <= 0) {
        throw new BadRequestException('Numărul de porții nu este valid.');
      }

      const scale =
        mealRecipe.scalingMode === wholeBatchScalingMode
          ? Math.ceil(attendance / effectiveServings)
          : attendance / effectiveServings;

      for (const row of this.recipeRows(mealRecipe, context)) {
        const quantity = convertKitchenQuantity(
          row.quantity * scale,
          row.unit,
          row.ingredient,
        );
        needs.push({
          ingredient: row.ingredient,
          quantity,
          estimatedCost: round(quantity * row.estimatedUnitPrice),
          label: mealLabel(meal),
        });
      }
    }

    for (const adjustment of context.adjustmentsByMeal.get(meal.id) ?? []) {
      const ingredient = context.ingredients.get(adjustment.ingredientId);
      if (!ingredient) {
        continue;
      }

      const quantity = convertKitchenQuantity(
        adjustment.quantityDelta,
        adjustment.unit,
        ingredient,
      );
      const unitPrice =
        context.estimates.get(ingredient.id) ??
        ingredient.defaultPricePerUnit ??
        0;
      needs.push({
        ingredient,
        quantity,
        estimatedCost: round(quantity * unitPrice),
        label: `${mealLabel(meal)} (ajustare)`,
      });
    }

    return needs;
  }

  private recipeRows(
    mealRecipe: KitchenMealRecipe,
    context: CalculationContext,
  ) {
    const snapshotRows = mealRecipe.ingredientsSnapshot ?? [];
    if (snapshotRows.length) {
      return snapshotRows.map((row) => ({
        ingredient: this.snapshotIngredient(row),
        quantity: row.quantity,
        unit: row.unit,
        estimatedUnitPrice: row.estimatedUnitPrice,
      }));
    }

    return (context.recipeIngredientsByRecipe.get(mealRecipe.recipeId) ?? [])
      .map((recipeIngredient) => {
        const ingredient = context.ingredients.get(
          recipeIngredient.ingredientId,
        );
        if (!ingredient) {
          return undefined;
        }

        return {
          ingredient,
          quantity: recipeIngredient.quantity,
          unit: recipeIngredient.unit,
          estimatedUnitPrice:
            context.estimates.get(ingredient.id) ??
            ingredient.defaultPricePerUnit ??
            0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }

  private snapshotIngredient(
    row: KitchenAssignedRecipeIngredientSnapshot,
  ): KitchenIngredient {
    return {
      id: row.ingredientId,
      legacySourceId: null,
      name: row.ingredientName,
      category: row.category,
      unitFamily: row.unitFamily,
      defaultUnit: row.defaultUnit,
      defaultPricePerUnit: row.estimatedUnitPrice,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }

  private condimentsForMeal(
    meal: KitchenMeal,
    context: CalculationContext,
  ): string[] {
    const condiments = new Set<string>();
    for (const mealRecipe of context.mealRecipesByMeal.get(meal.id) ?? []) {
      const recipe = context.recipes.get(mealRecipe.recipeId);
      const values = mealRecipe.condimentsSnapshot?.length
        ? mealRecipe.condimentsSnapshot
        : (recipe?.condiments ?? []);
      values
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => condiments.add(item));
    }

    return Array.from(condiments).sort((left, right) =>
      left.localeCompare(right, 'ro'),
    );
  }

  private procuredQuantities(
    procurementItems: KitchenProcurementItem[],
    ingredients: Map<number, KitchenIngredient>,
  ) {
    const totals = new Map<number, number>();

    for (const item of procurementItems) {
      const ingredient = ingredients.get(item.ingredientId);
      if (!ingredient) {
        continue;
      }

      const converted = convertKitchenQuantity(
        item.quantity,
        item.unit,
        ingredient,
      );
      totals.set(
        item.ingredientId,
        round((totals.get(item.ingredientId) ?? 0) + converted),
      );
    }

    return totals;
  }

  private groupBy<T, TKey>(items: T[], key: (item: T) => TKey) {
    const groups = new Map<TKey, T[]>();
    for (const item of items) {
      const groupKey = key(item);
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
    }

    return groups;
  }
}

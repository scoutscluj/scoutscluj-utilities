import { BadRequestException, Injectable } from '@nestjs/common';
import type { KitchenDay } from './entities/kitchen-day.entity';
import {
  KitchenAttendanceMode,
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

export type IngredientNeedBreakdown = {
  date: string;
  mealId: number;
  mealLabel: string;
  quantity: number;
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

@Injectable()
export class KitchenCalculationService {
  calculateIngredientNeeds(input: KitchenCalculationInput): IngredientNeed[] {
    const ingredients = new Map(
      input.ingredients.map((ingredient) => [ingredient.id, ingredient]),
    );
    const recipes = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));
    const recipeIngredientsByRecipe = this.groupBy(
      input.recipeIngredients,
      (recipeIngredient) => recipeIngredient.recipeId,
    );
    const mealRecipesByMeal = this.groupBy(
      input.mealRecipes,
      (mealRecipe) => mealRecipe.mealId,
    );
    const attendanceByMeal = this.groupBy(
      input.mealAttendance,
      (attendance) => attendance.mealId,
    );
    const adjustmentsByMeal = this.groupBy(
      input.adjustments,
      (adjustment) => adjustment.mealId,
    );
    const days = new Map(input.days.map((day) => [day.id, day]));
    const estimates = new Map(
      input.estimates.map((estimate) => [
        estimate.ingredientId,
        estimate.estimatedUnitPrice,
      ]),
    );
    const procuredByIngredient = this.procuredQuantities(
      input.procurementItems,
      ingredients,
    );
    const totals = new Map<
      number,
      {
        neededQuantity: number;
        breakdown: IngredientNeedBreakdown[];
      }
    >();

    for (const meal of input.meals) {
      const attendance = this.mealAttendance(
        input.plan,
        meal,
        attendanceByMeal.get(meal.id) ?? [],
      );
      const day = days.get(meal.kitchenDayId);
      const mealDate = day ? dateKey(day.date) : '';

      for (const mealRecipe of mealRecipesByMeal.get(meal.id) ?? []) {
        const recipe = recipes.get(mealRecipe.recipeId);
        if (!recipe) {
          continue;
        }

        const effectiveServings = mealRecipe.servingOverride ?? recipe.servings;
        if (effectiveServings <= 0) {
          throw new BadRequestException('Numărul de porții nu este valid.');
        }

        const scale =
          mealRecipe.scalingMode === wholeBatchScalingMode
            ? Math.ceil(attendance / effectiveServings)
            : attendance / effectiveServings;

        for (const recipeIngredient of recipeIngredientsByRecipe.get(
          recipe.id,
        ) ?? []) {
          const ingredient = ingredients.get(recipeIngredient.ingredientId);
          if (!ingredient) {
            continue;
          }

          const quantity = convertKitchenQuantity(
            recipeIngredient.quantity * scale,
            recipeIngredient.unit,
            ingredient,
          );
          this.addNeed(totals, ingredient.id, quantity, {
            date: mealDate,
            mealId: meal.id,
            mealLabel: mealLabel(meal),
            quantity,
          });
        }
      }

      for (const adjustment of adjustmentsByMeal.get(meal.id) ?? []) {
        const ingredient = ingredients.get(adjustment.ingredientId);
        if (!ingredient) {
          continue;
        }

        const quantity = convertKitchenQuantity(
          adjustment.quantityDelta,
          adjustment.unit,
          ingredient,
        );
        this.addNeed(totals, ingredient.id, quantity, {
          date: mealDate,
          mealId: meal.id,
          mealLabel: `${mealLabel(meal)} (ajustare)`,
          quantity,
        });
      }
    }

    return Array.from(totals.entries())
      .map(([ingredientId, total]) => {
        const ingredient = ingredients.get(ingredientId);
        if (!ingredient) {
          throw new BadRequestException('Ingredientul nu există.');
        }

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
        const unitPrice =
          estimates.get(ingredientId) ?? ingredient.defaultPricePerUnit ?? 0;

        return {
          ingredientId,
          ingredientName: ingredient.name,
          category: ingredient.category,
          unit: ingredient.defaultUnit,
          neededQuantity,
          procuredQuantity,
          remainingQuantity,
          coveragePercent,
          estimatedCost: round(neededQuantity * unitPrice),
          breakdown: total.breakdown,
        };
      })
      .sort((left, right) =>
        left.category === right.category
          ? left.ingredientName.localeCompare(right.ingredientName, 'ro')
          : left.category.localeCompare(right.category, 'ro'),
      );
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
        neededQuantity: number;
        breakdown: IngredientNeedBreakdown[];
      }
    >,
    ingredientId: number,
    quantity: number,
    breakdown: IngredientNeedBreakdown,
  ) {
    const existing = totals.get(ingredientId) ?? {
      neededQuantity: 0,
      breakdown: [],
    };
    existing.neededQuantity += quantity;
    existing.breakdown.push({
      ...breakdown,
      quantity: round(breakdown.quantity),
    });
    totals.set(ingredientId, existing);
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

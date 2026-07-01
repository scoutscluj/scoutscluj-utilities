import { createHash } from 'node:crypto';
import type { KitchenIngredient } from './entities/kitchen-ingredient.entity';
import type {
  KitchenAssignedRecipeIngredientSnapshot,
  KitchenMealRecipe,
} from './entities/kitchen-meal-recipe.entity';
import type { KitchenPlanIngredientEstimate } from './entities/kitchen-plan-ingredient-estimate.entity';
import type { KitchenRecipeIngredient } from './entities/kitchen-recipe-ingredient.entity';
import type { KitchenRecipe } from './entities/kitchen-recipe.entity';

export type KitchenRecipeSnapshot = Pick<
  KitchenMealRecipe,
  | 'recipeNameSnapshot'
  | 'recipeServingsSnapshot'
  | 'ingredientsSnapshot'
  | 'condimentsSnapshot'
  | 'recipeSnapshotHash'
  | 'sourceRecipeUpdatedAt'
>;

type SnapshotInput = {
  recipe: KitchenRecipe;
  recipeIngredients: KitchenRecipeIngredient[];
  ingredientsById: Map<number, KitchenIngredient>;
  estimatesByIngredient: Map<number, number>;
};

export const estimatesMap = (estimates: KitchenPlanIngredientEstimate[]) =>
  new Map(
    estimates.map((estimate) => [
      estimate.ingredientId,
      estimate.estimatedUnitPrice,
    ]),
  );

export const ingredientsMap = (ingredients: KitchenIngredient[]) =>
  new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

export const buildKitchenRecipeSnapshot = ({
  recipe,
  recipeIngredients,
  ingredientsById,
  estimatesByIngredient,
}: SnapshotInput): KitchenRecipeSnapshot => ({
  recipeNameSnapshot: recipe.name,
  recipeServingsSnapshot: recipe.servings,
  ingredientsSnapshot: buildIngredientSnapshot(
    recipeIngredients,
    ingredientsById,
    estimatesByIngredient,
  ),
  condimentsSnapshot: recipe.condiments ?? [],
  recipeSnapshotHash: kitchenRecipeSnapshotHash({
    recipe,
    recipeIngredients,
    ingredientsById,
    estimatesByIngredient,
  }),
  sourceRecipeUpdatedAt: recipe.updatedAt,
});

export const kitchenRecipeSnapshotHash = ({
  recipe,
  recipeIngredients,
  ingredientsById,
  estimatesByIngredient,
}: SnapshotInput) => {
  const payload = {
    name: recipe.name,
    servings: recipe.servings,
    condiments: recipe.condiments ?? [],
    ingredients: recipeIngredients
      .map((item) => {
        const ingredient = ingredientsById.get(item.ingredientId);
        return {
          ingredientId: item.ingredientId,
          ingredientName: ingredient?.name,
          category: ingredient?.category,
          quantity: item.quantity,
          unit: item.unit,
          defaultUnit: ingredient?.defaultUnit,
          unitFamily: ingredient?.unitFamily,
          estimatedUnitPrice:
            estimatesByIngredient.get(item.ingredientId) ??
            ingredient?.defaultPricePerUnit ??
            0,
        };
      })
      .sort((left, right) => left.ingredientId - right.ingredientId),
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

const buildIngredientSnapshot = (
  recipeIngredients: KitchenRecipeIngredient[],
  ingredientsById: Map<number, KitchenIngredient>,
  estimatesByIngredient: Map<number, number>,
) =>
  recipeIngredients.flatMap((item) => {
    const ingredient = ingredientsById.get(item.ingredientId);
    if (!ingredient) {
      return [];
    }

    return [
      {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category,
        quantity: item.quantity,
        unit: item.unit,
        defaultUnit: ingredient.defaultUnit,
        unitFamily: ingredient.unitFamily,
        estimatedUnitPrice:
          estimatesByIngredient.get(ingredient.id) ??
          ingredient.defaultPricePerUnit ??
          0,
      } satisfies KitchenAssignedRecipeIngredientSnapshot,
    ];
  });

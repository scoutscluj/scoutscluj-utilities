import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Inject, Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inferKitchenUnitFamily } from './kitchen-calculation.service';
import { KitchenIngredient } from './entities/kitchen-ingredient.entity';
import { KitchenRecipeIngredient } from './entities/kitchen-recipe-ingredient.entity';
import { KitchenRecipe } from './entities/kitchen-recipe.entity';

type LegacyIngredientRow = {
  id: string;
  name: string;
  unit: string;
  default_price_per_unit: string;
  category: string;
};

type LegacyRecipeRow = {
  id: string;
  name: string;
  description?: string;
  servings: string;
};

type LegacyRecipeIngredientRow = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: string;
  unit: string;
};

type KitchenSeedResult = {
  ingredients: number;
  recipes: number;
  recipeIngredients: number;
};

const parseNumber = (value: string | number | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

@Injectable()
export class KitchenSeedService {
  constructor(
    @InjectRepository(KitchenIngredient)
    private readonly ingredientsRepository: EntityRepository<KitchenIngredient>,
    @InjectRepository(KitchenRecipe)
    private readonly recipesRepository: EntityRepository<KitchenRecipe>,
    @InjectRepository(KitchenRecipeIngredient)
    private readonly recipeIngredientsRepository: EntityRepository<KitchenRecipeIngredient>,
    @Inject(EntityManager)
    private readonly em: EntityManager,
  ) {}

  async importLegacyCatalog(exportsDir = this.findExportsDir()) {
    const ingredients = this.readJson<LegacyIngredientRow[]>(
      exportsDir,
      'ingredients.json',
    );
    const recipes = this.readJson<LegacyRecipeRow[]>(
      exportsDir,
      'recipes.json',
    );
    const recipeIngredients = this.readJson<LegacyRecipeIngredientRow[]>(
      exportsDir,
      'recipe_ingredients.json',
    );

    const importedIngredients = new Map<string, KitchenIngredient>();
    const importedRecipes = new Map<string, KitchenRecipe>();

    for (const row of ingredients) {
      const ingredient = await this.findIngredient(row);
      ingredient.legacySourceId = row.id;
      ingredient.name = row.name.trim();
      ingredient.category = row.category.trim() || 'Altele';
      ingredient.defaultUnit = row.unit.trim();
      ingredient.unitFamily = inferKitchenUnitFamily(row.unit);
      ingredient.defaultPricePerUnit = parseNumber(
        row.default_price_per_unit,
        0,
      );

      this.em.persist(ingredient);
      importedIngredients.set(row.id, ingredient);
    }

    await this.em.flush();

    for (const row of recipes) {
      const recipe = await this.findRecipe(row);
      recipe.legacySourceId = row.id;
      recipe.name = row.name.trim();
      recipe.description = row.description?.trim() || null;
      recipe.servings = Math.max(parseNumber(row.servings, 1), 1);

      this.em.persist(recipe);
      importedRecipes.set(row.id, recipe);
    }

    await this.em.flush();

    for (const row of recipeIngredients) {
      const recipe = importedRecipes.get(row.recipe_id);
      const ingredient = importedIngredients.get(row.ingredient_id);
      if (!recipe || !ingredient) {
        continue;
      }

      const recipeIngredient = await this.findRecipeIngredient(row);
      recipeIngredient.legacySourceId = row.id;
      recipeIngredient.recipeId = recipe.id;
      recipeIngredient.ingredientId = ingredient.id;
      recipeIngredient.quantity = parseNumber(row.quantity, 0);
      recipeIngredient.unit = row.unit.trim();

      this.em.persist(recipeIngredient);
    }

    await this.em.flush();

    return {
      ingredients: ingredients.length,
      recipes: recipes.length,
      recipeIngredients: recipeIngredients.length,
    } satisfies KitchenSeedResult;
  }

  private async findIngredient(row: LegacyIngredientRow) {
    return (
      (await this.ingredientsRepository.findOne({
        legacySourceId: row.id,
      })) ??
      (await this.ingredientsRepository.findOne({
        name: { $ilike: row.name.trim() },
      })) ??
      this.ingredientsRepository.create({
        name: row.name.trim(),
        category: row.category.trim() || 'Altele',
        defaultUnit: row.unit.trim(),
        unitFamily: inferKitchenUnitFamily(row.unit),
        defaultPricePerUnit: parseNumber(row.default_price_per_unit, 0),
      })
    );
  }

  private async findRecipe(row: LegacyRecipeRow) {
    return (
      (await this.recipesRepository.findOne({ legacySourceId: row.id })) ??
      (await this.recipesRepository.findOne({
        name: { $ilike: row.name.trim() },
      })) ??
      this.recipesRepository.create({
        name: row.name.trim(),
        description: row.description?.trim() || null,
        servings: Math.max(parseNumber(row.servings, 1), 1),
      })
    );
  }

  private async findRecipeIngredient(row: LegacyRecipeIngredientRow) {
    return (
      (await this.recipeIngredientsRepository.findOne({
        legacySourceId: row.id,
      })) ??
      this.recipeIngredientsRepository.create({
        recipeId: 0,
        ingredientId: 0,
        quantity: parseNumber(row.quantity, 0),
        unit: row.unit.trim(),
      })
    );
  }

  private readJson<T>(exportsDir: string, filename: string) {
    const filePath = join(exportsDir, filename);
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  }

  private findExportsDir() {
    const candidates = [
      process.env.KITCHEN_EXPORTS_DIR,
      join(__dirname, 'fixtures', 'legacy-catalog'),
    ].filter(Boolean) as string[];

    const found = candidates
      .map((candidate) => resolve(candidate))
      .find((candidate) => existsSync(join(candidate, 'ingredients.json')));

    if (!found) {
      throw new Error(
        'Nu am găsit exporturile vechi de bucătărie. Setează KITCHEN_EXPORTS_DIR.',
      );
    }

    return found;
  }
}

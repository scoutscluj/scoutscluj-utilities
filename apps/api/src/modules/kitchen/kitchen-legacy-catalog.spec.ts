import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type LegacyIngredientRow = {
  id: string;
  name: string;
};

type LegacyRecipeRow = {
  name: string;
  description?: string;
};

type LegacyRecipeIngredientRow = {
  ingredient_id: string;
  ingredient_name: string;
};

const readCatalogJson = <T>(filename: string) =>
  JSON.parse(
    readFileSync(
      join(__dirname, 'fixtures', 'legacy-catalog', filename),
      'utf8',
    ),
  ) as T;

const firstLetter = (value: string) =>
  [...value].find((character) => /\p{L}/u.test(character));

describe('legacy kitchen catalog fixtures', () => {
  const ingredients =
    readCatalogJson<LegacyIngredientRow[]>('ingredients.json');
  const recipes = readCatalogJson<LegacyRecipeRow[]>('recipes.json');
  const recipeIngredients = readCatalogJson<LegacyRecipeIngredientRow[]>(
    'recipe_ingredients.json',
  );

  it('keeps the imported catalog complete', () => {
    expect(ingredients).toHaveLength(91);
    expect(recipes).toHaveLength(42);
    expect(recipeIngredients).toHaveLength(201);
  });

  it('keeps ingredient labels lowercase and trimmed', () => {
    for (const ingredient of ingredients) {
      expect(ingredient.name).toBe(ingredient.name.trim());
      expect(firstLetter(ingredient.name)).toBe(
        firstLetter(ingredient.name)?.toLocaleLowerCase('ro-RO'),
      );
    }
  });

  it('keeps recipe titles sentence-cased and trimmed', () => {
    for (const recipe of recipes) {
      expect(recipe.name).toBe(recipe.name.trim());
      expect(firstLetter(recipe.name)).toBe(
        firstLetter(recipe.name)?.toLocaleUpperCase('ro-RO'),
      );
    }
  });

  it('keeps recipe ingredient labels in sync with ingredient labels', () => {
    const ingredientNames = new Map(
      ingredients.map((ingredient) => [ingredient.id, ingredient.name]),
    );

    for (const recipeIngredient of recipeIngredients) {
      expect(recipeIngredient.ingredient_name).toBe(
        ingredientNames.get(recipeIngredient.ingredient_id),
      );
    }
  });

  it('does not contain mojibake placeholders or common old spellings', () => {
    const catalogText = JSON.stringify({
      ingredients,
      recipes,
      recipeIngredients,
    });

    expect(catalogText).not.toContain('?');
    expect(catalogText).not.toMatch(
      /branza|smantana|carnaciori|ceapa|sunca|paine|rosii|sandwhich|gustrae|mamaliga|ciorba|ovaz|gris|otet|zahar|scortisoara|mustar/i,
    );
  });
});

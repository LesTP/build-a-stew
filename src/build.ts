import type { Ingredient, IngredientId, BuildIngredient, StewBuild, CookingStage } from './types';
import { COOKING_STAGES } from './types';

export class UnknownIngredientError extends Error {
  constructor(ingredientId: string) {
    super(`Unknown ingredient: ${ingredientId}`);
    this.name = 'UnknownIngredientError';
  }
}

export interface BuildIngredientPatch {
  quantity?: number;
  unit?: string;
  stage?: CookingStage;
}

function cloneIngredient(ingredient: BuildIngredient): BuildIngredient {
  return { ...ingredient };
}

function cloneBuild(build: StewBuild, ingredients: BuildIngredient[] = build.ingredients): StewBuild {
  return {
    id: build.id,
    ingredients: ingredients.map(cloneIngredient),
  };
}

function findCatalogIngredient(id: IngredientId, catalog: readonly Ingredient[]): Ingredient {
  const ingredient = catalog.find(entry => entry.id === id);
  if (!ingredient) {
    throw new UnknownIngredientError(id);
  }
  return ingredient;
}

function findBuildIndex(build: StewBuild, ingredientId: IngredientId): number {
  return build.ingredients.findIndex(ingredient => ingredient.ingredientId === ingredientId);
}

function assertValidStage(stage: CookingStage): CookingStage {
  if (!COOKING_STAGES.includes(stage)) {
    throw new Error(`Invalid cooking stage: ${stage}`);
  }
  return stage;
}

export function addIngredient(build: StewBuild, ingredientId: IngredientId, catalog: readonly Ingredient[]): StewBuild {
  const existingIndex = findBuildIndex(build, ingredientId);
  if (existingIndex !== -1) {
    return cloneBuild(build);
  }

  const catalogIngredient = findCatalogIngredient(ingredientId, catalog);
  const ingredients = [...build.ingredients, {
    ingredientId: catalogIngredient.id,
    stage: catalogIngredient.stage,
  }];

  return cloneBuild(build, ingredients);
}

export function removeIngredient(build: StewBuild, ingredientId: IngredientId): StewBuild {
  const ingredients = build.ingredients.filter(ingredient => ingredient.ingredientId !== ingredientId);
  return cloneBuild(build, ingredients);
}

export function updateBuildIngredient(build: StewBuild, ingredientId: IngredientId, patch: BuildIngredientPatch): StewBuild {
  const index = findBuildIndex(build, ingredientId);
  if (index === -1) {
    throw new UnknownIngredientError(ingredientId);
  }

  const ingredients = build.ingredients.map((ingredient, currentIndex) => {
    if (currentIndex !== index) {
      return cloneIngredient(ingredient);
    }

    const nextStage = patch.stage !== undefined ? assertValidStage(patch.stage) : ingredient.stage;
    return {
      ...ingredient,
      stage: nextStage,
      quantity: patch.quantity !== undefined ? patch.quantity : ingredient.quantity,
      unit: patch.unit !== undefined ? patch.unit : ingredient.unit,
    };
  });

  return cloneBuild(build, ingredients);
}

export function moveIngredient(build: StewBuild, ingredientId: IngredientId, stage: CookingStage): StewBuild {
  return updateBuildIngredient(build, ingredientId, { stage });
}

export function groupBuildByStage(build: StewBuild): Record<CookingStage, BuildIngredient[]> {
  const grouped = {} as Record<CookingStage, BuildIngredient[]>;

  for (const stage of COOKING_STAGES) {
    const ingredients = build.ingredients
      .filter(ingredient => ingredient.stage === stage)
      .map(cloneIngredient);
    if (ingredients.length > 0) {
      grouped[stage] = ingredients;
    }
  }

  return grouped;
}

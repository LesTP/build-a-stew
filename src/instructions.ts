import { COOKING_STAGES } from './types';
import type {
  AnalysisResult,
  CookingStage,
  Ingredient,
  IngredientId,
  StewBuild,
} from './types';

export interface GeneratedRecipeStep {
  stage: CookingStage;
  instructions: string[];
}

export interface GeneratedRecipe {
  steps: GeneratedRecipeStep[];
  servingSuggestion: string;
  text: string;
}

const SERVING_SUGGESTION =
  'Serve over a starch — couscous, rice, mashed potato, polenta, or crusty bread — to soak up the sauce.';

function ingredientMap(catalog: readonly Ingredient[]): Map<IngredientId, Ingredient> {
  return new Map(catalog.map(ingredient => [ingredient.id, ingredient]));
}

function formatQuantity(buildIngredient: StewBuild['ingredients'][number]): string {
  if (buildIngredient.quantity === undefined) {
    return '';
  }

  if (buildIngredient.unit === undefined) {
    return `${buildIngredient.quantity}`;
  }

  return `${buildIngredient.quantity} ${buildIngredient.unit}`;
}

function formatIngredientLine(buildIngredient: StewBuild['ingredients'][number], ingredient: Ingredient): string {
  const quantity = formatQuantity(buildIngredient);
  const name = ingredient.name;
  const base = quantity ? `${quantity} of ${name}` : name;

  if (!ingredient.notes) {
    return base;
  }

  return `${base}. Notes: ${ingredient.notes}`;
}

function groupBuildIngredients(build: StewBuild): Record<CookingStage, StewBuild['ingredients']> {
  const grouped = {} as Record<CookingStage, StewBuild['ingredients']>;

  for (const stage of COOKING_STAGES) {
    grouped[stage] = [];
  }

  for (const ingredient of build.ingredients) {
    grouped[ingredient.stage].push(ingredient);
  }

  return grouped;
}

function stageLeadLine(
  stage: CookingStage,
  ingredients: readonly StewBuild['ingredients'][number][],
  build: StewBuild,
): string {
  const ingredientCount = ingredients.length;
  const ingredientWord = ingredientCount === 1 ? 'ingredient' : 'ingredients';

  switch (stage) {
    case 'brown':
      return `Brown the ${ingredientWord} in the pot before adding liquid.`;
    case 'aromatics':
      return `Cook the ${ingredientWord} until fragrant and softened.`;
    case 'deglaze':
      return `Deglaze the pot with the ${ingredientWord} and scrape up any browned bits.`;
    case 'pressure': {
      const pressure = build.pressureMinutes;
      const naturalRelease = build.naturalReleaseMinutes;

      if (pressure !== undefined && naturalRelease !== undefined) {
        return `Pressure cook for ${pressure} minutes, then natural release for ${naturalRelease} minutes.`;
      }

      if (pressure !== undefined) {
        return `Pressure cook for ${pressure} minutes.`;
      }

      return `Pressure cook until the ${ingredientWord} are tender.`;
    }
    case 'simmer_after':
      return `Simmer the ${ingredientWord} after pressure until everything is tender and combined.`;
    case 'stir_in':
      return `Stir in the ${ingredientWord} at the end.`;
    case 'finish':
      return `Finish with the ${ingredientWord} just before serving.`;
    default:
      return `Prepare the ${ingredientWord}.`;
  }
}

export function generateInstructions(
  build: StewBuild,
  catalog: readonly Ingredient[],
  _analysis: AnalysisResult,
): GeneratedRecipe {
  if (build.ingredients.length === 0) {
    return { steps: [], servingSuggestion: '', text: '' };
  }

  const byId = ingredientMap(catalog);
  const grouped = groupBuildIngredients(build);
  const steps: GeneratedRecipeStep[] = [];

  for (const stage of COOKING_STAGES) {
    const stageIngredients = grouped[stage];
    if (stageIngredients.length === 0) {
      continue;
    }

    const instructions: string[] = [stageLeadLine(stage, stageIngredients, build)];

    for (const buildIngredient of stageIngredients) {
      const ingredient = byId.get(buildIngredient.ingredientId);
      if (!ingredient) {
        continue;
      }
      instructions.push(formatIngredientLine(buildIngredient, ingredient));
    }

    steps.push({ stage, instructions });
  }

  const text = steps.map(step => step.instructions.join('\n')).join('\n\n');
  return { steps, servingSuggestion: SERVING_SUGGESTION, text };
}

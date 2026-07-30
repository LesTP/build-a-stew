import ingredientsRaw from './ingredients.json';
import { ingredientCatalogSchema } from './schema';
import { GROUP_DEFINITIONS, GROUP_TAGS, INGREDIENT_CATEGORIES, COOKING_STAGES } from './types';
import type { Ingredient, IngredientId, CookingStage, IngredientCategory } from './types';

function validateCatalog(ingredients: readonly Ingredient[]): void {
  const ids = new Set(ingredients.map(i => i.id));
  const groupTagSet = new Set<string>(GROUP_TAGS);
  const validCategories = new Set<string>(INGREDIENT_CATEGORIES);
  const validStages = new Set<string>(COOKING_STAGES);

  // No duplicate IDs
  if (ids.size !== ingredients.length) {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const i of ingredients) {
      if (seen.has(i.id)) dupes.push(i.id);
      seen.add(i.id);
    }
    throw new Error(`Duplicate ingredient IDs: ${dupes.join(', ')}`);
  }

  // Group tags and ingredient IDs must be disjoint
  const collisions = GROUP_TAGS.filter(tag => ids.has(tag as string));
  if (collisions.length > 0) {
    throw new Error(`Namespace collision — group tags are also ingredient IDs: ${collisions.join(', ')}`);
  }

  // Every ingredient must have valid category and stage
  const badCategories: string[] = [];
  const badStages: string[] = [];
  const badCompatibleSteps: string[] = [];
  const unresolved: string[] = [];

  for (const i of ingredients) {
    if (!validCategories.has(i.category)) {
      badCategories.push(`${i.id}: "${i.category}"`);
    }
    if (!validStages.has(i.stage)) {
      badStages.push(`${i.id}: "${i.stage}"`);
    }
    if (!Array.isArray(i.compatibleSteps) || i.compatibleSteps.length === 0) {
      badCompatibleSteps.push(`${i.id}: missing or empty compatibleSteps`);
    } else if (!i.compatibleSteps.includes(i.stage)) {
      badCompatibleSteps.push(`${i.id}: stage "${i.stage}" absent from compatibleSteps`);
    }
    for (const ref of [...(i.pairsWith ?? []), ...(i.avoidWith ?? [])]) {
      if (!ids.has(ref) && !groupTagSet.has(ref)) {
        unresolved.push(`${i.id}: "${ref}"`);
      }
    }
  }

  if (badCategories.length > 0) throw new Error(`Invalid categories:\n${badCategories.join('\n')}`);
  if (badStages.length > 0) throw new Error(`Invalid stages:\n${badStages.join('\n')}`);
  if (badCompatibleSteps.length > 0) throw new Error(`Invalid compatibleSteps:\n${badCompatibleSteps.join('\n')}`);
  if (unresolved.length > 0) throw new Error(`Unresolved pair/avoid refs:\n${unresolved.join('\n')}`);

  // Category-based groups must have ≥1 member; ID-based groups must have all declared members
  const missing: string[] = [];
  for (const [tag, def] of Object.entries(GROUP_DEFINITIONS)) {
    if ('category' in def) {
      if (!ingredients.some(i => i.category === def.category)) {
        throw new Error(`Group "${tag}" (category:${def.category}) has no members in the catalog`);
      }
    } else {
      for (const memberId of def.ids) {
        if (!ids.has(memberId)) {
          missing.push(`group "${tag}" member "${memberId}"`);
        }
      }
    }
  }
  if (missing.length > 0) throw new Error(`Missing group members:\n${missing.join('\n')}`);
}

// Parse and validate once at module load time so malformed artifacts fail fast.
const _catalog: Ingredient[] = ingredientCatalogSchema.parse(ingredientsRaw) as Ingredient[];
validateCatalog(_catalog);

function deepCopy(ingredient: Ingredient): Ingredient {
  return JSON.parse(JSON.stringify(ingredient)) as Ingredient;
}

export function loadCatalog(): Ingredient[] {
  return _catalog.map(deepCopy);
}

export function getIngredient(id: IngredientId): Ingredient | undefined {
  const found = _catalog.find(i => i.id === id);
  return found ? deepCopy(found) : undefined;
}

export interface CatalogFilter {
  stage?: CookingStage;
  category?: IngredientCategory;
}

export function listIngredients(filters?: CatalogFilter): Ingredient[] {
  let result = _catalog;
  if (filters?.stage !== undefined) {
    result = result.filter(i => i.stage === filters.stage);
  }
  if (filters?.category !== undefined) {
    result = result.filter(i => i.category === filters.category);
  }
  return result.map(deepCopy);
}

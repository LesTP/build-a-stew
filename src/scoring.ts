import { GROUP_DEFINITIONS, BALANCE_AXES } from './types';
import type {
  BalanceAxis,
  CuisineTag,
  Ingredient,
  IngredientId,
  StewBuild,
} from './types';
import type { CookingStep } from './techniques';

export type SuggestionBucket = 'top' | 'okay' | 'fallback';
export type Reason = 'cuisine' | 'balance' | 'timing' | 'caution';

export interface Suggestion {
  ingredientId: IngredientId;
  bucket: SuggestionBucket;
  reasons: Reason[];
  notes: string[];
  cautions: string[];
  score: number;
}

const BALANCE_AXIS_IMPORTANCE: Record<BalanceAxis, number> = {
  freshness: 2,
  acidity: 2,
  body: 1,
  richness: 1,
  umami: 1,
  sweetness: 0.4,
  texture: 0.4,
  aromatic_intensity: 0.4,
  heat: 0.4,
  smoke: 0.4,
};

const CUISINE_BONUS = 7;
const PAIRING_BONUS = 6;
const TIMING_BONUS = 8;
const TIMING_PENALTY = -8;
const TOP_THRESHOLD = 8;
const OKAY_THRESHOLD = 2.5;

const REASON_ORDER: Reason[] = ['balance', 'cuisine', 'timing', 'caution'];

function getIngredientMap(catalog: readonly Ingredient[]): Map<IngredientId, Ingredient> {
  return new Map(catalog.map(ingredient => [ingredient.id, ingredient]));
}

function getBuildIngredientIds(build: StewBuild): Set<IngredientId> {
  return new Set(build.ingredients.map(ingredient => ingredient.ingredientId));
}

function resolveGroupMemberIds(
  ref: string,
  catalog: readonly Ingredient[],
  byId: Map<IngredientId, Ingredient>,
): IngredientId[] {
  const definition = GROUP_DEFINITIONS[ref as keyof typeof GROUP_DEFINITIONS];
  if (definition === undefined) {
    return byId.has(ref) ? [ref] : [];
  }

  if ('category' in definition) {
    return catalog
      .filter(ingredient => ingredient.category === definition.category)
      .map(ingredient => ingredient.id);
  }

  return definition.ids.filter(id => byId.has(id));
}

function resolveMatchedBuildIds(
  refs: readonly string[] | undefined,
  build: StewBuild,
  catalog: readonly Ingredient[],
  byId: Map<IngredientId, Ingredient>,
): IngredientId[] {
  if (!refs || refs.length === 0) {
    return [];
  }

  const buildIds = getBuildIngredientIds(build);
  const matched = new Set<IngredientId>();

  for (const ref of refs) {
    for (const id of resolveGroupMemberIds(ref, catalog, byId)) {
      if (buildIds.has(id)) {
        matched.add(id);
      }
    }
  }

  return [...matched];
}

function buildBalanceScores(build: StewBuild, byId: Map<IngredientId, Ingredient>): Record<BalanceAxis, number> {
  const totals = Object.fromEntries(BALANCE_AXES.map(axis => [axis, 0])) as Record<BalanceAxis, number>;

  for (const buildIngredient of build.ingredients) {
    const ingredient = byId.get(buildIngredient.ingredientId);
    if (!ingredient) {
      continue;
    }

    for (const axis of BALANCE_AXES) {
      totals[axis] += ingredient.balanceScores[axis] ?? 0;
    }
  }

  return totals;
}

function buildBalanceFactor(build: StewBuild): number {
  const size = build.ingredients.length;
  if (size === 0) {
    return 0.5;
  }
  if (size === 1) {
    return 1;
  }
  return 1.3;
}

function balanceContribution(axis: BalanceAxis, candidateValue: number, buildValue: number, factor: number): number {
  if (candidateValue === 0) {
    return 0;
  }

  if (buildValue >= 4) {
    return -candidateValue * BALANCE_AXIS_IMPORTANCE[axis] * factor;
  }

  if (buildValue <= 1) {
    return candidateValue * BALANCE_AXIS_IMPORTANCE[axis] * factor;
  }

  if (buildValue === 2) {
    return candidateValue * BALANCE_AXIS_IMPORTANCE[axis] * factor;
  }

  return candidateValue * BALANCE_AXIS_IMPORTANCE[axis] * factor * 0.2;
}

function getTimingReference(build: StewBuild, byId: Map<IngredientId, Ingredient>): Ingredient | undefined {
  let reference: Ingredient | undefined;
  let referenceMax = -1;

  for (const buildIngredient of build.ingredients) {
    const ingredient = byId.get(buildIngredient.ingredientId);
    if (!ingredient?.cookMinutes) {
      continue;
    }

    if (ingredient.cookMinutes.max > referenceMax) {
      reference = ingredient;
      referenceMax = ingredient.cookMinutes.max;
    }
  }

  return reference;
}

function sortReasons(reasons: Set<Reason>): Reason[] {
  return REASON_ORDER.filter(reason => reasons.has(reason));
}

function bucketForScore(score: number): SuggestionBucket {
  if (score >= TOP_THRESHOLD) {
    return 'top';
  }

  if (score >= OKAY_THRESHOLD) {
    return 'okay';
  }

  return 'fallback';
}

export function scoreStep(
  step: CookingStep,
  build: StewBuild,
  catalog: readonly Ingredient[],
  cuisine: CuisineTag | null,
): Suggestion[] {
  const byId = getIngredientMap(catalog);
  const buildIds = getBuildIngredientIds(build);
  const buildBalance = buildBalanceScores(build, byId);
  const factor = buildBalanceFactor(build);
  const timingReference = step.longCook ? getTimingReference(build, byId) : undefined;

  const suggestions: Suggestion[] = [];

  for (const ingredient of catalog) {
    if (!ingredient.compatibleSteps.includes(step.id)) {
      continue;
    }

    if (buildIds.has(ingredient.id)) {
      continue;
    }

    const reasons = new Set<Reason>();
    const notes: string[] = [];
    const cautions: string[] = [];
    let score = 0;

    for (const axis of BALANCE_AXES) {
      const candidateValue = ingredient.balanceScores[axis] ?? 0;
      const buildValue = buildBalance[axis] ?? 0;
      const contribution = balanceContribution(axis, candidateValue, buildValue, factor);

      if (contribution > 0) {
        score += contribution;
        reasons.add('balance');
      }
    }

    const cuisineBonus = cuisine !== null && ingredient.cuisines.includes(cuisine)
      ? ingredient.cuisineWeights?.[cuisine] ?? CUISINE_BONUS
      : 0;
    if (cuisineBonus > 0) {
      score += cuisineBonus;
      reasons.add('cuisine');
      notes.push(`Matches ${cuisine} cuisine.`);
    }

    const pairedIds = resolveMatchedBuildIds(ingredient.pairsWith, build, catalog, byId);
    if (pairedIds.length > 0) {
      score += PAIRING_BONUS * pairedIds.length;
      reasons.add('balance');
      notes.push(`Pairs with ${pairedIds.length === 1 ? pairedIds[0] : pairedIds.join(', ')}.`);
    }

    const avoidedIds = resolveMatchedBuildIds(ingredient.avoidWith, build, catalog, byId);
    if (avoidedIds.length > 0) {
      score -= PAIRING_BONUS * avoidedIds.length;
      reasons.add('caution');
      cautions.push(`Avoid with ${avoidedIds.length === 1 ? avoidedIds[0] : avoidedIds.join(', ')}.`);
    }

    if (step.longCook && timingReference?.cookMinutes && ingredient.cookMinutes) {
      const referenceMin = timingReference.cookMinutes.min;
      const referenceMax = timingReference.cookMinutes.max;
      const candidateMin = ingredient.cookMinutes.min;
      const candidateMax = ingredient.cookMinutes.max;

      if (candidateMin <= referenceMin && candidateMax >= referenceMin) {
        score += TIMING_BONUS;
        reasons.add('timing');
        notes.push(`Cook time matches the ${referenceMin}-${referenceMax} min reference.`);
      } else if (candidateMax < referenceMin) {
        score += TIMING_PENALTY;
        reasons.add('caution');
        cautions.push(`Likely overcooks against a ${referenceMin}-${referenceMax} min reference.`);
      } else if (candidateMin > referenceMax) {
        score += TIMING_PENALTY;
        reasons.add('caution');
        cautions.push(`Likely undercooks against a ${referenceMin}-${referenceMax} min reference.`);
      } else {
        score += TIMING_BONUS / 2;
        reasons.add('timing');
      }
    }

    suggestions.push({
      ingredientId: ingredient.id,
      bucket: bucketForScore(score),
      reasons: sortReasons(reasons),
      notes,
      cautions,
      score,
    });
  }

  suggestions.sort((left, right) => {
    const bucketOrder: Record<SuggestionBucket, number> = {
      top: 0,
      okay: 1,
      fallback: 2,
    };

    const bucketDelta = bucketOrder[left.bucket] - bucketOrder[right.bucket];
    if (bucketDelta !== 0) {
      return bucketDelta;
    }

    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.ingredientId.localeCompare(right.ingredientId);
  });

  return suggestions;
}

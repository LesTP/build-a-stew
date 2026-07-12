import { GROUP_DEFINITIONS, BALANCE_AXES, CUISINE_TAGS } from './types';
import type {
  AnalysisMessage,
  AnalysisResult,
  BalanceAxis,
  CuisineTag,
  Ingredient,
  IngredientId,
  IngredientSuggestion,
  SaltRisk,
  StewBuild,
  TimingFinding,
} from './types';

const EMPTY_BALANCE_SCORES = Object.freeze(
  Object.fromEntries(BALANCE_AXES.map(axis => [axis, 0])) as Record<BalanceAxis, number>,
);

const EMPTY_CUISINE_SCORES = Object.freeze(
  Object.fromEntries(CUISINE_TAGS.map(tag => [tag, 0])) as Record<CuisineTag, number>,
);

const SALT_RISK_SCORE: Record<SaltRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function cloneBalanceScores(): Record<BalanceAxis, number> {
  return { ...EMPTY_BALANCE_SCORES };
}

function cloneCuisineScores(): Record<CuisineTag, number> {
  return { ...EMPTY_CUISINE_SCORES };
}

function addCuisineAffinityScores(
  cuisineScores: Record<CuisineTag, number>,
  ingredient: Ingredient,
): void {
  for (const cuisine of ingredient.cuisines) {
    if (cuisine === 'universal') {
      continue;
    }

    cuisineScores[cuisine] += ingredient.cuisineWeights?.[cuisine] ?? 1;
  }
}

function capitalize(label: string): string {
  return label
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function getIngredientMap(catalog: readonly Ingredient[]): Map<IngredientId, Ingredient> {
  return new Map(catalog.map(ingredient => [ingredient.id, ingredient]));
}

function resolveGroupMemberIds(ref: string, catalog: readonly Ingredient[], byId: Map<IngredientId, Ingredient>): IngredientId[] {
  const definition = GROUP_DEFINITIONS[ref as keyof typeof GROUP_DEFINITIONS];
  if (definition === undefined) {
    return byId.has(ref) ? [ref] : [];
  }

  if ('category' in definition) {
    return catalog.filter(ingredient => ingredient.category === definition.category).map(ingredient => ingredient.id);
  }

  return definition.ids.filter(id => byId.has(id));
}

function uniqueIngredientIds(build: StewBuild): IngredientId[] {
  const seen = new Set<IngredientId>();
  const ordered: IngredientId[] = [];

  for (const ingredient of build.ingredients) {
    if (!seen.has(ingredient.ingredientId)) {
      seen.add(ingredient.ingredientId);
      ordered.push(ingredient.ingredientId);
    }
  }

  return ordered;
}

function addWarning(
  warnings: AnalysisMessage[],
  seen: Set<string>,
  warning: AnalysisMessage,
): void {
  if (seen.has(warning.id)) {
    return;
  }
  seen.add(warning.id);
  warnings.push(warning);
}

function addSuggestion(
  suggestions: IngredientSuggestion[],
  seen: Set<string>,
  suggestion: IngredientSuggestion,
): void {
  const key = `${suggestion.ingredientId}:${suggestion.message}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  suggestions.push(suggestion);
}

function makePairKey(kind: 'pair' | 'avoid', left: IngredientId, right: IngredientId): string {
  return left < right ? `${kind}:${left}:${right}` : `${kind}:${right}:${left}`;
}

function relatedPairIds(a: IngredientId, b: IngredientId): IngredientId[] {
  return a < b ? [a, b] : [b, a];
}

function formatPairMessage(
  kind: 'pair' | 'avoid',
  left: IngredientId,
  right: IngredientId,
  byId: Map<IngredientId, Ingredient>,
): string {
  const [canonicalLeft, canonicalRight] = relatedPairIds(left, right);
  const leftName = capitalize(byId.get(canonicalLeft)?.name ?? canonicalLeft);
  const rightName = capitalize(byId.get(canonicalRight)?.name ?? canonicalRight);

  return kind === 'pair'
    ? `${leftName} pairs well with ${rightName}.`
    : `${leftName} clashes with ${rightName}.`;
}

function buildIngredientIds(build: StewBuild): Set<IngredientId> {
  return new Set(build.ingredients.map(ingredient => ingredient.ingredientId));
}

function matchRef(ref: string, build: StewBuild, catalog: readonly Ingredient[], byId: Map<IngredientId, Ingredient>): IngredientId[] {
  const resolved = resolveGroupMemberIds(ref, catalog, byId);
  const buildIds = buildIngredientIds(build);
  return resolved.filter(id => buildIds.has(id));
}

function addStageWarnings(
  warnings: AnalysisMessage[],
  seenWarnings: Set<string>,
  build: StewBuild,
  byId: Map<IngredientId, Ingredient>,
): void {
  for (const buildIngredient of build.ingredients) {
    const ingredient = byId.get(buildIngredient.ingredientId);
    if (!ingredient) {
      continue;
    }

    if (ingredient.id === 'miso' && buildIngredient.stage !== 'finish') {
      addWarning(warnings, seenWarnings, {
        id: `stage:miso:${buildIngredient.stage}`,
        severity: 'warning',
        message: `${capitalize(ingredient.name)} is usually best in finish, not ${buildIngredient.stage.replace('_', ' ')}.`,
        relatedIngredientIds: [ingredient.id],
      });
    }

    if (ingredient.id === 'spinach' && buildIngredient.stage === 'pressure') {
      addWarning(warnings, seenWarnings, {
        id: 'stage:spinach:pressure',
        severity: 'warning',
        message: `${capitalize(ingredient.name)} should not be cooked in pressure stage.`,
        relatedIngredientIds: [ingredient.id],
      });
    }

    if (ingredient.id === 'couscous' && buildIngredient.stage !== 'serve_over') {
      addWarning(warnings, seenWarnings, {
        id: `stage:couscous:${buildIngredient.stage}`,
        severity: 'warning',
        message: `${capitalize(ingredient.name)} is usually served over the stew, not in ${buildIngredient.stage.replace('_', ' ')}.`,
        relatedIngredientIds: [ingredient.id],
      });
    }
  }
}

function addTimingFindings(
  timingFindings: TimingFinding[],
  build: StewBuild,
  byId: Map<IngredientId, Ingredient>,
): void {
  const pressureMinutes = build.pressureMinutes;
  if (pressureMinutes === undefined) {
    return;
  }

  for (const buildIngredient of build.ingredients) {
    if (buildIngredient.stage !== 'pressure') {
      continue;
    }

    const ingredient = byId.get(buildIngredient.ingredientId);
    if (!ingredient?.cookMinutes) {
      continue;
    }

    const { min, max } = ingredient.cookMinutes;
    if (pressureMinutes < min) {
      timingFindings.push({
        ingredientId: ingredient.id,
        message: `${capitalize(ingredient.name)} is undercooked at ${pressureMinutes} min pressure; it usually needs ${min}-${max} min.`,
      });
    } else if (pressureMinutes > max) {
      timingFindings.push({
        ingredientId: ingredient.id,
        message: `${capitalize(ingredient.name)} is overcooked at ${pressureMinutes} min pressure; it usually needs ${min}-${max} min.`,
      });
    }
  }
}

function addPairingSignals(
  warnings: AnalysisMessage[],
  seenWarnings: Set<string>,
  build: StewBuild,
  catalog: readonly Ingredient[],
  byId: Map<IngredientId, Ingredient>,
): void {
  const seenPairs = new Set<string>();

  for (const buildIngredient of build.ingredients) {
    const ingredient = byId.get(buildIngredient.ingredientId);
    if (!ingredient) {
      continue;
    }

    for (const ref of ingredient.pairsWith ?? []) {
      for (const relatedId of matchRef(ref, build, catalog, byId)) {
        if (relatedId === ingredient.id) {
          continue;
        }
        const pairKey = makePairKey('pair', ingredient.id, relatedId);
        if (seenPairs.has(pairKey)) {
          continue;
        }
        seenPairs.add(pairKey);
        addWarning(warnings, seenWarnings, {
          id: pairKey,
          severity: 'info',
          message: formatPairMessage('pair', ingredient.id, relatedId, byId),
          relatedIngredientIds: relatedPairIds(ingredient.id, relatedId),
        });
      }
    }

    for (const ref of ingredient.avoidWith ?? []) {
      for (const relatedId of matchRef(ref, build, catalog, byId)) {
        if (relatedId === ingredient.id) {
          continue;
        }
        const pairKey = makePairKey('avoid', ingredient.id, relatedId);
        if (seenPairs.has(pairKey)) {
          continue;
        }
        seenPairs.add(pairKey);
        addWarning(warnings, seenWarnings, {
          id: pairKey,
          severity: 'warning',
          message: formatPairMessage('avoid', ingredient.id, relatedId, byId),
          relatedIngredientIds: relatedPairIds(ingredient.id, relatedId),
        });
      }
    }
  }
}

function addCompositionSignals(
  warnings: AnalysisMessage[],
  suggestions: IngredientSuggestion[],
  seenWarnings: Set<string>,
  seenSuggestions: Set<string>,
  build: StewBuild,
  catalog: readonly Ingredient[],
  byId: Map<IngredientId, Ingredient>,
  balanceScores: Record<BalanceAxis, number>,
): void {
  const buildIngredients = build.ingredients
    .map(ingredient => byId.get(ingredient.ingredientId))
    .filter((ingredient): ingredient is Ingredient => ingredient !== undefined);

  const categories = new Set(buildIngredients.map(ingredient => ingredient.category));
  const rootCount = buildIngredients.filter(ingredient => ingredient.category === 'roots').length;
  const hasLegume = buildIngredients.some(ingredient => ingredient.category === 'legumes');
  const hasGrain = buildIngredients.some(ingredient => ingredient.category === 'grains');
  const hasGreens = categories.has('greens');

  const freshness = balanceScores.freshness ?? 0;
  const acidity = balanceScores.acidity ?? 0;
  const richness = balanceScores.richness ?? 0;
  const saltScore = buildIngredients.reduce((total, ingredient) => total + SALT_RISK_SCORE[ingredient.saltRisk], 0);
  const isRichAndLow = richness >= 4 && (freshness <= 2 || acidity <= 2);

  if (isRichAndLow) {
    addWarning(warnings, seenWarnings, {
      id: 'composition:richness:freshness',
      severity: 'info',
      message: 'This build is rich but light on freshness or acidity. Consider adding acid or fresh herbs.',
    });
  }

  if (hasLegume && hasGrain && rootCount >= 3) {
    addWarning(warnings, seenWarnings, {
      id: 'composition:starch:stack',
      severity: 'warning',
      message: 'Legumes, grains, and multiple roots are pushing this build toward a heavy starch/body profile.',
    });
  }

  if (saltScore >= 3) {
    addWarning(warnings, seenWarnings, {
      id: 'composition:salt:stack',
      severity: 'warning',
      message: 'This build is stacking a lot of salt-risk ingredients. Consider cutting back on salty finishers or stock.',
    });
  }

  const hasDriedBean = buildIngredients.some(ingredient =>
    ingredient.id.startsWith('dried_') && ingredient.category === 'legumes',
  );
  const hasAcidicTomatoOrVinegar = buildIngredients.some(ingredient =>
    ingredient.id === 'canned_tomatoes' ||
    ingredient.id === 'cider_vinegar' ||
    ingredient.id === 'red_wine_vinegar' ||
    ingredient.id === 'sherry_vinegar',
  );

  if (hasDriedBean && hasAcidicTomatoOrVinegar) {
    addWarning(warnings, seenWarnings, {
      id: 'composition:beans:acid',
      severity: 'warning',
      message: 'Acidic tomatoes or vinegar can slow dried bean softening.',
    });
  }

  if (!hasGreens && freshness <= 2) {
    addWarning(warnings, seenWarnings, {
      id: 'composition:greens:missing',
      severity: 'info',
      message: 'This build has low freshness and no greens. Add a leafy green for lift.',
    });
    addSuggestion(suggestions, seenSuggestions, {
      ingredientId: 'spinach',
      message: 'Add a leafy green for freshness.',
    });
  }

  if (isRichAndLow) {
    addSuggestion(suggestions, seenSuggestions, {
      ingredientId: 'lemon_juice',
      message: 'Add acid or fresh herbs to brighten the pot.',
    });
  }
}

export function analyzeBuild(build: StewBuild, catalog: readonly Ingredient[]): AnalysisResult {
  const byId = getIngredientMap(catalog);
  const balanceScores = cloneBalanceScores();
  const cuisineScores = cloneCuisineScores();
  const warnings: AnalysisMessage[] = [];
  const suggestions: IngredientSuggestion[] = [];
  const timingFindings: TimingFinding[] = [];
  const seenWarnings = new Set<string>();
  const seenSuggestions = new Set<string>();

  for (const buildIngredient of build.ingredients) {
    const ingredient = byId.get(buildIngredient.ingredientId);
    if (!ingredient) {
      continue;
    }

    for (const axis of BALANCE_AXES) {
      balanceScores[axis] += ingredient.balanceScores[axis] ?? 0;
    }

    addCuisineAffinityScores(cuisineScores, ingredient);
  }

  addStageWarnings(warnings, seenWarnings, build, byId);
  addTimingFindings(timingFindings, build, byId);
  addPairingSignals(warnings, seenWarnings, build, catalog, byId);
  addCompositionSignals(warnings, suggestions, seenWarnings, seenSuggestions, build, catalog, byId, balanceScores);

  return {
    balanceScores,
    cuisineScores,
    warnings,
    suggestions,
    timingFindings,
  };
}

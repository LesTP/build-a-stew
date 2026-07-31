export const COOKING_STAGES = [
  'brown', 'aromatics', 'deglaze', 'pressure', 'simmer_after', 'stir_in', 'finish', 'serve_over',
] as const;

export const INGREDIENT_CATEGORIES = [
  'protein', 'aromatics', 'liquid', 'roots', 'vegetable', 'legumes', 'grains', 'greens', 'fat', 'topping', 'spice',
] as const;

export const ROLES = [
  'protein', 'collagen', 'fat', 'starch', 'thickener', 'body', 'texture', 'aromatic', 'liquid', 'acid', 'seasoning', 'freshener', 'topping',
] as const;

export const BALANCE_AXES = [
  'body', 'richness', 'umami', 'sweetness', 'acidity', 'heat', 'smoke', 'freshness', 'texture', 'aromatic_intensity',
] as const;

export const TRAITS = [
  'anise', 'bitter', 'citrusy', 'creamy', 'earthy', 'fermented', 'floral', 'fruity', 'gamey',
  'garlicky', 'herbaceous', 'malty', 'nutty', 'peppery', 'pungent', 'resinous', 'savory', 'tangy',
] as const;

export const CUISINE_TAGS = [
  'universal', 'french', 'italian', 'european', 'american',
  'latin_american', 'middle_eastern_african', 'south_asian', 'east_asian',
] as const;

export const SALT_RISKS = ['low', 'medium', 'high'] as const;

export const GROUP_TAGS = [
  'meat', 'roots', 'vegetables', 'greens', 'grains', 'spices', 'herbs',
  'wine', 'vinegar', 'beans', 'black_beans', 'white_beans', 'lentils',
] as const;

export type CookingStage = (typeof COOKING_STAGES)[number];
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];
export type Role = (typeof ROLES)[number];
export type BalanceAxis = (typeof BALANCE_AXES)[number];
export type Trait = (typeof TRAITS)[number];
export type CuisineTag = (typeof CUISINE_TAGS)[number];

export const CUISINE_LABELS: Record<CuisineTag, string> = {
  universal: 'Universal',
  french: 'French',
  italian: 'Italian',
  european: 'European',
  american: 'American',
  latin_american: 'Latin American',
  middle_eastern_african: 'Middle Eastern & African',
  south_asian: 'South Asian',
  east_asian: 'East & Southeast Asian',
};
export type SaltRisk = (typeof SALT_RISKS)[number];
export type GroupTag = (typeof GROUP_TAGS)[number];
export type IngredientId = string;
export type IngredientRef = GroupTag | IngredientId;
export type AnalysisSeverity = 'info' | 'warning';

export const STAGE_LABELS: Record<CookingStage, string> = {
  brown: 'Brown',
  aromatics: 'Aromatics',
  deglaze: 'Deglaze',
  pressure: 'Pressure',
  simmer_after: 'Simmer after',
  stir_in: 'Stir in',
  finish: 'Finish',
  serve_over: 'Serve over',
};

type GroupDefinition = { category: IngredientCategory } | { ids: string[] };

export const GROUP_DEFINITIONS: Record<GroupTag, GroupDefinition> = {
  meat:         { category: 'protein' },
  roots:        { category: 'roots' },
  vegetables:   { category: 'vegetable' },
  greens:       { category: 'greens' },
  grains:       { category: 'grains' },
  spices:       { category: 'spice' },
  herbs:        { ids: ['parsley', 'dill', 'cilantro', 'mint', 'chives', 'bay_leaf', 'thyme', 'rosemary', 'oregano'] },
  wine:         { ids: ['white_wine', 'red_wine'] },
  vinegar:      { ids: ['red_wine_vinegar', 'sherry_vinegar', 'cider_vinegar'] },
  beans:        { ids: ['dried_black_beans', 'cooked_black_beans', 'dried_white_beans', 'cooked_white_beans'] },
  black_beans:  { ids: ['dried_black_beans', 'cooked_black_beans'] },
  white_beans:  { ids: ['dried_white_beans', 'cooked_white_beans'] },
  lentils:      { ids: ['red_lentils_pressure', 'red_lentils_simmer', 'green_lentils', 'brown_lentils'] },
};

export interface Ingredient {
  id: IngredientId;
  name: string;
  category: IngredientCategory;
  stage: CookingStage;
  compatibleSteps: string[];
  roles: Role[];
  traits: Trait[];
  balanceScores: Partial<Record<BalanceAxis, number>>;
  cuisines: CuisineTag[];
  saltRisk: SaltRisk;
  cuisineWeights?: Partial<Record<CuisineTag, number>>;
  cookMinutes?: { min: number; max: number };
  pairsWith?: IngredientRef[];
  avoidWith?: IngredientRef[];
  notes?: string;
}

export interface BuildIngredient {
  ingredientId: IngredientId;
  stage: CookingStage;
  quantity?: number;
  unit?: string;
}

export interface StewBuild {
  id: string;
  name?: string;
  servings?: number;
  ingredients: BuildIngredient[];
  pressureMinutes?: number;
  naturalReleaseMinutes?: number;
  liquidAmount?: number;
  notes?: string;
}

export interface SavedBuildRecord {
  id: string;
  name?: string;
  savedAt: string;
  schemaVersion: number;
}

export interface AnalysisMessage {
  id: string;
  severity: AnalysisSeverity;
  message: string;
  relatedIngredientIds?: IngredientId[];
}

export interface TimingFinding {
  ingredientId: IngredientId;
  message: string;
}

export interface AnalysisResult {
  balanceScores: Record<BalanceAxis, number>;
  cuisineScores: Record<CuisineTag, number>;
  warnings: AnalysisMessage[];
  timingFindings: TimingFinding[];
}

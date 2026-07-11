import { z } from 'zod';
import {
  COOKING_STAGES,
  INGREDIENT_CATEGORIES,
  ROLES,
  BALANCE_AXES,
  TRAITS,
  CUISINE_TAGS,
  SALT_RISKS,
} from './types';

const balanceScoresSchema = z.record(
  z.enum(BALANCE_AXES),
  z.number()
);

export const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(INGREDIENT_CATEGORIES),
  stage: z.enum(COOKING_STAGES),
  roles: z.array(z.enum(ROLES)),
  traits: z.array(z.enum(TRAITS)),
  balanceScores: balanceScoresSchema,
  cuisines: z.array(z.enum(CUISINE_TAGS)),
  saltRisk: z.enum(SALT_RISKS),
  cuisineWeights: z.record(z.enum(CUISINE_TAGS), z.number()).optional(),
  cookMinutes: z.object({ min: z.number(), max: z.number() }).optional(),
  pairsWith: z.array(z.string()).optional(),
  avoidWith: z.array(z.string()).optional(),
  notes: z.string().optional(),
}).strict();

export const ingredientCatalogSchema = z.array(ingredientSchema);

export type IngredientInput = z.input<typeof ingredientSchema>;
export type IngredientOutput = z.output<typeof ingredientSchema>;

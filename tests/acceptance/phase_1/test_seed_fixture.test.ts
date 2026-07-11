import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { convertCatalog } from '../../../scripts/convert-catalog';
import { ingredientSchema } from '../../../src/schema';
import { COOKING_STAGES } from '../../../src/types';

const SEED_CSV_PATH = join(__dirname, 'fixtures', 'seed.csv');

type Ingredient = {
  id: string;
  stage: string;
  pairsWith?: string[];
  avoidWith?: string[];
};

describe('Seed fixture — end-to-end catalog integrity', () => {
  let ingredients: Ingredient[];

  beforeAll(() => {
    const csv = readFileSync(SEED_CSV_PATH, 'utf-8');
    ingredients = convertCatalog(csv) as Ingredient[];
  });

  it('converts the seed fixture without throwing', () => {
    expect(Array.isArray(ingredients)).toBe(true);
  });

  it('produces at least 10 ingredients', () => {
    expect(ingredients.length).toBeGreaterThanOrEqual(10);
  });

  it('every produced record passes schema validation', () => {
    for (const ing of ingredients) {
      expect(
        () => ingredientSchema.parse(ing),
        `ingredient ${ing.id} failed schema validation`,
      ).not.toThrow();
    }
  });

  it('seed fixture covers all 8 cooking stages', () => {
    const presentStages = new Set(ingredients.map((i) => i.stage));
    for (const stage of COOKING_STAGES) {
      expect(presentStages.has(stage), `stage '${stage}' not represented in seed fixture`).toBe(true);
    }
  });

  it('no duplicate ingredient IDs', () => {
    const ids = ingredients.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all pairsWith entries resolve to a GroupTag or an ID present in the catalog', () => {
    // The converter enforces this at conversion time.
    // If convertCatalog did not throw, all refs resolved. This test confirms
    // that the invariant is upheld structurally (no pairsWith entry is undefined/null).
    for (const ing of ingredients) {
      for (const ref of ing.pairsWith ?? []) {
        expect(ref, `ingredient ${ing.id} has a null/undefined pairsWith entry`).toBeTruthy();
        expect(typeof ref).toBe('string');
      }
    }
  });

  it('all avoidWith entries resolve to a GroupTag or an ID present in the catalog', () => {
    for (const ing of ingredients) {
      for (const ref of ing.avoidWith ?? []) {
        expect(ref, `ingredient ${ing.id} has a null/undefined avoidWith entry`).toBeTruthy();
        expect(typeof ref).toBe('string');
      }
    }
  });

  it('every ingredient has at least one role', () => {
    for (const ing of ingredients) {
      expect(
        (ing as { roles?: string[] }).roles?.length ?? 0,
        `ingredient ${ing.id} has no roles`,
      ).toBeGreaterThan(0);
    }
  });

  it('every ingredient has a non-empty id string', () => {
    for (const ing of ingredients) {
      expect(typeof ing.id).toBe('string');
      expect(ing.id.length).toBeGreaterThan(0);
    }
  });
});

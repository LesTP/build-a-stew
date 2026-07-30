/**
 * Phase 8 acceptance — scoreStep public API contract
 *
 * Contract guarantees under test:
 * - scoreStep(step, build, catalog, cuisine) returns Suggestion[]
 * - Every Suggestion has: ingredientId (string), bucket ("top"|"okay"|"fallback"),
 *   reasons (Reason[]), notes (string[]), cautions (string[]), score (number)
 * - Reason values are confined to "cuisine" | "balance" | "timing" | "caution"
 * - score is a finite number
 * - bucket appears in exactly one of the three valid values per suggestion
 * - Pure: identical inputs → identical outputs
 * - Non-mutating: does not modify build or catalog arguments
 * - Results ordered: "top" entries before "okay" before "fallback"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scoreStep } from '../../../src/scoring';
import { getBraiseTechnique } from '../../../src/techniques';
import { loadCatalog } from '../../../src/catalog';
import type { Suggestion, Reason } from '../../../src/scoring';
import type { Ingredient, StewBuild } from '../../../src/types';

const VALID_BUCKETS = new Set<string>(['top', 'okay', 'fallback']);
const VALID_REASONS = new Set<string>(['cuisine', 'balance', 'timing', 'caution']);

function emptyBuild(): StewBuild {
  return { id: 'phase8-test', ingredients: [] };
}

function buildWith(ids: Array<{ id: string; stage: string }>): StewBuild {
  return {
    id: 'phase8-test',
    ingredients: ids.map(({ id, stage }) => ({
      ingredientId: id,
      stage: stage as import('../../../src/types').CookingStage,
    })),
  };
}

describe('scoreStep — API surface', () => {
  it('scoreStep is a function', () => {
    expect(typeof scoreStep).toBe('function');
  });
});

describe('scoreStep — Suggestion shape', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('returns an array', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);
    expect(Array.isArray(result)).toBe(true);
  });

  it('every Suggestion has ingredientId (string)', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);
    for (const s of result) {
      expect(typeof s.ingredientId, `ingredientId on ${JSON.stringify(s)}`).toBe('string');
    }
  });

  it('every Suggestion has bucket in top|okay|fallback', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);
    for (const s of result) {
      expect(VALID_BUCKETS.has(s.bucket), `bucket "${s.bucket}" on ${s.ingredientId}`).toBe(true);
    }
  });

  it('every Suggestion has reasons array with valid values', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);
    for (const s of result) {
      expect(Array.isArray(s.reasons), `reasons on ${s.ingredientId}`).toBe(true);
      for (const r of s.reasons) {
        expect(VALID_REASONS.has(r), `reason "${r}" on ${s.ingredientId}`).toBe(true);
      }
    }
  });

  it('every Suggestion has notes array', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);
    for (const s of result) {
      expect(Array.isArray(s.notes), `notes on ${s.ingredientId}`).toBe(true);
    }
  });

  it('every Suggestion has cautions array', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);
    for (const s of result) {
      expect(Array.isArray(s.cautions), `cautions on ${s.ingredientId}`).toBe(true);
    }
  });

  it('every Suggestion has score as a finite number', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);
    for (const s of result) {
      expect(typeof s.score, `score on ${s.ingredientId}`).toBe('number');
      expect(isFinite(s.score), `score not finite on ${s.ingredientId}`).toBe(true);
    }
  });
});

describe('scoreStep — purity and determinism', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('identical calls return identical results', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const build = buildWith([{ id: 'chicken_thighs', stage: 'brown' }]);
    const r1 = scoreStep(finishStep, build, catalog, 'french');
    const r2 = scoreStep(finishStep, build, catalog, 'french');
    expect(r1).toEqual(r2);
  });

  it('does not mutate the build argument', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const build = buildWith([{ id: 'chicken_thighs', stage: 'brown' }]);
    const originalIngredients = [...build.ingredients];
    scoreStep(finishStep, build, catalog, null);
    expect(build.ingredients).toEqual(originalIngredients);
  });

  it('does not mutate the catalog argument', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const originalIds = catalog.map((i) => i.id);
    scoreStep(finishStep, emptyBuild(), catalog, null);
    expect(catalog.map((i) => i.id)).toEqual(originalIds);
  });
});

describe('scoreStep — result ordering', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('top-bucket suggestions appear before okay-bucket suggestions', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const build = buildWith([{ id: 'chicken_thighs', stage: 'brown' }]);
    const result = scoreStep(finishStep, build, catalog, 'french');

    let seenNonTop = false;
    for (const s of result) {
      if (s.bucket !== 'top') seenNonTop = true;
      if (seenNonTop) {
        expect(s.bucket, `"top" appeared after "${s.bucket}"`).not.toBe('top');
      }
    }
  });

  it('okay-bucket suggestions appear before fallback-bucket suggestions', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const build = buildWith([{ id: 'chicken_thighs', stage: 'brown' }]);
    const result = scoreStep(finishStep, build, catalog, 'french');

    let seenFallback = false;
    for (const s of result) {
      if (s.bucket === 'fallback') seenFallback = true;
      if (seenFallback) {
        expect(s.bucket, `non-fallback appeared after fallback`).toBe('fallback');
      }
    }
  });

  it('suggestions within the same bucket are sorted by score descending', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, emptyBuild(), catalog, null);

    for (const bucket of ['top', 'okay', 'fallback'] as const) {
      const inBucket = result.filter((s) => s.bucket === bucket);
      for (let i = 1; i < inBucket.length; i++) {
        expect(inBucket[i].score).toBeLessThanOrEqual(inBucket[i - 1].score);
      }
    }
  });
});

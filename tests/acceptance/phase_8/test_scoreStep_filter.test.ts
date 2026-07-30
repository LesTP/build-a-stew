/**
 * Phase 8 acceptance — scoreStep ingredient filtering
 *
 * Contract guarantees under test:
 * - Only step-appropriate ingredients appear: those with step.id in their compatibleSteps
 * - Already-placed ingredients (present in build.ingredients) are excluded
 * - All returned ingredientIds are valid catalog IDs
 * - An ingredient placed at any stage is excluded regardless of which stage it was placed in
 * - Filtering is applied before scoring; excluded items do not appear even as "fallback"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scoreStep } from '../../../src/scoring';
import { getBraiseTechnique } from '../../../src/techniques';
import { loadCatalog } from '../../../src/catalog';
import type { Ingredient, StewBuild } from '../../../src/types';

function buildWith(ids: Array<{ id: string; stage: string }>): StewBuild {
  return {
    id: 'phase8-filter-test',
    ingredients: ids.map(({ id, stage }) => ({
      ingredientId: id,
      stage: stage as import('../../../src/types').CookingStage,
    })),
  };
}

describe('scoreStep — step-appropriateness filter', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('only returns ingredients whose compatibleSteps include the target step', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'test', ingredients: [] }, catalog, null);
    const catalogById = new Map(catalog.map((i) => [i.id, i]));

    for (const s of result) {
      const ingredient = catalogById.get(s.ingredientId);
      expect(
        ingredient?.compatibleSteps.includes('aromatics'),
        `${s.ingredientId} is not compatible with aromatics step`,
      ).toBe(true);
    }
  });

  it('does not return finish-step ingredients when querying aromatics step', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'test', ingredients: [] }, catalog, null);
    const ids = new Set(result.map((s) => s.ingredientId));

    // lemon_juice and parsley are finish-step only
    expect(ids.has('lemon_juice')).toBe(false);
    expect(ids.has('parsley')).toBe(false);
  });

  it('does not return aromatics-step ingredients when querying finish step', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, null);
    const ids = new Set(result.map((s) => s.ingredientId));

    // garlic and onion are aromatics-step only
    expect(ids.has('garlic')).toBe(false);
    expect(ids.has('onion')).toBe(false);
  });

  it("covers the step's expected ingredient pool: finish step returns known finish-step ingredients", () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, null);
    const ids = new Set(result.map((s) => s.ingredientId));

    expect(ids.has('parsley')).toBe(true);
    expect(ids.has('lemon_juice')).toBe(true);
    expect(ids.has('miso')).toBe(true);
  });

  it('all returned ingredientIds are valid catalog IDs', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, null);
    const validIds = new Set(catalog.map((i) => i.id));

    for (const s of result) {
      expect(validIds.has(s.ingredientId), `${s.ingredientId} not found in catalog`).toBe(true);
    }
  });
});

describe('scoreStep — placed-ingredient exclusion', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('excludes an ingredient that is already placed in the build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    // parsley is a finish-step ingredient; place it in the build
    const build = buildWith([{ id: 'parsley', stage: 'finish' }]);
    const result = scoreStep(finishStep, build, catalog, null);
    const ids = new Set(result.map((s) => s.ingredientId));

    expect(ids.has('parsley')).toBe(false);
  });

  it('excludes an ingredient placed in a different stage than its compatible step', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    // lemon_juice is finish-compatible; simulate user placing it at stir_in (an override)
    const build = buildWith([{ id: 'lemon_juice', stage: 'stir_in' }]);
    const result = scoreStep(finishStep, build, catalog, null);
    const ids = new Set(result.map((s) => s.ingredientId));

    expect(ids.has('lemon_juice')).toBe(false);
  });

  it('does not exclude other finish-step ingredients when one is placed', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const build = buildWith([{ id: 'parsley', stage: 'finish' }]);
    const result = scoreStep(finishStep, build, catalog, null);
    const ids = new Set(result.map((s) => s.ingredientId));

    // miso and lemon_juice are still placeable
    expect(ids.has('miso')).toBe(true);
    expect(ids.has('lemon_juice')).toBe(true);
  });

  it('excludes multiple placed ingredients simultaneously', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const build = buildWith([
      { id: 'parsley', stage: 'finish' },
      { id: 'lemon_juice', stage: 'finish' },
      { id: 'miso', stage: 'finish' },
    ]);
    const result = scoreStep(finishStep, build, catalog, null);
    const ids = new Set(result.map((s) => s.ingredientId));

    expect(ids.has('parsley')).toBe(false);
    expect(ids.has('lemon_juice')).toBe(false);
    expect(ids.has('miso')).toBe(false);
  });
});

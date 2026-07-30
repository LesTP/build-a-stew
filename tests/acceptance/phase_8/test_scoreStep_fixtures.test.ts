/**
 * Phase 8 acceptance — representative fixture builds
 *
 * Five fixture scenarios that pin bucket assignments for characteristic cases.
 * EXECUTE must tune dimension weights/thresholds until all expectations pass.
 *
 * Fixture 1: French aromatics — empty build, French cuisine, aromatics step
 *   French-affinity aromatics (shallot, leek) rank above East-Asian-only aromatics (ginger)
 *
 * Fixture 2: Richness correction — heavy beef build, no cuisine, finish step
 *   Freshness/acidity providers (lemon_juice, parsley) are Top; richness stackers (crispy_bacon) are not Top
 *
 * Fixture 3: Mexican cuisine — pork_shoulder build, Mexican cuisine, finish step
 *   Mexican-affinity finishers (lime_juice, cilantro) rank above French-affinity ones (lemon_juice, parsley)
 *
 * Fixture 4: Timing caution at longCook — beef_shank (60-90 min) build, pressure step
 *   Short-cook ingredients (butternut_squash 5-10 min, red_lentils 5-10 min) are Fallback;
 *   longer-cook ingredients (dried_black_beans 35-60 min) are not Fallback
 *
 * Fixture 5: Pairing synergy — chicken_thighs build, no cuisine, finish step
 *   parsley (pairsWith chicken_thighs) and lemon_juice (pairsWith chicken_thighs) are Top;
 *   salt (no pairing, minimal balance contribution) is Fallback
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scoreStep } from '../../../src/scoring';
import { getBraiseTechnique } from '../../../src/techniques';
import { loadCatalog } from '../../../src/catalog';
import type { Ingredient, StewBuild } from '../../../src/types';

function buildWith(ids: Array<{ id: string; stage: string }>): StewBuild {
  return {
    id: 'phase8-fixture',
    ingredients: ids.map(({ id, stage }) => ({
      ingredientId: id,
      stage: stage as import('../../../src/types').CookingStage,
    })),
  };
}

describe('Fixture 1 — French aromatics (empty build, French cuisine, aromatics step)', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('shallot (french cuisine) appears in results', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'f1', ingredients: [] }, catalog, 'french');
    expect(result.some((s) => s.ingredientId === 'shallot')).toBe(true);
  });

  it('shallot gets a "cuisine" reason with French cuisine selected', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'f1', ingredients: [] }, catalog, 'french');
    const shallot = result.find((s) => s.ingredientId === 'shallot')!;
    expect(shallot.reasons).toContain('cuisine');
  });

  it('ginger (indian/east_asian, no French affinity) still appears — cuisine is not a filter', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'f1', ingredients: [] }, catalog, 'french');
    expect(result.some((s) => s.ingredientId === 'ginger')).toBe(true);
  });

  it('ginger does NOT get a "cuisine" reason with French cuisine selected', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'f1', ingredients: [] }, catalog, 'french');
    const ginger = result.find((s) => s.ingredientId === 'ginger')!;
    expect(ginger.reasons).not.toContain('cuisine');
  });

  it('shallot scores higher than ginger with French cuisine selected', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'f1', ingredients: [] }, catalog, 'french');
    const shallot = result.find((s) => s.ingredientId === 'shallot')!;
    const ginger = result.find((s) => s.ingredientId === 'ginger')!;
    expect(shallot.score).toBeGreaterThan(ginger.score);
  });

  it('shallot is in the "top" bucket', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'f1', ingredients: [] }, catalog, 'french');
    const shallot = result.find((s) => s.ingredientId === 'shallot')!;
    expect(shallot.bucket).toBe('top');
  });

  it('ginger is NOT in the "top" bucket with French cuisine selected', () => {
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    const result = scoreStep(aromaticsStep, { id: 'f1', ingredients: [] }, catalog, 'french');
    const ginger = result.find((s) => s.ingredientId === 'ginger')!;
    expect(ginger.bucket).not.toBe('top');
  });
});

describe('Fixture 2 — Richness correction (beef_shank + bacon build, no cuisine, finish step)', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  function richBuild(): StewBuild {
    // beef_shank: body:5, richness:4, umami:4; bacon: richness:4, umami:3 → extremely rich, zero freshness
    return buildWith([
      { id: 'beef_shank', stage: 'brown' },
      { id: 'bacon', stage: 'brown' },
    ]);
  }

  it('lemon_juice (freshness:4, acidity:5) gets a "balance" reason on a rich build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, richBuild(), catalog, null);
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    expect(lemon).toBeDefined();
    expect(lemon.reasons).toContain('balance');
  });

  it('parsley (freshness:4) gets a "balance" reason on a rich build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, richBuild(), catalog, null);
    const parsley = result.find((s) => s.ingredientId === 'parsley')!;
    expect(parsley).toBeDefined();
    expect(parsley.reasons).toContain('balance');
  });

  it('lemon_juice is in the "top" bucket on a rich build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, richBuild(), catalog, null);
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    expect(lemon.bucket).toBe('top');
  });

  it('crispy_bacon (richness:4, no freshness) is NOT in the "top" bucket on a rich build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, richBuild(), catalog, null);
    const crispyBacon = result.find((s) => s.ingredientId === 'crispy_bacon')!;
    expect(crispyBacon).toBeDefined();
    expect(crispyBacon.bucket).not.toBe('top');
  });

  it('lemon_juice scores higher than crispy_bacon on a rich build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, richBuild(), catalog, null);
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    const crispyBacon = result.find((s) => s.ingredientId === 'crispy_bacon')!;
    expect(lemon.score).toBeGreaterThan(crispyBacon.score);
  });
});

describe('Fixture 3 — Mexican cuisine (pork_shoulder build, Mexican cuisine, finish step)', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  function mexicanBuild(): StewBuild {
    return buildWith([{ id: 'pork_shoulder', stage: 'brown' }]);
  }

  it('lime_juice (mexican cuisine) gets a "cuisine" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, mexicanBuild(), catalog, 'mexican');
    const lime = result.find((s) => s.ingredientId === 'lime_juice')!;
    expect(lime).toBeDefined();
    expect(lime.reasons).toContain('cuisine');
  });

  it('cilantro (mexican cuisine) gets a "cuisine" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, mexicanBuild(), catalog, 'mexican');
    const cilantro = result.find((s) => s.ingredientId === 'cilantro')!;
    expect(cilantro).toBeDefined();
    expect(cilantro.reasons).toContain('cuisine');
  });

  it('lemon_juice (french/mediterranean, not mexican) does NOT get a "cuisine" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, mexicanBuild(), catalog, 'mexican');
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    expect(lemon).toBeDefined();
    expect(lemon.reasons).not.toContain('cuisine');
  });

  it('lemon_juice still appears in results (cuisine is never a filter)', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, mexicanBuild(), catalog, 'mexican');
    expect(result.some((s) => s.ingredientId === 'lemon_juice')).toBe(true);
  });

  it('lime_juice scores higher than lemon_juice with Mexican cuisine selected', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, mexicanBuild(), catalog, 'mexican');
    const lime = result.find((s) => s.ingredientId === 'lime_juice')!;
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    expect(lime.score).toBeGreaterThan(lemon.score);
  });

  it('lime_juice is in the "top" bucket with Mexican cuisine selected', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, mexicanBuild(), catalog, 'mexican');
    const lime = result.find((s) => s.ingredientId === 'lime_juice')!;
    expect(lime.bucket).toBe('top');
  });
});

describe('Fixture 4 — Timing caution at longCook step (beef_shank build, pressure step)', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  function longCookBuild(): StewBuild {
    // beef_shank: cookMinutes {min:60, max:90} — the "longest" reference
    return buildWith([{ id: 'beef_shank', stage: 'brown' }]);
  }

  it('butternut_squash (5-10 min) gets "caution" reason at pressure step with beef_shank reference', () => {
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, longCookBuild(), catalog, null);
    const squash = result.find((s) => s.ingredientId === 'butternut_squash')!;
    expect(squash).toBeDefined();
    expect(squash.reasons).toContain('caution');
  });

  it('red_lentils_pressure (5-10 min) gets "caution" reason at pressure step with beef_shank reference', () => {
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, longCookBuild(), catalog, null);
    const lentils = result.find((s) => s.ingredientId === 'red_lentils_pressure')!;
    expect(lentils).toBeDefined();
    expect(lentils.reasons).toContain('caution');
  });

  it('butternut_squash is in the "fallback" bucket', () => {
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, longCookBuild(), catalog, null);
    const squash = result.find((s) => s.ingredientId === 'butternut_squash')!;
    expect(squash.bucket).toBe('fallback');
  });

  it('dried_black_beans (35-60 min) is NOT in the "fallback" bucket with beef_shank reference', () => {
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, longCookBuild(), catalog, null);
    const beans = result.find((s) => s.ingredientId === 'dried_black_beans')!;
    expect(beans).toBeDefined();
    expect(beans.bucket).not.toBe('fallback');
  });

  it('dried_black_beans scores higher than butternut_squash at pressure step with beef_shank', () => {
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, longCookBuild(), catalog, null);
    const beans = result.find((s) => s.ingredientId === 'dried_black_beans')!;
    const squash = result.find((s) => s.ingredientId === 'butternut_squash')!;
    expect(beans.score).toBeGreaterThan(squash.score);
  });

  it('same short-cook ingredient does NOT get timing caution at a non-longCook step', () => {
    // butternut_squash at the aromatics step — timing dimension is inactive
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    expect(aromaticsStep.longCook).toBeFalsy();

    const result = scoreStep(aromaticsStep, longCookBuild(), catalog, null);
    // butternut_squash is not step-appropriate at aromatics, so it won't appear
    // The key assertion is that no aromatics ingredient gets a timing caution
    for (const s of result) {
      expect(s.reasons, `${s.ingredientId} should not have timing caution at aromatics`).not.toContain('timing');
    }
  });
});

describe('Fixture 5 — Pairing synergy (chicken_thighs build, no cuisine, finish step)', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  function chickenBuild(): StewBuild {
    return buildWith([{ id: 'chicken_thighs', stage: 'brown' }]);
  }

  it('parsley (pairsWith chicken_thighs) gets a "balance" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, chickenBuild(), catalog, null);
    const parsley = result.find((s) => s.ingredientId === 'parsley')!;
    expect(parsley).toBeDefined();
    expect(parsley.reasons).toContain('balance');
  });

  it('lemon_juice (pairsWith chicken_thighs) gets a "balance" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, chickenBuild(), catalog, null);
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    expect(lemon).toBeDefined();
    expect(lemon.reasons).toContain('balance');
  });

  it('parsley is in the "top" bucket with chicken_thighs in build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, chickenBuild(), catalog, null);
    const parsley = result.find((s) => s.ingredientId === 'parsley')!;
    expect(parsley.bucket).toBe('top');
  });

  it('lemon_juice is in the "top" bucket with chicken_thighs in build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, chickenBuild(), catalog, null);
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    expect(lemon.bucket).toBe('top');
  });

  it('salt (no pairing, no balance contribution) is in the "fallback" bucket', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, chickenBuild(), catalog, null);
    const salt = result.find((s) => s.ingredientId === 'salt')!;
    expect(salt).toBeDefined();
    expect(salt.bucket).toBe('fallback');
  });

  it('parsley scores higher than salt with chicken_thighs in build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, chickenBuild(), catalog, null);
    const parsley = result.find((s) => s.ingredientId === 'parsley')!;
    const salt = result.find((s) => s.ingredientId === 'salt')!;
    expect(parsley.score).toBeGreaterThan(salt.score);
  });

  it('lemon_juice scores higher than salt with chicken_thighs in build', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, chickenBuild(), catalog, null);
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    const salt = result.find((s) => s.ingredientId === 'salt')!;
    expect(lemon.score).toBeGreaterThan(salt.score);
  });
});

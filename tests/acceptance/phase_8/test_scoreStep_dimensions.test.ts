/**
 * Phase 8 acceptance — scoring dimension behavior
 *
 * Contract guarantees under test:
 *
 * Balance dimension:
 * - An ingredient that fills a low-scoring axis gets a "balance" reason
 * - An ingredient overloading an already-high axis scores lower than one filling a low axis
 * - pairsWith a selected ingredient adds a "balance" reason and boosts score
 * - avoidWith a selected ingredient adds a "caution" reason
 *
 * Cuisine dimension:
 * - An ingredient matching the selected cuisine gets a "cuisine" reason
 * - An ingredient not matching the cuisine still appears (cuisine is never a filter)
 * - With cuisine=null, no "cuisine" reason is applied to any ingredient
 *
 * Timing dimension:
 * - At a non-longCook step, no "timing" reason appears in any Suggestion
 * - At the longCook step (pressure), timing is assessed against the longest placed ingredient
 * - An ingredient whose cookMinutes.max is far below the reference cook time gets "caution"
 *
 * Interaction:
 * - An ingredient can accumulate multiple reasons in a single call (e.g. "cuisine" + "balance")
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scoreStep } from '../../../src/scoring';
import { getBraiseTechnique } from '../../../src/techniques';
import { loadCatalog } from '../../../src/catalog';
import type { Ingredient, StewBuild } from '../../../src/types';

function buildWith(ids: Array<{ id: string; stage: string }>): StewBuild {
  return {
    id: 'phase8-dim-test',
    ingredients: ids.map(({ id, stage }) => ({
      ingredientId: id,
      stage: stage as import('../../../src/types').CookingStage,
    })),
  };
}

describe('scoreStep — balance dimension', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('a freshness-providing ingredient gets "balance" reason when build freshness is low', () => {
    // beef_shank has no freshness; build is richness-heavy, freshness=0
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    // lemon_juice: acidity:5, freshness:4 — should be recognized as filling low freshness/acidity
    const lemon = result.find((s) => s.ingredientId === 'lemon_juice');
    expect(lemon).toBeDefined();
    expect(lemon!.reasons).toContain('balance');
  });

  it('a richness-adding ingredient scores lower than a freshness-adding ingredient when richness is already high', () => {
    // beef_shank: richness:4, body:5 — makes richness very high, freshness=0
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    const crispyBacon = result.find((s) => s.ingredientId === 'crispy_bacon')!;

    expect(lemon).toBeDefined();
    expect(crispyBacon).toBeDefined();
    // lemon_juice fills low freshness/acidity; crispy_bacon adds more richness to an already-rich build
    expect(lemon.score).toBeGreaterThan(crispyBacon.score);
  });
});

describe('scoreStep — pairing dimension', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('an ingredient that pairsWith a placed ingredient gets a "balance" reason', () => {
    // chicken_thighs is placed; parsley pairsWith chicken_thighs
    const build = buildWith([{ id: 'chicken_thighs', stage: 'brown' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    const parsley = result.find((s) => s.ingredientId === 'parsley');
    expect(parsley).toBeDefined();
    expect(parsley!.reasons).toContain('balance');
  });

  it('an ingredient that pairsWith a placed ingredient scores higher than one without a pairing', () => {
    // chicken_thighs is placed; lemon_juice pairsWith chicken_thighs; cider_vinegar does not
    const build = buildWith([{ id: 'chicken_thighs', stage: 'brown' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    const ciderVinegar = result.find((s) => s.ingredientId === 'cider_vinegar')!;

    expect(lemon).toBeDefined();
    expect(ciderVinegar).toBeDefined();
    // lemon_juice has a pairsWith boost; cider_vinegar does not pair with chicken_thighs
    expect(lemon.score).toBeGreaterThan(ciderVinegar.score);
  });

  it('an ingredient that avoidWith a placed ingredient gets a "caution" reason', () => {
    // ham_hock is placed; miso avoidWith ham_hock
    const build = buildWith([{ id: 'ham_hock', stage: 'pressure' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    const miso = result.find((s) => s.ingredientId === 'miso');
    expect(miso).toBeDefined();
    expect(miso!.reasons).toContain('caution');
  });

  it('a cautioned ingredient (avoidWith) has a non-empty cautions array', () => {
    // ham_hock placed; miso avoidWith ham_hock
    const build = buildWith([{ id: 'ham_hock', stage: 'pressure' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    const miso = result.find((s) => s.ingredientId === 'miso');
    expect(miso).toBeDefined();
    expect(miso!.cautions.length).toBeGreaterThan(0);
  });

  it('a cautioned ingredient scores lower than a compatible non-cautioned finish ingredient', () => {
    // ham_hock placed; miso is cautioned; parsley is not
    const build = buildWith([{ id: 'ham_hock', stage: 'pressure' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    const miso = result.find((s) => s.ingredientId === 'miso')!;
    const parsley = result.find((s) => s.ingredientId === 'parsley')!;

    expect(miso).toBeDefined();
    expect(parsley).toBeDefined();
    expect(parsley.score).toBeGreaterThan(miso.score);
  });
});

describe('scoreStep — cuisine dimension', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('a cuisine-matching ingredient gets a "cuisine" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    // sherry_vinegar has iberian and french cuisine; parsley has french cuisine
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, 'french');

    const parsley = result.find((s) => s.ingredientId === 'parsley');
    expect(parsley).toBeDefined();
    expect(parsley!.reasons).toContain('cuisine');
  });

  it('a non-cuisine-matching ingredient does NOT get a "cuisine" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    // garam_masala is indian; with french cuisine selected it should not get cuisine reason
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, 'french');

    const garamMasala = result.find((s) => s.ingredientId === 'garam_masala');
    expect(garamMasala).toBeDefined();
    expect(garamMasala!.reasons).not.toContain('cuisine');
  });

  it('non-matching cuisine ingredient still appears in results (cuisine is never a filter)', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    // garam_masala is indian; selecting french cuisine should NOT exclude it
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, 'french');
    const ids = new Set(result.map((s) => s.ingredientId));

    expect(ids.has('garam_masala')).toBe(true);
  });

  it('cuisine-matching ingredient scores higher than an equivalent non-matching one', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    // Both lemon_juice (french) and lime_juice (mexican) are similar balance-wise.
    // With french cuisine selected, lemon_juice should score higher.
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, 'french');

    const lemon = result.find((s) => s.ingredientId === 'lemon_juice')!;
    const lime = result.find((s) => s.ingredientId === 'lime_juice')!;

    expect(lemon).toBeDefined();
    expect(lime).toBeDefined();
    expect(lemon.score).toBeGreaterThan(lime.score);
  });

  it('with cuisine=null, no suggestion gets a "cuisine" reason', () => {
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, { id: 'test', ingredients: [] }, catalog, null);

    for (const s of result) {
      expect(s.reasons, `${s.ingredientId} should not have cuisine reason`).not.toContain('cuisine');
    }
  });
});

describe('scoreStep — timing dimension', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('at a non-longCook step (aromatics), no suggestion gets a "timing" reason', () => {
    // beef_shank placed at brown (60-90 min); scoring aromatics step
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const aromaticsStep = braise.steps.find((s) => s.id === 'aromatics')!;
    expect(aromaticsStep.longCook).toBeFalsy();

    const result = scoreStep(aromaticsStep, build, catalog, null);
    for (const s of result) {
      expect(s.reasons, `${s.ingredientId} should not have timing reason at aromatics`).not.toContain('timing');
    }
  });

  it('at a non-longCook step (finish), no suggestion gets a "timing" reason', () => {
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    expect(finishStep.longCook).toBeFalsy();

    const result = scoreStep(finishStep, build, catalog, null);
    for (const s of result) {
      expect(s.reasons, `${s.ingredientId} should not have timing reason at finish`).not.toContain('timing');
    }
  });

  it('at the longCook step (pressure), a short-cook ingredient gets "caution" when a long-cook ingredient is selected', () => {
    // beef_shank: cookMinutes {min:60, max:90} — this is the "longest" reference
    // butternut_squash: cookMinutes {min:5, max:10} — would dissolve in 60-90 min
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    expect(pressureStep.longCook).toBe(true);

    const result = scoreStep(pressureStep, build, catalog, null);

    const squash = result.find((s) => s.ingredientId === 'butternut_squash');
    expect(squash).toBeDefined();
    expect(squash!.reasons).toContain('caution');
  });

  it('at the longCook step, a short-cook ingredient has a non-empty cautions array', () => {
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, build, catalog, null);

    const squash = result.find((s) => s.ingredientId === 'butternut_squash')!;
    expect(squash).toBeDefined();
    expect(squash.cautions.length).toBeGreaterThan(0);
  });

  it('at the longCook step, a short-cook ingredient scores lower than one that fits the cook window', () => {
    // beef_shank reference: 60-90 min
    // butternut_squash: 5-10 min — far outside window
    // dried_black_beans: 35-60 min — within range of 60-min reference
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, build, catalog, null);

    const squash = result.find((s) => s.ingredientId === 'butternut_squash')!;
    const beans = result.find((s) => s.ingredientId === 'dried_black_beans')!;

    expect(squash).toBeDefined();
    expect(beans).toBeDefined();
    expect(beans.score).toBeGreaterThan(squash.score);
  });

  it('at the longCook step with no placed ingredients, timing dimension produces no cautions', () => {
    // No reference ingredient → timing cannot be assessed → no cautions from timing
    const pressureStep = braise.steps.find((s) => s.id === 'pressure')!;
    const result = scoreStep(pressureStep, { id: 'test', ingredients: [] }, catalog, null);

    for (const s of result) {
      // Without any reference ingredient, timing caution should not fire
      expect(s.reasons, `${s.ingredientId} should not have timing caution with empty build`).not.toContain('timing');
    }
  });
});

describe('scoreStep — dimension interactions', () => {
  let catalog: Ingredient[];
  const braise = getBraiseTechnique();

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('an ingredient can accumulate both "cuisine" and "balance" reasons simultaneously', () => {
    // beef_shank placed (high richness, low freshness); French cuisine selected
    // lemon_juice: french + fills low freshness → should get both reasons
    const build = buildWith([{ id: 'beef_shank', stage: 'brown' }]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, 'french');

    const lemon = result.find((s) => s.ingredientId === 'lemon_juice');
    expect(lemon).toBeDefined();
    expect(lemon!.reasons).toContain('cuisine');
    expect(lemon!.reasons).toContain('balance');
  });

  it('a caution-carrying ingredient can also carry positive reasons', () => {
    // ham_hock placed; miso avoidWith ham_hock but also has pairsWith chicken_thighs
    // With chicken_thighs also in build, miso could get both "balance" (pairing) and "caution" (avoidWith ham_hock)
    const build = buildWith([
      { id: 'ham_hock', stage: 'pressure' },
      { id: 'chicken_thighs', stage: 'brown' },
    ]);
    const finishStep = braise.steps.find((s) => s.id === 'finish')!;
    const result = scoreStep(finishStep, build, catalog, null);

    const miso = result.find((s) => s.ingredientId === 'miso');
    expect(miso).toBeDefined();
    // miso must carry a caution (from ham_hock avoidWith)
    expect(miso!.reasons).toContain('caution');
    // miso pairsWith chicken_thighs → should also carry balance reason
    expect(miso!.reasons).toContain('balance');
  });
});

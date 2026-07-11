/**
 * Phase 2 acceptance — Stage-grouped build summary
 *
 * Verifies the groupBuildByStage utility that underpins the minimal
 * stage-grouped build summary UI:
 *
 *   groupBuildByStage(build, catalog) → Record<CookingStage, BuildIngredient[]>
 *
 * Contract guarantees under test:
 *   - Empty build → empty record (no stage keys)
 *   - All selected ingredients appear in exactly one stage group
 *   - Stage keys returned are in canonical COOKING_STAGES order
 *   - Empty stages are omitted from the output (not present as empty arrays)
 *   - moveIngredient is reflected correctly after re-grouping
 *   - Full catalog-to-build-to-summary end-to-end path returns a non-empty
 *     grouped record for a non-empty build
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { addIngredient, moveIngredient, groupBuildByStage } from '../../../src/build';
import { loadCatalog } from '../../../src/catalog';
import { COOKING_STAGES } from '../../../src/types';
import type { Ingredient, StewBuild, CookingStage } from '../../../src/types';

function emptyBuild(): StewBuild {
  return { id: 'summary-test-' + Math.random().toString(36).slice(2), ingredients: [] };
}

describe('Stage-grouped build summary — Phase 2', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('empty build produces no stage groups', () => {
    const grouped = groupBuildByStage(emptyBuild());
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it('all selected ingredients appear in exactly one stage group (no duplicates, none missing)', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'carrot', catalog);
    const b3 = addIngredient(b2, 'onion', catalog);
    const grouped = groupBuildByStage(b3);

    const allInGroups = Object.values(grouped).flat();
    expect(allInGroups).toHaveLength(b3.ingredients.length);

    for (const bi of b3.ingredients) {
      const found = allInGroups.filter(g => g.ingredientId === bi.ingredientId);
      expect(found).toHaveLength(1);
    }
  });

  it('stage groups are returned in canonical COOKING_STAGES order', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'carrot', catalog);
    const grouped = groupBuildByStage(b2);
    const returnedStages = Object.keys(grouped) as CookingStage[];

    const canonicalIndices = returnedStages.map(s => COOKING_STAGES.indexOf(s));
    for (let i = 1; i < canonicalIndices.length; i++) {
      expect(canonicalIndices[i]).toBeGreaterThan(canonicalIndices[i - 1]);
    }
  });

  it('empty stages are not present in the output (no empty arrays)', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const grouped = groupBuildByStage(b1);
    for (const [, ingredients] of Object.entries(grouped)) {
      expect(ingredients.length).toBeGreaterThan(0);
    }
  });

  it('after moveIngredient the new stage group contains the ingredient and the old stage entry is updated', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const originalStage = b1.ingredients[0].stage;
    const newStage: CookingStage = originalStage === 'pressure' ? 'brown' : 'pressure';

    const b2 = moveIngredient(b1, 'chicken_thighs', newStage);
    const grouped = groupBuildByStage(b2);

    expect(grouped[newStage]).toBeDefined();
    expect(grouped[newStage].some(bi => bi.ingredientId === 'chicken_thighs')).toBe(true);

    if (grouped[originalStage]) {
      expect(grouped[originalStage].some(bi => bi.ingredientId === 'chicken_thighs')).toBe(false);
    }
  });

  it('end-to-end: catalog load → build → stage summary produces a non-empty grouped record', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'onion', catalog);
    const grouped = groupBuildByStage(b2);

    expect(Object.keys(grouped).length).toBeGreaterThan(0);
    const allStages = new Set(COOKING_STAGES as readonly string[]);
    for (const stage of Object.keys(grouped)) {
      expect(allStages.has(stage)).toBe(true);
    }
  });
});

/**
 * Phase 2 acceptance — Immutable build operations
 *
 * Verifies the public build mutation surface:
 *   addIngredient(build, id, catalog)    → StewBuild
 *   removeIngredient(build, id)          → StewBuild
 *   moveIngredient(build, id, stage)     → StewBuild
 *   updateBuildIngredient(build, id, patch) → StewBuild
 *
 * Contract guarantees under test:
 *   - Every function returns a NEW StewBuild; the input is not mutated
 *   - Unknown ingredient IDs throw UnknownIngredientError (typed error)
 *   - The same ingredient ID appears at most once in a build (duplicate prevention)
 *   - moveIngredient with an ingredient not in the build throws UnknownIngredientError
 *   - add + remove round-trip yields an empty ingredients list
 *   - Multiple distinct ingredients can coexist
 *
 * NOTE (D-15): build operations take the catalog as an explicit parameter so
 * pure unit tests do not depend on module-level singleton load order.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  addIngredient,
  removeIngredient,
  moveIngredient,
  updateBuildIngredient,
  UnknownIngredientError,
} from '../../../src/build';
import { loadCatalog } from '../../../src/catalog';
import type { StewBuild, Ingredient } from '../../../src/types';

function emptyBuild(): StewBuild {
  return { id: 'test-build-' + Math.random().toString(36).slice(2), ingredients: [] };
}

describe('Immutable build operations — Phase 2', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  // ── addIngredient ─────────────────────────────────────────────────────────

  it('addIngredient returns a new StewBuild and does not mutate the input', () => {
    const original = emptyBuild();
    const originalRef = original.ingredients;
    const updated = addIngredient(original, 'chicken_thighs', catalog);
    expect(updated).not.toBe(original);
    expect(original.ingredients).toBe(originalRef); // same array reference — not mutated
    expect(updated.ingredients).toHaveLength(1);
  });

  it('addIngredient places the ingredient in the catalog default stage', () => {
    const catalogIngredient = catalog.find(i => i.id === 'chicken_thighs');
    expect(catalogIngredient).toBeDefined();
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    expect(build.ingredients[0].stage).toBe(catalogIngredient!.stage);
  });

  it('addIngredient with an unknown ID throws UnknownIngredientError', () => {
    expect(() =>
      addIngredient(emptyBuild(), '__no_such_ingredient__', catalog)
    ).toThrow(UnknownIngredientError);
  });

  it('adding the same ingredient ID twice results in exactly one entry (duplicate prevention)', () => {
    const once = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const twice = addIngredient(once, 'chicken_thighs', catalog);
    expect(twice.ingredients).toHaveLength(1);
  });

  it('multiple distinct ingredients coexist in a build', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'carrot', catalog);
    const b3 = addIngredient(b2, 'onion', catalog);
    expect(b3.ingredients).toHaveLength(3);
    const ids = b3.ingredients.map(bi => bi.ingredientId);
    expect(ids).toContain('chicken_thighs');
    expect(ids).toContain('carrot');
    expect(ids).toContain('onion');
  });

  // ── removeIngredient ──────────────────────────────────────────────────────

  it('removeIngredient returns a new StewBuild and does not mutate the input', () => {
    const withChicken = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const snapshotLength = withChicken.ingredients.length;
    const removed = removeIngredient(withChicken, 'chicken_thighs');
    expect(removed).not.toBe(withChicken);
    expect(withChicken.ingredients).toHaveLength(snapshotLength); // original unchanged
    expect(removed.ingredients).toHaveLength(0);
  });

  it('removeIngredient on an ID not in the build returns a build with unchanged ingredients', () => {
    const build = emptyBuild();
    const result = removeIngredient(build, 'chicken_thighs');
    expect(result.ingredients).toHaveLength(0);
  });

  it('add + remove round-trip produces a build with empty ingredients', () => {
    const added = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const removed = removeIngredient(added, 'chicken_thighs');
    expect(removed.ingredients).toHaveLength(0);
  });

  it('removing one ingredient from a multi-ingredient build leaves the others intact', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'carrot', catalog);
    const b3 = removeIngredient(b2, 'chicken_thighs');
    expect(b3.ingredients).toHaveLength(1);
    expect(b3.ingredients[0].ingredientId).toBe('carrot');
  });

  // ── moveIngredient ────────────────────────────────────────────────────────

  it('moveIngredient returns a new StewBuild and does not mutate the input', () => {
    const withChicken = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const originalStage = withChicken.ingredients[0].stage;
    const moved = moveIngredient(withChicken, 'chicken_thighs', 'pressure');
    expect(moved).not.toBe(withChicken);
    expect(withChicken.ingredients[0].stage).toBe(originalStage); // original unchanged
    expect(moved.ingredients[0].stage).toBe('pressure');
  });

  it('moveIngredient with an ID not in the build throws UnknownIngredientError', () => {
    expect(() =>
      moveIngredient(emptyBuild(), '__no_such_ingredient__', 'pressure')
    ).toThrow(UnknownIngredientError);
  });

  it('moveIngredient changes only the stage — other fields remain intact', () => {
    const b1 = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const b2 = updateBuildIngredient(b1, 'chicken_thighs', { quantity: 2, unit: 'lbs' });
    const b3 = moveIngredient(b2, 'chicken_thighs', 'simmer_after');
    expect(b3.ingredients[0].stage).toBe('simmer_after');
    expect(b3.ingredients[0].quantity).toBe(2);
    expect(b3.ingredients[0].unit).toBe('lbs');
  });

  // ── updateBuildIngredient ─────────────────────────────────────────────────

  it('updateBuildIngredient patches quantity and unit, returns a new build', () => {
    const withCarrot = addIngredient(emptyBuild(), 'carrot', catalog);
    const updated = updateBuildIngredient(withCarrot, 'carrot', { quantity: 3, unit: 'medium' });
    expect(updated).not.toBe(withCarrot);
    expect(updated.ingredients[0].quantity).toBe(3);
    expect(updated.ingredients[0].unit).toBe('medium');
    // Original unchanged
    expect(withCarrot.ingredients[0].quantity).toBeUndefined();
  });

  it('updateBuildIngredient with only quantity does not touch unit', () => {
    const b1 = addIngredient(emptyBuild(), 'carrot', catalog);
    const b2 = updateBuildIngredient(b1, 'carrot', { unit: 'cups' });
    const b3 = updateBuildIngredient(b2, 'carrot', { quantity: 2 });
    expect(b3.ingredients[0].quantity).toBe(2);
    expect(b3.ingredients[0].unit).toBe('cups');
  });

  it('updateBuildIngredient with a stage patch changes the stage', () => {
    const b1 = addIngredient(emptyBuild(), 'carrot', catalog);
    const b2 = updateBuildIngredient(b1, 'carrot', { stage: 'simmer_after' });
    expect(b2.ingredients[0].stage).toBe('simmer_after');
  });

  // ── Cross-operation invariants ────────────────────────────────────────────

  it('build id is preserved across all mutation operations', () => {
    const build = emptyBuild();
    const id = build.id;
    const b1 = addIngredient(build, 'chicken_thighs', catalog);
    const b2 = moveIngredient(b1, 'chicken_thighs', 'pressure');
    const b3 = updateBuildIngredient(b2, 'chicken_thighs', { quantity: 1 });
    const b4 = removeIngredient(b3, 'chicken_thighs');
    expect(b1.id).toBe(id);
    expect(b2.id).toBe(id);
    expect(b3.id).toBe(id);
    expect(b4.id).toBe(id);
  });
});

/**
 * Phase 2 acceptance — Catalog access API
 *
 * Verifies the public catalog surface:
 *   getIngredient(id)  → Ingredient | undefined
 *   listIngredients(filters?) → Ingredient[]
 *
 * Guarantees under test:
 *   - getIngredient returns undefined for unknown IDs
 *   - getIngredient returns the correct ingredient for a known ID
 *   - listIngredients() returns a non-empty, deterministic result
 *   - listIngredients returned objects are not references into internal state
 *     (mutation by caller must not affect future calls)
 *   - listIngredients({ stage }) returns only ingredients in that stage
 *   - listIngredients({ category }) returns only ingredients in that category
 */

import { describe, it, expect } from 'vitest';
import { getIngredient, listIngredients } from '../../../src/catalog';

describe('Catalog access API — Phase 2', () => {
  it('getIngredient returns undefined for an unknown ID', () => {
    expect(getIngredient('__no_such_ingredient__')).toBeUndefined();
  });

  it('getIngredient returns a record with the correct id for a known ID', () => {
    // chicken_thighs is a core protein ingredient expected in the full catalog
    const result = getIngredient('chicken_thighs');
    expect(result).toBeDefined();
    expect(result?.id).toBe('chicken_thighs');
  });

  it('getIngredient returned record conforms to the Ingredient schema', () => {
    const result = getIngredient('chicken_thighs');
    expect(result).toBeDefined();
    expect(typeof result?.name).toBe('string');
    expect(Array.isArray(result?.roles)).toBe(true);
    expect(Array.isArray(result?.cuisines)).toBe(true);
    expect(typeof result?.saltRisk).toBe('string');
  });

  it('listIngredients() returns a non-empty array', () => {
    const all = listIngredients();
    expect(all.length).toBeGreaterThan(0);
  });

  it('listIngredients() is deterministic — two calls with no filters return the same IDs in the same order', () => {
    const first = listIngredients();
    const second = listIngredients();
    expect(first.map(i => i.id)).toEqual(second.map(i => i.id));
  });

  it('listIngredients returned objects are independent of internal catalog state — mutation by caller does not affect future calls', () => {
    const all = listIngredients();
    const first = all[0];
    expect(first).toBeDefined();
    const originalName = first.name;
    // Attempt caller mutation
    (first as any).name = '__mutated__';
    const secondCall = listIngredients();
    expect(secondCall[0].name).toBe(originalName);
  });

  it('listIngredients({ stage: "brown" }) returns only ingredients with stage "brown"', () => {
    const results = listIngredients({ stage: 'brown' });
    expect(results.length).toBeGreaterThan(0);
    for (const ingredient of results) {
      expect(ingredient.stage).toBe('brown');
    }
  });

  it('listIngredients({ stage: "finish" }) returns only ingredients with stage "finish"', () => {
    const results = listIngredients({ stage: 'finish' });
    expect(results.length).toBeGreaterThan(0);
    for (const ingredient of results) {
      expect(ingredient.stage).toBe('finish');
    }
  });

  it('listIngredients({ category: "protein" }) returns only protein-category ingredients', () => {
    const results = listIngredients({ category: 'protein' });
    expect(results.length).toBeGreaterThan(0);
    for (const ingredient of results) {
      expect(ingredient.category).toBe('protein');
    }
  });

  it('combined stage + category filter is the intersection of both individual filters', () => {
    const byStage = listIngredients({ stage: 'brown' }).map(i => i.id);
    const byCategory = listIngredients({ category: 'protein' }).map(i => i.id);
    const combined = listIngredients({ stage: 'brown', category: 'protein' }).map(i => i.id);

    // Every result of combined must be in both individual sets
    for (const id of combined) {
      expect(byStage).toContain(id);
      expect(byCategory).toContain(id);
    }
    // And it must not include anything outside the intersection
    const byStageSet = new Set(byStage);
    const byCategorySet = new Set(byCategory);
    const intersection = byStage.filter(id => byCategorySet.has(id));
    expect(combined.sort()).toEqual(intersection.sort());
  });
});

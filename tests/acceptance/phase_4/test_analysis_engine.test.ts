/**
 * Phase 4 acceptance — Analysis engine core contract
 *
 * Verifies the public surface of the analysis engine:
 *   analyzeBuild(build: StewBuild, catalog: Ingredient[]): AnalysisResult
 *
 * Contract guarantees under test:
 *   - AnalysisResult always has balanceScores, cuisineScores, warnings, suggestions, timingFindings
 *   - balanceScores contains every BalanceAxis key
 *   - Empty build → all balance axes = 0, no warnings or timing findings
 *   - Balance scores are additive across selected ingredients
 *   - cuisineScores excludes the "universal" tag from ingredient contributions
 *   - Each warning has id, severity ("info" | "warning"), message, optional relatedIngredientIds
 *   - analyzeBuild is pure: identical inputs → identical outputs
 *   - analyzeBuild does not mutate the build or catalog arguments
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { analyzeBuild } from '../../../src/analysis';
import { loadCatalog } from '../../../src/catalog';
import { addIngredient, moveIngredient } from '../../../src/build';
import type { Ingredient, StewBuild, AnalysisResult } from '../../../src/types';
import { BALANCE_AXES } from '../../../src/types';

function emptyBuild(): StewBuild {
  return { id: 'phase4-test-' + Math.random().toString(36).slice(2), ingredients: [] };
}

describe('analyzeBuild — core contract', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  // ── Result shape ─────────────────────────────────────────────────────────

  it('returns an AnalysisResult with all required top-level fields', () => {
    const result: AnalysisResult = analyzeBuild(emptyBuild(), catalog);
    expect(result).toHaveProperty('balanceScores');
    expect(result).toHaveProperty('cuisineScores');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('timingFindings');
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.timingFindings)).toBe(true);
  });

  it('balanceScores contains every BalanceAxis key and all values are numbers', () => {
    const result = analyzeBuild(emptyBuild(), catalog);
    for (const axis of BALANCE_AXES) {
      expect(result.balanceScores).toHaveProperty(axis);
      expect(typeof result.balanceScores[axis]).toBe('number');
    }
  });

  // ── Empty build baseline ─────────────────────────────────────────────────

  it('empty build: all balance axes are 0', () => {
    const result = analyzeBuild(emptyBuild(), catalog);
    for (const axis of BALANCE_AXES) {
      expect(result.balanceScores[axis]).toBe(0);
    }
  });

  it('empty build: no timing findings', () => {
    const build: StewBuild = { ...emptyBuild(), pressureMinutes: 30 };
    const result = analyzeBuild(build, catalog);
    expect(result.timingFindings).toHaveLength(0);
  });

  // ── Balance scoring ──────────────────────────────────────────────────────

  it('single ingredient: balance scores match the catalog entry', () => {
    // garlic: { umami: 1, aromatic_intensity: 4 }
    const garlic = catalog.find(i => i.id === 'garlic')!;
    const build = addIngredient(emptyBuild(), 'garlic', catalog);
    const result = analyzeBuild(build, catalog);

    expect(result.balanceScores.umami).toBe(garlic.balanceScores.umami ?? 0);
    expect(result.balanceScores.aromatic_intensity).toBe(garlic.balanceScores.aromatic_intensity ?? 0);
    expect(result.balanceScores.body).toBe(0); // garlic has no body score
    expect(result.balanceScores.richness).toBe(0);
  });

  it('two ingredients: balance scores are additive sums', () => {
    // onion: { sweetness: 2, umami: 1, aromatic_intensity: 3 }
    // garlic: { umami: 1, aromatic_intensity: 4 }
    // expected: sweetness: 2, umami: 2, aromatic_intensity: 7
    const b1 = addIngredient(emptyBuild(), 'onion', catalog);
    const b2 = addIngredient(b1, 'garlic', catalog);
    const result = analyzeBuild(b2, catalog);

    expect(result.balanceScores.sweetness).toBe(2);
    expect(result.balanceScores.umami).toBe(2);
    expect(result.balanceScores.aromatic_intensity).toBe(7);
    expect(result.balanceScores.body).toBe(0);
  });

  it('balance scores are additive across three ingredients', () => {
    // carrot: { sweetness: 3, texture: 1 }
    // potato: { body: 4, texture: 2 }
    // parsnip: { body: 2, sweetness: 4 }
    // expected: sweetness: 7, texture: 3, body: 6
    const b1 = addIngredient(emptyBuild(), 'carrot', catalog);
    const b2 = addIngredient(b1, 'potato', catalog);
    const b3 = addIngredient(b2, 'parsnip', catalog);
    const result = analyzeBuild(b3, catalog);

    expect(result.balanceScores.sweetness).toBe(7);
    expect(result.balanceScores.texture).toBe(3);
    expect(result.balanceScores.body).toBe(6);
  });

  // ── Cuisine scoring ──────────────────────────────────────────────────────

  it('ingredient with only "universal" cuisine does not boost any non-universal score', () => {
    // garlic and onion are both cuisines: ["universal"]
    const b1 = addIngredient(emptyBuild(), 'garlic', catalog);
    const b2 = addIngredient(b1, 'onion', catalog);
    const result = analyzeBuild(b2, catalog);
    const nonUniversalScores = Object.entries(result.cuisineScores)
      .filter(([tag]) => tag !== 'universal')
      .map(([, score]) => score);
    expect(nonUniversalScores.every(s => s === 0)).toBe(true);
  });

  it('ingredient with non-universal cuisine boosts that cuisine score', () => {
    // rosemary: cuisines: ["italian", "french"] — both should score > 0
    const build = addIngredient(emptyBuild(), 'rosemary', catalog);
    const result = analyzeBuild(build, catalog);
    expect(result.cuisineScores.italian).toBeGreaterThan(0);
    expect(result.cuisineScores.french).toBeGreaterThan(0);
  });

  it('cuisine scores are additive across ingredients', () => {
    // thyme: cuisines: ["french", "european"] (british consolidated to european)
    // rosemary: cuisines: ["italian", "french"]
    // expected: french > italian, french > european
    const b1 = addIngredient(emptyBuild(), 'thyme', catalog);
    const b2 = addIngredient(b1, 'rosemary', catalog);
    const result = analyzeBuild(b2, catalog);
    expect(result.cuisineScores.french).toBeGreaterThan(result.cuisineScores.italian);
    expect(result.cuisineScores.french).toBeGreaterThan(result.cuisineScores.european);
  });

  // ── Warning shape ────────────────────────────────────────────────────────

  it('each warning has id, severity ("info" or "warning"), and a non-empty message', () => {
    // miso in pressure stage fires the stage-placement warning
    const b = moveIngredient(addIngredient(emptyBuild(), 'miso', catalog), 'miso', 'pressure');
    const result = analyzeBuild(b, catalog);
    expect(result.warnings.length).toBeGreaterThan(0);
    for (const w of result.warnings) {
      expect(typeof w.id).toBe('string');
      expect(w.id.length).toBeGreaterThan(0);
      expect(['info', 'warning']).toContain(w.severity);
      expect(typeof w.message).toBe('string');
      expect(w.message.length).toBeGreaterThan(0);
    }
  });

  it('each timing finding references an ingredient and describes the finding', () => {
    // spinach cookMinutes: {min:1, max:3} — 25 min pressure will overrun
    const b = moveIngredient(
      addIngredient({ ...emptyBuild(), pressureMinutes: 25 }, 'spinach', catalog),
      'spinach', 'pressure'
    );
    const result = analyzeBuild(b, catalog);
    // Should have at least one timing finding for spinach
    const spinachFinding = result.timingFindings.find(f => f.ingredientId === 'spinach');
    expect(spinachFinding).toBeDefined();
    expect(typeof spinachFinding!.message).toBe('string');
    expect(spinachFinding!.message.length).toBeGreaterThan(0);
  });

  // ── Purity and non-mutation ──────────────────────────────────────────────

  it('is pure: identical builds + catalog produce identical results', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const r1 = analyzeBuild(build, catalog);
    const r2 = analyzeBuild(build, catalog);
    expect(r1).toEqual(r2);
  });

  it('does not mutate the StewBuild argument', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const snapshot = JSON.stringify(build);
    analyzeBuild(build, catalog);
    expect(JSON.stringify(build)).toBe(snapshot);
  });

  it('does not mutate the catalog argument', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const snapshot = JSON.stringify(catalog);
    analyzeBuild(build, catalog);
    expect(JSON.stringify(catalog)).toBe(snapshot);
  });

  // ── Warning deduplication ────────────────────────────────────────────────

  it('each warning id appears at most once in the result', () => {
    const b1 = addIngredient(emptyBuild(), 'ham_hock', catalog);
    const b2 = addIngredient(b1, 'smoked_sausage', catalog);
    const result = analyzeBuild(b2, catalog);
    const ids = result.warnings.map(w => w.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

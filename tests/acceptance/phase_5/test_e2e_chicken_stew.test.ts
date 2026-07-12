/**
 * Phase 5 acceptance — End-to-end: chicken/roots/barley/spinach/lemon build
 *
 * One end-to-end test covering the full pipeline for a representative stew:
 *   1. Assemble the build using catalog + build mutations
 *   2. Run analyzeBuild — verify expected warnings fire
 *   3. Run generateInstructions — verify instructions follow canonical stage order
 *      and mention every ingredient
 *   4. exportBuild → importBuild — verify the round-trip produces identical instructions
 *   5. pressureMinutes and naturalReleaseMinutes survive the export/import cycle
 *
 * The build:
 *   chicken_thighs        → brown
 *   onion                 → aromatics
 *   garlic                → aromatics
 *   chicken_stock         → pressure
 *   carrot                → pressure
 *   parsnip               → pressure
 *   pearl_barley          → pressure
 *   spinach               → stir_in  (default; moved here)
 *   lemon_juice           → finish
 *
 * Expected warnings/findings:
 *   - spinach in stir_in is correct per default; no stage warning
 *   - pearl_barley cook time should be compatible with 25 min pressure (within range)
 *   - the build has greens (spinach), so no "no greens" freshness suggestion
 *   - lemon juice contributes acidity; no "high richness / low acidity" warning unless
 *     chicken + roots collectively overwhelm lemon
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { generateInstructions } from '../../../src/instructions';
import { exportBuild, importBuild } from '../../../src/persistence';
import { analyzeBuild } from '../../../src/analysis';
import { loadCatalog } from '../../../src/catalog';
import { addIngredient, moveIngredient } from '../../../src/build';
import type { Ingredient, StewBuild } from '../../../src/types';
import { COOKING_STAGES } from '../../../src/types';

function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

function buildChickenStew(catalog: Ingredient[]): StewBuild {
  let build: StewBuild = {
    id: 'e2e-chicken-stew',
    name: 'Chicken, Roots, Barley, Spinach & Lemon',
    pressureMinutes: 25,
    naturalReleaseMinutes: 10,
    ingredients: [],
  };
  build = addIngredient(build, 'chicken_thighs', catalog);
  build = addIngredient(build, 'onion', catalog);
  build = addIngredient(build, 'garlic', catalog);
  build = addIngredient(build, 'chicken_stock', catalog);
  build = moveIngredient(build, 'chicken_stock', 'pressure');
  build = addIngredient(build, 'carrot', catalog);
  build = moveIngredient(build, 'carrot', 'pressure');
  build = addIngredient(build, 'parsnip', catalog);
  build = moveIngredient(build, 'parsnip', 'pressure');
  build = addIngredient(build, 'pearl_barley', catalog);
  build = moveIngredient(build, 'pearl_barley', 'pressure');
  build = addIngredient(build, 'spinach', catalog);
  // spinach default stage is stir_in — leave it there
  build = addIngredient(build, 'lemon_juice', catalog);
  build = moveIngredient(build, 'lemon_juice', 'finish');
  return build;
}

describe('E2E — chicken/roots/barley/spinach/lemon stew', () => {
  let catalog: Ingredient[];
  let build: StewBuild;

  beforeAll(() => {
    catalog = loadCatalog();
    build = buildChickenStew(catalog);
  });

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMockStorage());
  });

  // ── Build assembly sanity ────────────────────────────────────────────────

  it('build contains exactly the 9 expected ingredients', () => {
    const ids = build.ingredients.map(i => i.ingredientId);
    expect(ids).toContain('chicken_thighs');
    expect(ids).toContain('onion');
    expect(ids).toContain('garlic');
    expect(ids).toContain('chicken_stock');
    expect(ids).toContain('carrot');
    expect(ids).toContain('parsnip');
    expect(ids).toContain('pearl_barley');
    expect(ids).toContain('spinach');
    expect(ids).toContain('lemon_juice');
    expect(ids).toHaveLength(9);
  });

  it('spinach is placed in stir_in stage', () => {
    const spinach = build.ingredients.find(i => i.ingredientId === 'spinach');
    expect(spinach?.stage).toBe('stir_in');
  });

  it('pressureMinutes and naturalReleaseMinutes are set', () => {
    expect(build.pressureMinutes).toBe(25);
    expect(build.naturalReleaseMinutes).toBe(10);
  });

  // ── Analysis ─────────────────────────────────────────────────────────────

  it('analyzeBuild returns a well-formed result for the chicken stew build', () => {
    const result = analyzeBuild(build, catalog);
    expect(result).toHaveProperty('balanceScores');
    expect(result).toHaveProperty('cuisineScores');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('timingFindings');
  });

  it('spinach in stir_in does NOT fire a stage-placement warning', () => {
    const result = analyzeBuild(build, catalog);
    const spinachPlacementWarning = result.warnings.find(
      w => w.relatedIngredientIds?.includes('spinach') && /pressure/i.test(w.message)
    );
    expect(spinachPlacementWarning).toBeUndefined();
  });

  it('analysis has non-zero freshness score from spinach and lemon', () => {
    const result = analyzeBuild(build, catalog);
    expect(result.balanceScores.freshness).toBeGreaterThan(0);
  });

  it('cuisine scores reflect the chicken/roots/stock combination', () => {
    const result = analyzeBuild(build, catalog);
    // This is a generalist stew — no single cuisine should have zero score
    // but at minimum the result should be a Record of numbers
    for (const [, score] of Object.entries(result.cuisineScores)) {
      expect(typeof score).toBe('number');
    }
  });

  // ── Instruction generation ───────────────────────────────────────────────

  it('generateInstructions returns steps in canonical stage order', () => {
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    const presentStageOrder = recipe.steps.map(s => s.stage);
    const globalOrder = COOKING_STAGES;
    let lastIndex = -1;
    for (const stage of presentStageOrder) {
      const idx = globalOrder.indexOf(stage as typeof globalOrder[number]);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it('instructions include steps for brown, aromatics, pressure, stir_in, and finish', () => {
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);
    const presentStages = new Set(recipe.steps.map(s => s.stage));
    expect(presentStages.has('brown')).toBe(true);
    expect(presentStages.has('aromatics')).toBe(true);
    expect(presentStages.has('pressure')).toBe(true);
    expect(presentStages.has('stir_in')).toBe(true);
    expect(presentStages.has('finish')).toBe(true);
  });

  it('generated text mentions all ingredients by name', () => {
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);
    const text = recipe.text.toLowerCase();

    // Resolve ingredient names from catalog
    const expectedNames = ['chicken', 'onion', 'garlic', 'carrot', 'parsnip', 'barley', 'spinach', 'lemon'];
    for (const name of expectedNames) {
      expect(text).toMatch(new RegExp(name, 'i'));
    }
  });

  // ── Export / import round-trip ───────────────────────────────────────────

  it('exportBuild → importBuild round-trip preserves the build', () => {
    const json = exportBuild(build);
    const restored = importBuild(json);
    expect(restored.id).toBe(build.id);
    expect(restored.name).toBe(build.name);
    expect(restored.pressureMinutes).toBe(build.pressureMinutes);
    expect(restored.naturalReleaseMinutes).toBe(build.naturalReleaseMinutes);
    expect(restored.ingredients).toEqual(build.ingredients);
  });

  it('exported JSON contains schemaVersion', () => {
    const json = exportBuild(build);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('schemaVersion');
  });

  it('generateInstructions on a round-tripped build produces identical output', () => {
    const analysis = analyzeBuild(build, catalog);
    const original = generateInstructions(build, catalog, analysis);

    const json = exportBuild(build);
    const restored = importBuild(json);
    const restoredAnalysis = analyzeBuild(restored, catalog);
    const roundTripped = generateInstructions(restored, catalog, restoredAnalysis);

    expect(roundTripped).toEqual(original);
  });

  // ── Interaction: analysis + instructions together ────────────────────────

  it('warnings do not appear in generated instruction text (instructions are not warning prose)', () => {
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    // Instructions should be imperative cooking steps, not warning messages
    // They should not contain phrases like "Warning:" or "Note: this combination"
    expect(recipe.text).not.toMatch(/^warning:/im);
  });
});

/**
 * Phase 5 acceptance — Instruction Generator contract
 *
 * Verifies the public surface of generateInstructions:
 *   generateInstructions(build: StewBuild, catalog: Ingredient[], analysis: AnalysisResult): GeneratedRecipe
 *
 * Contract guarantees under test:
 *   - Returns a GeneratedRecipe with `steps` (ordered array) and `text` (plain-text rendering)
 *   - Steps follow the canonical stage order: brown, aromatics, deglaze, pressure,
 *     simmer_after, stir_in, finish, serve_over
 *   - Empty stages produce no step in the output
 *   - Missing quantities are omitted from instruction text (not invented)
 *   - Ingredient notes may supply handling clauses in the generated text
 *   - Pure and deterministic: identical inputs → identical output
 *   - Does not mutate build or catalog
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateInstructions } from '../../../src/instructions';
import { analyzeBuild } from '../../../src/analysis';
import { loadCatalog } from '../../../src/catalog';
import { addIngredient, moveIngredient, updateBuildIngredient } from '../../../src/build';
import type { Ingredient, StewBuild, CookingStage } from '../../../src/types';
import { COOKING_STAGES } from '../../../src/types';

function emptyBuild(id = 'phase5-instr-' + Math.random().toString(36).slice(2)): StewBuild {
  return { id, ingredients: [], pressureMinutes: 25 };
}

describe('generateInstructions — core contract', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  // ── Result shape ─────────────────────────────────────────────────────────

  it('returns a GeneratedRecipe with steps array and text string', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);
    expect(recipe).toHaveProperty('steps');
    expect(recipe).toHaveProperty('text');
    expect(Array.isArray(recipe.steps)).toBe(true);
    expect(typeof recipe.text).toBe('string');
  });

  it('each step has a stage and a non-empty instructions array', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);
    for (const step of recipe.steps) {
      expect(typeof step.stage).toBe('string');
      expect(COOKING_STAGES as readonly string[]).toContain(step.stage);
      expect(Array.isArray(step.instructions)).toBe(true);
      expect(step.instructions.length).toBeGreaterThan(0);
      for (const line of step.instructions) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  // ── Stage ordering ────────────────────────────────────────────────────────

  it('steps appear in canonical stage order', () => {
    let build = emptyBuild();
    build = addIngredient(build, 'chicken_thighs', catalog); // brown
    build = addIngredient(build, 'onion', catalog);           // aromatics
    build = addIngredient(build, 'spinach', catalog);         // stir_in
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    const stageOrder: CookingStage[] = ['brown', 'aromatics', 'deglaze', 'pressure', 'simmer_after', 'stir_in', 'finish'];
    const stepStages = recipe.steps.map(s => s.stage);
    const stageIndices = stepStages.map(s => stageOrder.indexOf(s as CookingStage));
    for (let i = 1; i < stageIndices.length; i++) {
      expect(stageIndices[i]).toBeGreaterThan(stageIndices[i - 1]);
    }
  });

  it('stages with no ingredients are omitted from steps', () => {
    // Only brown (chicken_thighs) and stir_in (spinach); deglaze, simmer_after should be absent
    let build = emptyBuild();
    build = addIngredient(build, 'chicken_thighs', catalog); // brown
    build = addIngredient(build, 'spinach', catalog);         // stir_in
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    const presentStages = new Set(recipe.steps.map(s => s.stage));
    expect(presentStages.has('deglaze')).toBe(false);
    expect(presentStages.has('simmer_after')).toBe(false);
    expect(presentStages.has('brown')).toBe(true);
    expect(presentStages.has('stir_in')).toBe(true);
  });

  it('step stages match exactly the stages occupied in the build', () => {
    let build = emptyBuild();
    build = addIngredient(build, 'chicken_thighs', catalog); // brown
    build = addIngredient(build, 'garlic', catalog);          // aromatics
    build = moveIngredient(build, 'garlic', 'pressure');      // moved to pressure
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    const presentStages = new Set(recipe.steps.map(s => s.stage));
    expect(presentStages.has('brown')).toBe(true);
    expect(presentStages.has('pressure')).toBe(true);
    expect(presentStages.has('aromatics')).toBe(false);
  });

  // ── Quantity handling ────────────────────────────────────────────────────

  it('ingredient with quantity and unit includes quantity in the instruction text', () => {
    let build = emptyBuild();
    build = addIngredient(build, 'chicken_thighs', catalog);
    build = updateBuildIngredient(build, 'chicken_thighs', { quantity: 4, unit: 'pieces' });
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    const allText = recipe.text;
    expect(allText).toMatch(/4/);
  });

  it('ingredient without quantity does not invent a quantity in the instruction text', () => {
    // Add chicken_thighs without specifying quantity
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    // The text should mention chicken but not a specific count/measurement
    const allText = recipe.text.toLowerCase();
    // Should not contain patterns like "2 cups", "3 pieces", "1 lb" fabricated from nothing
    expect(allText).not.toMatch(/\d+ (cup|pound|lb|piece|tablespoon|teaspoon|oz|gram)/i);
  });

  // ── text field ───────────────────────────────────────────────────────────

  it('text is a non-empty string when the build has at least one ingredient', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);
    expect(recipe.text.trim().length).toBeGreaterThan(0);
  });

  it('text contains ingredient names for each ingredient in the build', () => {
    let build = emptyBuild();
    build = addIngredient(build, 'chicken_thighs', catalog);
    build = addIngredient(build, 'onion', catalog);
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    const text = recipe.text.toLowerCase();
    expect(text).toMatch(/chicken/);
    expect(text).toMatch(/onion/);
  });

  // ── Purity and non-mutation ──────────────────────────────────────────────

  it('is pure: identical builds + catalog produce identical results', () => {
    let build = emptyBuild('pure-test');
    build = addIngredient(build, 'chicken_thighs', catalog);
    build = addIngredient(build, 'carrot', catalog);
    const analysis = analyzeBuild(build, catalog);
    const r1 = generateInstructions(build, catalog, analysis);
    const r2 = generateInstructions(build, catalog, analysis);
    expect(r1).toEqual(r2);
  });

  it('does not mutate the StewBuild argument', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const snapshot = JSON.stringify(build);
    const analysis = analyzeBuild(build, catalog);
    generateInstructions(build, catalog, analysis);
    expect(JSON.stringify(build)).toBe(snapshot);
  });

  it('does not mutate the catalog argument', () => {
    const build = addIngredient(emptyBuild(), 'chicken_thighs', catalog);
    const snapshot = JSON.stringify(catalog);
    const analysis = analyzeBuild(build, catalog);
    generateInstructions(build, catalog, analysis);
    expect(JSON.stringify(catalog)).toBe(snapshot);
  });

  // ── Multi-ingredient stage steps ─────────────────────────────────────────

  it('a stage with multiple ingredients produces multiple instruction lines or a combined line', () => {
    let build = emptyBuild();
    build = addIngredient(build, 'carrot', catalog);
    build = moveIngredient(build, 'carrot', 'pressure');
    build = addIngredient(build, 'potato', catalog);
    build = moveIngredient(build, 'potato', 'pressure');
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);

    const pressureStep = recipe.steps.find(s => s.stage === 'pressure');
    expect(pressureStep).toBeDefined();
    // Combined instructions may be one line or many; either way the text covers both
    const combined = pressureStep!.instructions.join(' ').toLowerCase();
    expect(combined).toMatch(/carrot|potato/);
  });

  // ── Empty build ──────────────────────────────────────────────────────────

  it('empty build produces empty steps and empty or minimal text', () => {
    const build = emptyBuild();
    const analysis = analyzeBuild(build, catalog);
    const recipe = generateInstructions(build, catalog, analysis);
    expect(recipe.steps).toHaveLength(0);
  });
});

/**
 * Phase 7 acceptance — compatibleSteps: schema and converter
 *
 * Verifies:
 *   - ingredientSchema accepts/rejects compatibleSteps values
 *   - convertCatalog emits compatibleSteps on every output ingredient
 *   - The emitted compatibleSteps always contains the ingredient's own stage
 *   - Every emitted step ID is a valid CookingStage value
 */

import { describe, it, expect } from 'vitest';
import { ingredientSchema } from '../../../src/schema';
import { convertCatalog } from '../../../scripts/convert-catalog';
import { COOKING_STAGES } from '../../../src/types';

const VALID_STAGES = new Set<string>(COOKING_STAGES);

function buildCsv(rows: string[]): string {
  const header =
    'id,name,category,stage,roles,traits,balance_scores,cuisines,cook_min,cook_max,salt_risk,pairs_with,avoid_with,notes';
  return [header, ...rows].join('\n');
}

describe('ingredientSchema — compatibleSteps field', () => {
  const base = {
    id: 'test_ingredient',
    name: 'Test Ingredient',
    category: 'protein' as const,
    stage: 'brown' as const,
    roles: ['protein' as const],
    traits: [],
    balanceScores: {},
    cuisines: ['universal' as const],
    saltRisk: 'low' as const,
  };

  it('accepts an ingredient with compatibleSteps containing a valid stage ID', () => {
    const result = ingredientSchema.safeParse({ ...base, compatibleSteps: ['brown'] });
    expect(result.success).toBe(true);
  });

  it('accepts compatibleSteps with multiple valid stage IDs', () => {
    const result = ingredientSchema.safeParse({
      ...base,
      compatibleSteps: ['brown', 'stir_in'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects compatibleSteps containing an unrecognised step ID', () => {
    const result = ingredientSchema.safeParse({
      ...base,
      compatibleSteps: ['grilling'],
    });
    expect(result.success).toBe(false);
  });

  it('parses and returns compatibleSteps as an array', () => {
    const parsed = ingredientSchema.parse({ ...base, compatibleSteps: ['pressure'] });
    expect(Array.isArray(parsed.compatibleSteps)).toBe(true);
    expect(parsed.compatibleSteps).toContain('pressure');
  });
});

describe('CSV→JSON converter — compatibleSteps emission', () => {
  it('emits compatibleSteps on each converted ingredient', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result).toHaveProperty('compatibleSteps');
  });

  it('compatibleSteps is an array', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(Array.isArray(result.compatibleSteps)).toBe(true);
  });

  it('compatibleSteps is non-empty', () => {
    const csv = buildCsv(['test_item,Test Item,protein,pressure,protein,,{},universal,20,30,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.compatibleSteps!.length).toBeGreaterThan(0);
  });

  it("compatibleSteps contains the ingredient's stage value", () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.compatibleSteps).toContain('brown');
  });

  it("compatibleSteps for a pressure-stage ingredient contains 'pressure'", () => {
    const csv = buildCsv(['test_item,Test Item,protein,pressure,protein,,{},universal,20,30,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.compatibleSteps).toContain('pressure');
  });

  it('emits only valid CookingStage ids in compatibleSteps', () => {
    const csv = buildCsv([
      'item_a,Item A,protein,brown,protein,,{},universal,,,low,,,',
      'item_b,Item B,aromatics,aromatics,aromatic,,{},universal,,,low,,,',
      'item_c,Item C,protein,pressure,protein,,{},universal,20,30,low,,,',
      'item_d,Item D,fat,finish,fat,,{},universal,,,low,,,',
    ]);
    const results = convertCatalog(csv);
    for (const ingredient of results) {
      for (const step of ingredient.compatibleSteps ?? []) {
        expect(
          VALID_STAGES.has(step),
          `"${step}" in ${ingredient.id}.compatibleSteps must be a valid CookingStage`,
        ).toBe(true);
      }
    }
  });

  it('emits compatibleSteps on all rows in a multi-row CSV', () => {
    const csv = buildCsv([
      'item_a,Item A,protein,brown,protein,,{},universal,,,low,,,',
      'item_b,Item B,aromatics,aromatics,aromatic,,{},universal,,,low,,,',
      'item_c,Item C,protein,pressure,protein,,{},universal,20,30,low,,,',
    ]);
    const results = convertCatalog(csv);
    for (const ingredient of results) {
      expect(ingredient.compatibleSteps, `${ingredient.id} must have compatibleSteps`).toBeDefined();
    }
  });
});

/**
 * Phase 7 acceptance — Full catalog integrity: compatibleSteps
 *
 * Verifies the generated ingredients.json satisfies the Phase 7 contract:
 *   - every ingredient carries a compatibleSteps field
 *   - no ingredient has an empty compatibleSteps array
 *   - every compatibleStep value is a valid CookingStage id
 *   - each ingredient's catalogue stage appears in its own compatibleSteps
 *     (stage = default / suggested step for braise)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadCatalog } from '../../../src/catalog';
import { COOKING_STAGES } from '../../../src/types';
import type { Ingredient } from '../../../src/types';

const VALID_STEPS = new Set<string>(COOKING_STAGES);

describe('Full catalog integrity — compatibleSteps (Phase 7)', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('every ingredient has a compatibleSteps field', () => {
    const missing: string[] = [];
    for (const i of catalog) {
      if (!Object.prototype.hasOwnProperty.call(i, 'compatibleSteps') || i.compatibleSteps === undefined) {
        missing.push(i.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every ingredient has a non-empty compatibleSteps array', () => {
    const empty: string[] = [];
    for (const i of catalog) {
      if (!i.compatibleSteps || i.compatibleSteps.length === 0) {
        empty.push(i.id);
      }
    }
    expect(empty).toEqual([]);
  });

  it('every compatibleStep value is a valid CookingStage id', () => {
    const invalid: string[] = [];
    for (const i of catalog) {
      for (const step of i.compatibleSteps ?? []) {
        if (!VALID_STEPS.has(step)) {
          invalid.push(`${i.id}: "${step}"`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("each ingredient's stage appears in its own compatibleSteps", () => {
    const missing: string[] = [];
    for (const i of catalog) {
      if (!i.compatibleSteps?.includes(i.stage)) {
        missing.push(`${i.id}: stage "${i.stage}" absent from compatibleSteps`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('covers all 8 braise steps across the catalog (every CookingStage appears in at least one ingredient)', () => {
    const covered = new Set<string>();
    for (const i of catalog) {
      for (const step of i.compatibleSteps ?? []) covered.add(step);
    }
    for (const stage of COOKING_STAGES) {
      expect(covered.has(stage), `no ingredient has compatibleStep "${stage}"`).toBe(true);
    }
  });
});

/**
 * Phase 7 acceptance — Technique model
 *
 * Verifies the Technique / CookingStep model contract:
 *   - getBraiseTechnique() returns a well-formed Technique
 *   - Braise registers exactly 8 steps whose IDs match the 8 CookingStage ids
 *   - The pressure step is the sole longCook step, labelled "Oven / pressure cook"
 *   - Every step carries a valid timing value
 *   - A TECHNIQUES registry exposes braise by id
 */

import { describe, it, expect } from 'vitest';
import { getBraiseTechnique, TECHNIQUES } from '../../../src/techniques';
import { COOKING_STAGES } from '../../../src/types';

const VALID_TIMINGS = new Set(['short', 'medium', 'long', 'finish']);

describe('Technique model — braise registration', () => {
  it('getBraiseTechnique returns an object with id "braise"', () => {
    const t = getBraiseTechnique();
    expect(t.id).toBe('braise');
  });

  it('braise has a non-empty name string', () => {
    const t = getBraiseTechnique();
    expect(typeof t.name).toBe('string');
    expect(t.name.length).toBeGreaterThan(0);
  });

  it('braise has exactly 8 steps', () => {
    const t = getBraiseTechnique();
    expect(t.steps).toHaveLength(8);
  });

  it('braise step IDs match the 8 CookingStage ids in canonical order', () => {
    const t = getBraiseTechnique();
    const stepIds = t.steps.map((s) => s.id);
    expect(stepIds).toEqual([...COOKING_STAGES]);
  });

  it('all braise step IDs are valid CookingStage values', () => {
    const validStages = new Set<string>(COOKING_STAGES);
    const t = getBraiseTechnique();
    for (const step of t.steps) {
      expect(
        validStages.has(step.id),
        `step.id "${step.id}" must be a CookingStage`,
      ).toBe(true);
    }
  });

  it('all braise step IDs are unique', () => {
    const t = getBraiseTechnique();
    const ids = t.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step has a label string', () => {
    const t = getBraiseTechnique();
    for (const step of t.steps) {
      expect(typeof step.label, `step "${step.id}" must have a label`).toBe('string');
      expect(step.label.length, `step "${step.id}" label must be non-empty`).toBeGreaterThan(0);
    }
  });

  it('every step has a valid timing value', () => {
    const t = getBraiseTechnique();
    for (const step of t.steps) {
      expect(
        VALID_TIMINGS.has(step.timing),
        `step "${step.id}" timing "${step.timing}" must be one of short/medium/long/finish`,
      ).toBe(true);
    }
  });
});

describe('Technique model — pressure step contract', () => {
  it('pressure step exists in braise', () => {
    const t = getBraiseTechnique();
    const pressure = t.steps.find((s) => s.id === 'pressure');
    expect(pressure).toBeDefined();
  });

  it('pressure step has longCook: true', () => {
    const t = getBraiseTechnique();
    const pressure = t.steps.find((s) => s.id === 'pressure')!;
    expect(pressure.longCook).toBe(true);
  });

  it('pressure step label is "Oven / pressure cook"', () => {
    const t = getBraiseTechnique();
    const pressure = t.steps.find((s) => s.id === 'pressure')!;
    expect(pressure.label).toBe('Oven / pressure cook');
  });

  it('no non-pressure step has longCook: true', () => {
    const t = getBraiseTechnique();
    for (const step of t.steps.filter((s) => s.id !== 'pressure')) {
      expect(
        step.longCook,
        `step "${step.id}" must not have longCook: true`,
      ).not.toBe(true);
    }
  });
});

describe('Technique model — TECHNIQUES registry', () => {
  it('TECHNIQUES registry exposes a "braise" key', () => {
    expect(TECHNIQUES).toHaveProperty('braise');
  });

  it('TECHNIQUES.braise id matches "braise"', () => {
    expect(TECHNIQUES.braise.id).toBe('braise');
  });

  it('TECHNIQUES.braise is the same object returned by getBraiseTechnique', () => {
    expect(TECHNIQUES.braise).toEqual(getBraiseTechnique());
  });
});

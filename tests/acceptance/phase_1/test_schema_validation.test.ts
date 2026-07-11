import { describe, it, expect } from 'vitest';
import { ingredientSchema } from '../../../src/schema';

const MINIMAL_VALID = {
  id: 'test_ingredient',
  name: 'Test Ingredient',
  category: 'protein',
  stage: 'brown',
  roles: ['protein'],
  traits: [],
  balanceScores: {},
  cuisines: ['universal'],
  saltRisk: 'low',
};

describe('Ingredient schema — valid shapes', () => {
  it('accepts a minimal ingredient (no optional fields)', () => {
    expect(() => ingredientSchema.parse(MINIMAL_VALID)).not.toThrow();
  });

  it('accepts a fully-specified ingredient with all optional fields', () => {
    const full = {
      ...MINIMAL_VALID,
      traits: ['savory', 'earthy'],
      balanceScores: { body: 3, richness: 2, umami: 1 },
      cuisineWeights: { universal: 2, french: 1 },
      cookMinutes: { min: 15, max: 30 },
      pairsWith: ['roots', 'pearl_barley'],
      avoidWith: ['miso'],
      notes: 'Test note.',
    };
    expect(() => ingredientSchema.parse(full)).not.toThrow();
  });

  it('accepts an ingredient whose balanceScores covers all 10 axes', () => {
    const allAxes = {
      ...MINIMAL_VALID,
      balanceScores: {
        body: 1, richness: 2, umami: 3, sweetness: 1, acidity: 1,
        heat: 1, smoke: 0, freshness: 2, texture: 1, aromatic_intensity: 2,
      },
    };
    expect(() => ingredientSchema.parse(allAxes)).not.toThrow();
  });

  it('accepts an ingredient with multiple roles, traits, and cuisines', () => {
    const multi = {
      ...MINIMAL_VALID,
      roles: ['protein', 'fat', 'body'],
      traits: ['savory', 'gamey'],
      cuisines: ['french', 'italian', 'mediterranean'],
    };
    expect(() => ingredientSchema.parse(multi)).not.toThrow();
  });

  it('accepts an ingredient whose cookMinutes is absent (optional)', () => {
    const noCook = { ...MINIMAL_VALID };
    expect((noCook as Record<string, unknown>).cookMinutes).toBeUndefined();
    expect(() => ingredientSchema.parse(noCook)).not.toThrow();
  });

  it('accepts an ingredient with empty pairsWith and avoidWith', () => {
    const noPairs = { ...MINIMAL_VALID, pairsWith: [], avoidWith: [] };
    expect(() => ingredientSchema.parse(noPairs)).not.toThrow();
  });
});

describe('Ingredient schema — controlled vocabulary rejections', () => {
  it('rejects an unknown role value', () => {
    const bad = { ...MINIMAL_VALID, roles: ['protein', 'magical'] };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown balance axis key', () => {
    const bad = { ...MINIMAL_VALID, balanceScores: { spiciness: 3 } };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown cuisine tag', () => {
    const bad = { ...MINIMAL_VALID, cuisines: ['universal', 'atlantean'] };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown cooking stage', () => {
    const bad = { ...MINIMAL_VALID, stage: 'microwave' };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown ingredient category', () => {
    const bad = { ...MINIMAL_VALID, category: 'condiment' };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown salt risk value', () => {
    const bad = { ...MINIMAL_VALID, saltRisk: 'extreme' };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown trait value', () => {
    const bad = { ...MINIMAL_VALID, traits: ['savory', 'umami_bomb'] };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });
});

describe('Ingredient schema — structural rejections', () => {
  it('rejects a missing id field', () => {
    const { id: _id, ...noId } = MINIMAL_VALID;
    expect(() => ingredientSchema.parse(noId)).toThrow();
  });

  it('rejects a missing name field', () => {
    const { name: _name, ...noName } = MINIMAL_VALID;
    expect(() => ingredientSchema.parse(noName)).toThrow();
  });

  it('rejects a non-numeric balance score value', () => {
    const bad = { ...MINIMAL_VALID, balanceScores: { body: 'heavy' } };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects cookMinutes with non-numeric min', () => {
    const bad = { ...MINIMAL_VALID, cookMinutes: { min: 'long', max: 30 } };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects roles that is not an array', () => {
    const bad = { ...MINIMAL_VALID, roles: 'protein' };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });

  it('rejects cuisines that is not an array', () => {
    const bad = { ...MINIMAL_VALID, cuisines: 'universal' };
    expect(() => ingredientSchema.parse(bad)).toThrow();
  });
});

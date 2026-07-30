import { describe, expect, it } from 'vitest';
import { analyzeBuild } from '../../src/analysis';
import type { Ingredient, StewBuild } from '../../src/types';

function ingredient(
  id: string,
  cuisines: Ingredient['cuisines'],
  cuisineWeights?: Ingredient['cuisineWeights'],
): Ingredient {
  return {
    id,
    name: id,
    category: 'protein',
    stage: 'brown',
    compatibleSteps: ['brown'],
    roles: [],
    traits: [],
    balanceScores: {},
    cuisines,
    saltRisk: 'low',
    cuisineWeights,
  };
}

function build(...ingredientIds: string[]): StewBuild {
  return {
    id: 'analysis-cuisine-test',
    ingredients: ingredientIds.map(ingredientId => ({
      ingredientId,
      stage: 'brown',
    })),
  };
}

describe('analyzeBuild cuisine affinity', () => {
  it('applies cuisineWeights to listed non-universal cuisines and ignores universal', () => {
    const catalog = [
      ingredient('weighted_herb', ['universal', 'french'], { universal: 5, french: 2 }),
      ingredient('plain_spice', ['french', 'italian']),
    ];

    const result = analyzeBuild(build('weighted_herb', 'plain_spice'), catalog);

    expect(result.cuisineScores.universal).toBe(0);
    expect(result.cuisineScores.french).toBe(3);
    expect(result.cuisineScores.italian).toBe(1);
  });
});

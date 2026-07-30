import { describe, expect, it } from 'vitest';
import { analyzeBuild } from '../../src/analysis';
import type { Ingredient, StewBuild } from '../../src/types';

function ingredient(
  id: string,
  pairsWith?: Ingredient['pairsWith'],
  avoidWith?: Ingredient['avoidWith'],
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
    cuisines: ['universal'],
    saltRisk: 'low',
    pairsWith,
    avoidWith,
  };
}

function build(...ingredientIds: string[]): StewBuild {
  return {
    id: 'analysis-pairings-test',
    ingredients: ingredientIds.map(ingredientId => ({
      ingredientId,
      stage: 'brown',
    })),
  };
}

describe('analyzeBuild pairing and avoidance signals', () => {
  it('uses a canonical ingredient order for pairing warnings', () => {
    const catalog = [
      ingredient('spinach', ['chicken_thighs']),
      ingredient('chicken_thighs', ['spinach']),
    ];

    const forward = analyzeBuild(build('chicken_thighs', 'spinach'), catalog);
    const reverse = analyzeBuild(build('spinach', 'chicken_thighs'), catalog);
    const forwardPairWarnings = forward.warnings.filter(w => w.id.startsWith('pair:'));
    const reversePairWarnings = reverse.warnings.filter(w => w.id.startsWith('pair:'));

    expect(forwardPairWarnings).toEqual(reversePairWarnings);
    expect(forwardPairWarnings).toHaveLength(1);
    expect(forwardPairWarnings[0].message).toBe('Chicken Thighs pairs well with Spinach.');
    expect(forwardPairWarnings[0].relatedIngredientIds).toEqual(['chicken_thighs', 'spinach']);
  });

  it('uses a canonical ingredient order for avoidance warnings', () => {
    const catalog = [
      ingredient('ham_hock', undefined, ['smoked_sausage']),
      ingredient('smoked_sausage', undefined, ['ham_hock']),
    ];

    const forward = analyzeBuild(build('ham_hock', 'smoked_sausage'), catalog);
    const reverse = analyzeBuild(build('smoked_sausage', 'ham_hock'), catalog);
    const forwardAvoidWarnings = forward.warnings.filter(w => w.id.startsWith('avoid:'));
    const reverseAvoidWarnings = reverse.warnings.filter(w => w.id.startsWith('avoid:'));

    expect(forwardAvoidWarnings).toEqual(reverseAvoidWarnings);
    expect(forwardAvoidWarnings).toHaveLength(1);
    expect(forwardAvoidWarnings[0].message).toBe('Ham Hock clashes with Smoked Sausage.');
    expect(forwardAvoidWarnings[0].relatedIngredientIds).toEqual(['ham_hock', 'smoked_sausage']);
  });
});

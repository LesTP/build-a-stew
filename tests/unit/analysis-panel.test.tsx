import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalysisPanel } from '../../src/components/AnalysisPanel';
import { BALANCE_AXES, CUISINE_TAGS } from '../../src/types';
import type { AnalysisResult, StewBuild, BalanceAxis, CuisineTag } from '../../src/types';

function createBalanceScores(): Record<BalanceAxis, number> {
  return Object.fromEntries(BALANCE_AXES.map(axis => [axis, axis === 'body' ? 6 : axis === 'freshness' ? 3 : 0])) as Record<BalanceAxis, number>;
}

function createCuisineScores(): Record<CuisineTag, number> {
  return Object.fromEntries(CUISINE_TAGS.map(tag => [tag, 0])) as Record<CuisineTag, number>;
}

function createAnalysis(): AnalysisResult {
  const cuisineScores = createCuisineScores();
  cuisineScores.french = 4;
  cuisineScores.italian = 2;

  return {
    balanceScores: createBalanceScores(),
    cuisineScores,
    warnings: [
      {
        id: 'composition:greens:missing',
        severity: 'info',
        message: 'This build has low freshness and no greens. Add a leafy green for lift.',
      },
    ],
    suggestions: [
      {
        ingredientId: 'spinach',
        message: 'Add a leafy green for freshness.',
      },
    ],
    timingFindings: [
      {
        ingredientId: 'spinach',
        message: 'Spinach is overcooked at 25 min pressure; it usually needs 1-3 min.',
      },
    ],
  };
}

function createBuild(): StewBuild {
  return {
    id: 'analysis-panel-test',
    ingredients: [
      { ingredientId: 'beef_chuck', stage: 'brown' },
      { ingredientId: 'spinach', stage: 'pressure' },
    ],
  };
}

describe('AnalysisPanel', () => {
  it('renders the computed analysis sections and messages', () => {
    const markup = renderToStaticMarkup(
      <AnalysisPanel build={createBuild()} analysis={createAnalysis()} />,
    );

    expect(markup).toContain('Analysis');
    expect(markup).toContain('2 ingredients in the build.');
    expect(markup).toContain('Cuisine affinity is led by french.');
    expect(markup).toContain('Balance scores');
    expect(markup).toContain('Richness');
    expect(markup).toContain('Freshness');
    expect(markup).toContain('Cuisine affinity');
    expect(markup).toContain('Warnings');
    expect(markup).toContain('Add a leafy green for lift.');
    expect(markup).toContain('Suggestions');
    expect(markup).toContain('Timing findings');
    expect(markup).toContain('Spinach is overcooked at 25 min pressure; it usually needs 1-3 min.');
  });
});

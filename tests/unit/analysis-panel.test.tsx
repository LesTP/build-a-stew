import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalysisPanel } from '../../src/components/AnalysisPanel';
import { BALANCE_AXES, CUISINE_TAGS } from '../../src/types';
import type { AnalysisResult, BalanceAxis, CuisineTag } from '../../src/types';

function createBalanceScores(): Record<BalanceAxis, number> {
  return Object.fromEntries(
    BALANCE_AXES.map(axis => [axis, axis === 'body' ? 6 : axis === 'freshness' ? 3 : 0]),
  ) as Record<BalanceAxis, number>;
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
        message: 'This build has low freshness and no greens. Add a leafy green like spinach for lift.',
      },
    ],
    suggestions: [],
    timingFindings: [
      {
        ingredientId: 'spinach',
        message: 'Spinach is overcooked at 25 min pressure; it usually needs 1-3 min.',
      },
    ],
  };
}

describe('AnalysisPanel', () => {
  it('renders Balance, Cuisine, and Advisories cards with computed content', () => {
    const markup = renderToStaticMarkup(<AnalysisPanel analysis={createAnalysis()} />);

    // Three separate card headings
    expect(markup).toContain('Balance');
    expect(markup).toContain('Cuisine');
    expect(markup).toContain('Advisories');
    // Balance axis labels
    expect(markup).toContain('Richness');
    expect(markup).toContain('Freshness');
    // Cuisine ranking
    expect(markup).toContain('french');
    // Merged advisory content + per-card severity badge
    expect(markup).toContain('Add a leafy green like spinach for lift.');
    expect(markup).toContain('info');
    expect(markup).toContain('timing');
    expect(markup).toContain('Spinach is overcooked at 25 min pressure; it usually needs 1-3 min.');
  });

  it('drops the old per-type section headers and intro copy', () => {
    const markup = renderToStaticMarkup(<AnalysisPanel analysis={createAnalysis()} />);

    expect(markup).not.toContain('ingredients in the build');
    expect(markup).not.toContain('Warnings');
    expect(markup).not.toContain('Suggestions');
    expect(markup).not.toContain('Timing findings');
  });
});

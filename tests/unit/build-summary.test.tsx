import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, beforeAll } from 'vitest';
import { addIngredient } from '../../src/build';
import { loadCatalog } from '../../src/catalog';
import { BuildSummary } from '../../src/components/BuildSummary';
import { createEmptyBuild } from '../../src/store';
import type { Ingredient, StewBuild } from '../../src/types';

function createDemoBuild(catalog: readonly Ingredient[]): StewBuild {
  const seedIds = ['chicken_thighs', 'onion', 'white_wine', 'carrot'] as const;
  return seedIds.reduce(
    (build, ingredientId) => addIngredient(build, ingredientId, catalog),
    createEmptyBuild('summary-demo'),
  );
}

describe('BuildSummary', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('renders stage groups in canonical order with ingredient names', () => {
    const build = createDemoBuild(catalog);
    const markup = renderToStaticMarkup(<BuildSummary build={build} catalog={catalog} />);

    expect(markup).toContain('Brown');
    expect(markup).toContain('Aromatics');
    expect(markup).toContain('Deglaze');
    expect(markup).toContain('Pressure');
    expect(markup).toContain('Chicken thighs');
    expect(markup).toContain('Onion');
    expect(markup).toContain('White wine');
    expect(markup).toContain('Carrot');

    const brownIndex = markup.indexOf('Brown');
    const aromaticsIndex = markup.indexOf('Aromatics');
    const deglazeIndex = markup.indexOf('Deglaze');
    const pressureIndex = markup.indexOf('Pressure');

    expect(brownIndex).toBeGreaterThanOrEqual(0);
    expect(aromaticsIndex).toBeGreaterThan(brownIndex);
    expect(deglazeIndex).toBeGreaterThan(aromaticsIndex);
    expect(pressureIndex).toBeGreaterThan(deglazeIndex);
  });

  it('omits empty stages and shows an empty state for an empty build', () => {
    const markup = renderToStaticMarkup(
      <BuildSummary build={createEmptyBuild('empty-summary')} catalog={catalog} />,
    );

    expect(markup).toContain('Nothing is in the pot yet.');
    expect(markup).not.toContain('Brown');
    expect(markup).not.toContain('Aromatics');
  });
});

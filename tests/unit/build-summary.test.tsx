// @vitest-environment jsdom

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

    const brownIndex = markup.indexOf('data-stage="brown"');
    const aromaticsIndex = markup.indexOf('data-stage="aromatics"');
    const deglazeIndex = markup.indexOf('data-stage="deglaze"');
    const pressureIndex = markup.indexOf('data-stage="pressure"');

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

  it('renders single-row entries: name, cook time, and a compact remove control', () => {
    const build = createDemoBuild(catalog);
    const markup = renderToStaticMarkup(
      <BuildSummary build={build} catalog={catalog} onRemoveIngredient={() => {}} />,
    );

    // Compact "×" remove button carries an accessible label naming the ingredient
    expect(markup).toContain('aria-label="Remove Chicken thighs"');
    // Cook time is shown inline (single-row layout)
    expect(markup).toContain('ingredient-cook-time');
    // The old two-row layout artifacts are gone: no big "Remove" text label,
    // and no Cook-timing metadata inputs.
    expect(markup).not.toContain('>Remove<');
    expect(markup).not.toContain('Cook minutes');
    expect(markup).not.toContain('Natural release minutes');
  });
});

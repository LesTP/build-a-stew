// @vitest-environment jsdom

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeAll } from 'vitest';
import { addIngredient } from '../../src/build';
import { loadCatalog } from '../../src/catalog';
import { BuildSummary } from '../../src/components/BuildSummary';
import { BuildStoreProvider, createEmptyBuild, useBuildStore } from '../../src/store';
import type { Ingredient, StewBuild } from '../../src/types';

function createDemoBuild(catalog: readonly Ingredient[]): StewBuild {
  const seedIds = ['chicken_thighs', 'onion', 'white_wine', 'carrot'] as const;
  return seedIds.reduce(
    (build, ingredientId) => addIngredient(build, ingredientId, catalog),
    createEmptyBuild('summary-demo'),
  );
}

function createTimedBuild(catalog: readonly Ingredient[]): StewBuild {
  return {
    ...createDemoBuild(catalog),
    id: 'summary-timed',
    pressureMinutes: 25,
    naturalReleaseMinutes: 10,
  };
}

function SummaryWithStore() {
  const { build, catalog, updateBuild } = useBuildStore();

  return <BuildSummary build={build} catalog={catalog} onUpdateBuild={updateBuild} />;
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

  it('renders pressure timing inputs and persists edits through the store', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <BuildStoreProvider catalog={catalog} initialBuild={createTimedBuild(catalog)}>
        <SummaryWithStore />
      </BuildStoreProvider>,
    );

    const pressureInput = screen.getByRole('spinbutton', { name: /cook minutes/i }) as HTMLInputElement;
    const releaseInput = screen.getByRole('spinbutton', { name: /natural release minutes/i }) as HTMLInputElement;

    expect(pressureInput.value).toBe('25');
    expect(releaseInput.value).toBe('10');

    await user.clear(pressureInput);
    await user.type(pressureInput, '30');
    await user.clear(releaseInput);
    await user.type(releaseInput, '8');

    expect(pressureInput.value).toBe('30');
    expect(releaseInput.value).toBe('8');

    rerender(
      <BuildStoreProvider catalog={catalog} initialBuild={createTimedBuild(catalog)}>
        <SummaryWithStore />
      </BuildStoreProvider>,
    );

    expect((screen.getByRole('spinbutton', { name: /cook minutes/i }) as HTMLInputElement).value).toBe('30');
    expect((screen.getByRole('spinbutton', { name: /natural release minutes/i }) as HTMLInputElement).value).toBe('8');
  });

  it('renders a generated instructions panel for the current build', () => {
    const markup = renderToStaticMarkup(<BuildSummary build={createDemoBuild(catalog)} catalog={catalog} />);

    expect(markup).toContain('Generated output');
    expect(markup).toContain('Instructions');
    expect(markup).toContain('Brown');
    expect(markup).toContain('Aromatics');
    expect(markup).toContain('Deglaze');
    expect(markup).toContain('Pressure');
    expect(markup).toContain('Chicken thighs');
    expect(markup).toContain('Onion');
    expect(markup).toContain('White wine');
    expect(markup).toContain('Carrot');
  });

  it('shows an empty instructions message when the build has no ingredients', () => {
    const markup = renderToStaticMarkup(
      <BuildSummary build={createEmptyBuild('empty-summary')} catalog={catalog} showEmptyStages />,
    );

    expect(markup).toContain('No instructions yet.');
    expect(markup).toContain('Once the build has ingredients, each stage becomes a generated step list here.');
  });
});

import { describe, expect, it, beforeAll } from 'vitest';
import { addIngredient } from '../../src/build';
import { analyzeBuild } from '../../src/analysis';
import { loadCatalog } from '../../src/catalog';
import { createEmptyBuild } from '../../src/store';
import type { Ingredient } from '../../src/types';

/**
 * FU-1 analysis fold (Option A): the freshness advisories now name the suggested
 * ingredient *inside* the warning, and the two standalone suggestions were removed.
 */
describe('analysis advisory fold (Option A)', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('names the acid ingredient inside the richness warning and emits no standalone suggestion', () => {
    // beef_chuck + potato + parsnip => high richness, low freshness/acidity
    let build = createEmptyBuild('fold-rich');
    build = addIngredient(build, 'beef_chuck', catalog);
    build = addIngredient(build, 'potato', catalog);
    build = addIngredient(build, 'parsnip', catalog);

    const result = analyzeBuild(build, catalog);

    const richWarning = result.warnings.find(w => w.message.toLowerCase().includes('lemon juice'));
    expect(richWarning).toBeDefined();
    expect(richWarning?.severity).toBe('info');
  });

  it('names spinach inside the missing-greens warning', () => {
    // beef_chuck + potato + onion => no greens, low freshness
    let build = createEmptyBuild('fold-greens');
    build = addIngredient(build, 'beef_chuck', catalog);
    build = addIngredient(build, 'potato', catalog);
    build = addIngredient(build, 'onion', catalog);

    const result = analyzeBuild(build, catalog);

    const greensWarning = result.warnings.find(w => w.message.toLowerCase().includes('spinach'));
    expect(greensWarning).toBeDefined();
  });
});

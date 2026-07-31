import { describe, it, expect } from 'vitest';
import {
  COOKING_STAGES,
  INGREDIENT_CATEGORIES,
  ROLES,
  BALANCE_AXES,
  TRAITS,
  CUISINE_TAGS,
  SALT_RISKS,
  GROUP_TAGS,
  GROUP_DEFINITIONS,
} from '../../../src/types';

describe('Controlled vocabularies — completeness', () => {
  it('exports all 8 cooking stages', () => {
    expect(COOKING_STAGES).toHaveLength(8);
    const required = ['brown', 'aromatics', 'deglaze', 'pressure', 'simmer_after', 'stir_in', 'finish', 'serve_over'];
    for (const s of required) expect(COOKING_STAGES).toContain(s);
  });

  it('exports all 11 ingredient categories', () => {
    expect(INGREDIENT_CATEGORIES).toHaveLength(11);
    const required = ['protein', 'aromatics', 'liquid', 'roots', 'vegetable', 'legumes', 'grains', 'greens', 'fat', 'topping', 'spice'];
    for (const c of required) expect(INGREDIENT_CATEGORIES).toContain(c);
  });

  it('exports all 13 roles', () => {
    expect(ROLES).toHaveLength(13);
    const required = ['protein', 'collagen', 'fat', 'starch', 'thickener', 'body', 'texture', 'aromatic', 'liquid', 'acid', 'seasoning', 'freshener', 'topping'];
    for (const r of required) expect(ROLES).toContain(r);
  });

  it('exports all 10 balance axes', () => {
    expect(BALANCE_AXES).toHaveLength(10);
    const required = ['body', 'richness', 'umami', 'sweetness', 'acidity', 'heat', 'smoke', 'freshness', 'texture', 'aromatic_intensity'];
    for (const a of required) expect(BALANCE_AXES).toContain(a);
  });

  it('exports all 18 traits', () => {
    expect(TRAITS).toHaveLength(18);
    const required = ['anise', 'bitter', 'citrusy', 'creamy', 'earthy', 'fermented', 'floral', 'fruity', 'gamey', 'garlicky', 'herbaceous', 'malty', 'nutty', 'peppery', 'pungent', 'resinous', 'savory', 'tangy'];
    for (const t of required) expect(TRAITS).toContain(t);
  });

  it('exports all 9 cuisine tags', () => {
    expect(CUISINE_TAGS).toHaveLength(9);
    const required = [
      'universal', 'french', 'italian', 'european', 'american',
      'latin_american', 'middle_eastern_african', 'south_asian', 'east_asian',
    ];
    for (const c of required) expect(CUISINE_TAGS).toContain(c);
  });

  it('exports all 3 salt risk values', () => {
    expect(SALT_RISKS).toHaveLength(3);
    expect(SALT_RISKS).toContain('low');
    expect(SALT_RISKS).toContain('medium');
    expect(SALT_RISKS).toContain('high');
  });

  it('exports all 13 group tags', () => {
    expect(GROUP_TAGS).toHaveLength(13);
    const required = ['meat', 'roots', 'vegetables', 'greens', 'grains', 'spices', 'herbs', 'wine', 'vinegar', 'beans', 'black_beans', 'white_beans', 'lentils'];
    for (const g of required) expect(GROUP_TAGS).toContain(g);
  });
});

describe('Controlled vocabularies — structural invariants', () => {
  it('every group tag has a non-empty definition', () => {
    for (const tag of GROUP_TAGS) {
      const def = GROUP_DEFINITIONS[tag as keyof typeof GROUP_DEFINITIONS];
      expect(def, `GROUP_DEFINITIONS["${tag}"] must exist`).toBeDefined();
      const hasCategory = 'category' in def;
      const hasIds = 'ids' in def && Array.isArray((def as { ids: unknown[] }).ids) && (def as { ids: unknown[] }).ids.length > 0;
      expect(hasCategory || hasIds, `GROUP_DEFINITIONS["${tag}"] must have category or non-empty ids`).toBe(true);
    }
  });

  it('vocabulary arrays contain only unique values', () => {
    const arrays = [COOKING_STAGES, INGREDIENT_CATEGORIES, ROLES, BALANCE_AXES, TRAITS, CUISINE_TAGS, SALT_RISKS, GROUP_TAGS];
    for (const arr of arrays) {
      expect(new Set(arr).size, `vocabulary array has duplicates: ${arr}`).toBe(arr.length);
    }
  });
});

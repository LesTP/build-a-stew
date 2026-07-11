/**
 * Phase 2 acceptance — Catalog integrity
 *
 * Verifies the full ingredients.json (generated from the complete CSV) satisfies
 * load-time integrity guarantees:
 *   - count ≥ 100 (spec: 119)
 *   - no duplicate IDs
 *   - group tags and ingredient IDs are disjoint (namespace invariant)
 *   - every pairsWith / avoidWith entry resolves to a known ID or group tag
 *   - every category-based group has ≥1 member in the full catalog
 *   - every ID-based group's declared members exist in the catalog
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadCatalog } from '../../../src/catalog';
import { GROUP_DEFINITIONS, GROUP_TAGS, INGREDIENT_CATEGORIES, COOKING_STAGES } from '../../../src/types';
import type { Ingredient } from '../../../src/types';

describe('Full catalog integrity — Phase 2', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  it('loads at least 100 ingredients from the generated ingredients.json', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(100);
  });

  it('has no duplicate ingredient IDs', () => {
    const ids = catalog.map(i => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('group tags and ingredient IDs are disjoint — no namespace collision', () => {
    const ids = new Set(catalog.map(i => i.id));
    const collisions: string[] = [];
    for (const tag of GROUP_TAGS) {
      if (ids.has(tag as string)) {
        collisions.push(tag);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('every pairsWith and avoidWith entry resolves to a known ID or group tag', () => {
    const ids = new Set(catalog.map(i => i.id));
    const groups = new Set<string>(GROUP_TAGS);
    const unresolved: string[] = [];

    for (const ingredient of catalog) {
      for (const ref of [...(ingredient.pairsWith ?? []), ...(ingredient.avoidWith ?? [])]) {
        if (!ids.has(ref) && !groups.has(ref)) {
          unresolved.push(`${ingredient.id}: "${ref}"`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('every category-based group has at least one member in the full catalog', () => {
    for (const [tag, def] of Object.entries(GROUP_DEFINITIONS)) {
      if ('category' in def) {
        const members = catalog.filter(i => i.category === def.category);
        expect(members.length, `group "${tag}" (category:${def.category}) must have at least one member`).toBeGreaterThan(0);
      }
    }
  });

  it("every ID-based group's declared members are present in the catalog", () => {
    const ids = new Set(catalog.map(i => i.id));
    const missing: string[] = [];

    for (const [tag, def] of Object.entries(GROUP_DEFINITIONS)) {
      if ('ids' in def) {
        for (const memberId of def.ids) {
          if (!ids.has(memberId)) {
            missing.push(`group "${tag}" member "${memberId}"`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('every ingredient has a valid controlled-vocabulary category', () => {
    const valid = new Set<string>(INGREDIENT_CATEGORIES);
    const invalid: string[] = [];
    for (const i of catalog) {
      if (!valid.has(i.category)) invalid.push(`${i.id}: category "${i.category}"`);
    }
    expect(invalid).toEqual([]);
  });

  it('every ingredient has a valid controlled-vocabulary stage', () => {
    const valid = new Set<string>(COOKING_STAGES);
    const invalid: string[] = [];
    for (const i of catalog) {
      if (!valid.has(i.stage)) invalid.push(`${i.id}: stage "${i.stage}"`);
    }
    expect(invalid).toEqual([]);
  });
});

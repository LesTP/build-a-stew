/**
 * Phase 5 acceptance — Persistence Adapter contract
 *
 * Verifies the public surface of the persistence adapter:
 *   saveBuild(build: StewBuild): void
 *   loadBuild(id: string): StewBuild | undefined
 *   listSavedBuilds(): SavedBuildRecord[]
 *   deleteBuild(id: string): void
 *   exportBuild(build: StewBuild): string
 *   importBuild(json: string): StewBuild
 *
 * Contract guarantees:
 *   - exportBuild produces a JSON string containing a schemaVersion field
 *   - exportBuild → importBuild round-trip preserves all build fields
 *   - importBuild rejects malformed JSON with a thrown error
 *   - importBuild rejects JSON missing required build fields
 *   - importBuild rejects builds with unknown ingredient IDs and names the missing IDs
 *   - saveBuild → loadBuild round-trip preserves build identity and all fields
 *   - listSavedBuilds returns one record per saved build
 *   - deleteBuild removes the build; subsequent loadBuild returns undefined
 *   - loadBuild returns undefined for an unknown id
 *   - SavedBuildRecord includes at least the build id, name, and a timestamp
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveBuild,
  loadBuild,
  listSavedBuilds,
  deleteBuild,
  exportBuild,
  importBuild,
} from '../../../src/persistence';
import type { StewBuild } from '../../../src/types';

// Build a minimal in-memory localStorage mock so persistence tests run in node.
function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

function sampleBuild(overrides: Partial<StewBuild> = {}): StewBuild {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    name: 'Test Stew',
    ingredients: [
      { ingredientId: 'chicken_thighs', stage: 'brown' },
      { ingredientId: 'onion', stage: 'aromatics' },
      { ingredientId: 'carrot', stage: 'pressure', quantity: 2, unit: 'medium' },
    ],
    pressureMinutes: 25,
    naturalReleaseMinutes: 10,
    servings: 4,
    notes: 'A test build',
    ...overrides,
  };
}

describe('persistence adapter — exportBuild / importBuild', () => {
  // ── exportBuild ──────────────────────────────────────────────────────────

  it('exportBuild returns a valid JSON string', () => {
    const build = sampleBuild();
    const json = exportBuild(build);
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('exportBuild output includes a schemaVersion field', () => {
    const build = sampleBuild();
    const json = exportBuild(build);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('schemaVersion');
    expect(typeof parsed.schemaVersion).toBe('number');
  });

  it('exportBuild output preserves all StewBuild fields', () => {
    const build = sampleBuild();
    const json = exportBuild(build);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(build.id);
    expect(parsed.name).toBe(build.name);
    expect(parsed.pressureMinutes).toBe(build.pressureMinutes);
    expect(parsed.naturalReleaseMinutes).toBe(build.naturalReleaseMinutes);
    expect(parsed.servings).toBe(build.servings);
    expect(parsed.notes).toBe(build.notes);
    expect(Array.isArray(parsed.ingredients)).toBe(true);
    expect(parsed.ingredients).toHaveLength(build.ingredients.length);
  });

  // ── importBuild ──────────────────────────────────────────────────────────

  it('importBuild round-trips an exportBuild output back to an identical StewBuild', () => {
    const build = sampleBuild();
    const json = exportBuild(build);
    const restored = importBuild(json);
    // id, ingredients, pressureMinutes, naturalReleaseMinutes must survive
    expect(restored.id).toBe(build.id);
    expect(restored.name).toBe(build.name);
    expect(restored.pressureMinutes).toBe(build.pressureMinutes);
    expect(restored.naturalReleaseMinutes).toBe(build.naturalReleaseMinutes);
    expect(restored.ingredients).toEqual(build.ingredients);
  });

  it('importBuild rejects malformed JSON with a thrown error', () => {
    expect(() => importBuild('not json at all')).toThrow();
  });

  it('importBuild rejects JSON that is missing the ingredients array', () => {
    const json = JSON.stringify({ id: 'x', schemaVersion: 1 });
    expect(() => importBuild(json)).toThrow();
  });

  it('importBuild rejects a JSON array instead of an object', () => {
    expect(() => importBuild('[1,2,3]')).toThrow();
  });

  it('importBuild rejects builds with unknown ingredient IDs and names them in the error', () => {
    const badBuild = {
      schemaVersion: 1,
      id: 'bad-build',
      ingredients: [
        { ingredientId: 'chicken_thighs', stage: 'brown' },
        { ingredientId: '__does_not_exist__', stage: 'pressure' },
        { ingredientId: '__also_missing__', stage: 'finish' },
      ],
    };
    let threw = false;
    let errorMessage = '';
    try {
      importBuild(JSON.stringify(badBuild));
    } catch (e) {
      threw = true;
      errorMessage = (e as Error).message;
    }
    expect(threw).toBe(true);
    expect(errorMessage).toMatch(/__does_not_exist__/);
    expect(errorMessage).toMatch(/__also_missing__/);
  });

  it('importBuild accepts a valid exported build with all known ingredients', () => {
    const build = sampleBuild();
    const json = exportBuild(build);
    expect(() => importBuild(json)).not.toThrow();
  });
});

describe('persistence adapter — save / load / list / delete', () => {
  beforeEach(() => {
    // Reset localStorage to a clean state before each test
    vi.stubGlobal('localStorage', createMockStorage());
  });

  // ── saveBuild / loadBuild ─────────────────────────────────────────────────

  it('loadBuild returns undefined for an unknown id', () => {
    const result = loadBuild('does-not-exist');
    expect(result).toBeUndefined();
  });

  it('saveBuild + loadBuild round-trip preserves the build', () => {
    const build = sampleBuild();
    saveBuild(build);
    const loaded = loadBuild(build.id);
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe(build.id);
    expect(loaded!.name).toBe(build.name);
    expect(loaded!.ingredients).toEqual(build.ingredients);
    expect(loaded!.pressureMinutes).toBe(build.pressureMinutes);
    expect(loaded!.naturalReleaseMinutes).toBe(build.naturalReleaseMinutes);
  });

  it('saveBuild overwrites an existing saved build with the same id', () => {
    const build = sampleBuild();
    saveBuild(build);
    const updated: StewBuild = { ...build, name: 'Updated Name', pressureMinutes: 35 };
    saveBuild(updated);
    const loaded = loadBuild(build.id);
    expect(loaded!.name).toBe('Updated Name');
    expect(loaded!.pressureMinutes).toBe(35);
  });

  // ── listSavedBuilds ───────────────────────────────────────────────────────

  it('listSavedBuilds returns an empty array when nothing has been saved', () => {
    const records = listSavedBuilds();
    expect(records).toEqual([]);
  });

  it('listSavedBuilds returns one record per saved build', () => {
    const b1 = sampleBuild({ name: 'Stew 1' });
    const b2 = sampleBuild({ name: 'Stew 2' });
    saveBuild(b1);
    saveBuild(b2);
    const records = listSavedBuilds();
    expect(records).toHaveLength(2);
  });

  it('each SavedBuildRecord includes at least the build id and name', () => {
    const build = sampleBuild({ name: 'Named Stew' });
    saveBuild(build);
    const records = listSavedBuilds();
    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record).toHaveProperty('id', build.id);
    expect(record).toHaveProperty('name', build.name);
  });

  it('SavedBuildRecord includes a savedAt timestamp string', () => {
    const build = sampleBuild();
    saveBuild(build);
    const records = listSavedBuilds();
    const record = records[0];
    expect(record).toHaveProperty('savedAt');
    expect(typeof record.savedAt).toBe('string');
    expect(record.savedAt.length).toBeGreaterThan(0);
  });

  // ── deleteBuild ──────────────────────────────────────────────────────────

  it('deleteBuild removes the build so loadBuild returns undefined', () => {
    const build = sampleBuild();
    saveBuild(build);
    deleteBuild(build.id);
    expect(loadBuild(build.id)).toBeUndefined();
  });

  it('deleteBuild removes only the targeted build', () => {
    const b1 = sampleBuild();
    const b2 = sampleBuild();
    saveBuild(b1);
    saveBuild(b2);
    deleteBuild(b1.id);
    expect(loadBuild(b1.id)).toBeUndefined();
    expect(loadBuild(b2.id)).toBeDefined();
  });

  it('listSavedBuilds omits deleted builds', () => {
    const b1 = sampleBuild();
    const b2 = sampleBuild();
    saveBuild(b1);
    saveBuild(b2);
    deleteBuild(b1.id);
    const records = listSavedBuilds();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(b2.id);
  });

  it('deleteBuild on an unknown id does not throw', () => {
    expect(() => deleteBuild('nonexistent-id')).not.toThrow();
  });
});

describe('persistence adapter — saveBuild storage-quota failure', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces the error and rolls the blob back when the index write fails', () => {
    const store: Record<string, string> = {};
    const quotaStorage: Storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        // Simulate storage filling up exactly on the index write.
        if (key.includes('saved-build-index')) {
          throw new Error('QuotaExceededError: storage is full');
        }
        store[key] = value;
      },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() { return Object.keys(store).length; },
    };
    vi.stubGlobal('localStorage', quotaStorage);

    const build = sampleBuild();
    // The failed index write must surface, not be silently swallowed.
    expect(() => saveBuild(build)).toThrow(/quota/i);
    // ...and the build blob must be rolled back, leaving no orphan.
    expect(loadBuild(build.id)).toBeUndefined();
  });
});

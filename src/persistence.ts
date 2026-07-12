import { z } from 'zod';
import { loadCatalog } from './catalog';
import { COOKING_STAGES } from './types';
import type { SavedBuildRecord, StewBuild, CookingStage, IngredientId } from './types';

const SCHEMA_VERSION = 1;
const STORAGE_NAMESPACE = 'build-a-stew:persistence';
const BUILD_INDEX_KEY = `${STORAGE_NAMESPACE}:saved-build-index`;
const BUILD_KEY_PREFIX = `${STORAGE_NAMESPACE}:build:`;

const buildIngredientSchema = z.object({
  ingredientId: z.string(),
  stage: z.enum(COOKING_STAGES),
  quantity: z.number().optional(),
  unit: z.string().optional(),
}).strict();

const exportedBuildSchema = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  name: z.string().optional(),
  servings: z.number().optional(),
  ingredients: z.array(buildIngredientSchema),
  pressureMinutes: z.number().optional(),
  naturalReleaseMinutes: z.number().optional(),
  liquidAmount: z.number().optional(),
  notes: z.string().optional(),
}).strict();

const savedBuildRecordSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  savedAt: z.string(),
  schemaVersion: z.number(),
}).strict();

const savedBuildRecordListSchema = z.array(savedBuildRecordSchema);

type ExportedBuild = z.infer<typeof exportedBuildSchema>;

function getStorage(): Storage {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }
  return localStorage;
}

function buildStorageKey(id: string): string {
  return `${BUILD_KEY_PREFIX}${id}`;
}

function toSavedBuildRecord(build: StewBuild): SavedBuildRecord {
  return {
    id: build.id,
    name: build.name,
    savedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
}

function readSavedBuildIndex(storage: Storage): SavedBuildRecord[] {
  const rawIndex = storage.getItem(BUILD_INDEX_KEY);
  if (rawIndex === null) {
    return [];
  }

  const parsed = savedBuildRecordListSchema.parse(JSON.parse(rawIndex));
  return parsed.map(record => structuredClone(record));
}

function writeSavedBuildIndex(storage: Storage, records: readonly SavedBuildRecord[]): void {
  storage.setItem(BUILD_INDEX_KEY, JSON.stringify(records));
}

function validateIngredientReferences(build: ExportedBuild): void {
  const catalog = loadCatalog();
  const knownIds = new Set(catalog.map(ingredient => ingredient.id));
  const missingIds = new Set<IngredientId>();

  for (const ingredient of build.ingredients) {
    if (!knownIds.has(ingredient.ingredientId)) {
      missingIds.add(ingredient.ingredientId);
    }
  }

  if (missingIds.size > 0) {
    throw new Error(`Unknown ingredient IDs: ${Array.from(missingIds).join(', ')}`);
  }
}

function parseBuild(json: string): ExportedBuild {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid build JSON');
  }

  const parsed = exportedBuildSchema.parse(raw);
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported build schemaVersion: ${parsed.schemaVersion}`);
  }

  validateIngredientReferences(parsed);
  return parsed;
}

function exportedBuildToStewBuild(build: ExportedBuild): StewBuild {
  const { schemaVersion: _schemaVersion, ...rest } = build;
  return structuredClone(rest);
}

export function exportBuild(build: StewBuild): string {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    ...structuredClone(build),
  });
}

export function importBuild(json: string): StewBuild {
  return exportedBuildToStewBuild(parseBuild(json));
}

export function saveBuild(build: StewBuild): void {
  const storage = getStorage();
  const exported = exportBuild(build);
  const record = toSavedBuildRecord(build);
  const records = readSavedBuildIndex(storage).filter(existing => existing.id !== build.id);

  storage.setItem(buildStorageKey(build.id), exported);
  records.push(record);
  writeSavedBuildIndex(storage, records);
}

export function loadBuild(id: string): StewBuild | undefined {
  const storage = getStorage();
  const raw = storage.getItem(buildStorageKey(id));
  if (raw === null) {
    return undefined;
  }

  return importBuild(raw);
}

export function listSavedBuilds(): SavedBuildRecord[] {
  const storage = getStorage();
  return readSavedBuildIndex(storage);
}

export function deleteBuild(id: string): void {
  const storage = getStorage();
  storage.removeItem(buildStorageKey(id));
  const records = readSavedBuildIndex(storage).filter(record => record.id !== id);
  writeSavedBuildIndex(storage, records);
}

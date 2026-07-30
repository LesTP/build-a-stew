import {
  COOKING_STAGES,
  INGREDIENT_CATEGORIES,
  ROLES,
  BALANCE_AXES,
  TRAITS,
  CUISINE_TAGS,
  SALT_RISKS,
  GROUP_TAGS,
} from '../src/types';
import type { Ingredient, CuisineTag, IngredientRef, CookingStage } from '../src/types';

export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}

// Maps raw CSV cuisine strings to controlled CuisineTag values.
// Canonical tags pass through; non-canonical aliases consolidate to their canonical form.
const CUISINE_CONSOLIDATION: Record<string, CuisineTag> = {
  ...Object.fromEntries(CUISINE_TAGS.map((t) => [t, t])),
  generic: 'universal',
  cajun: 'american',
  southern: 'american',
  caribbean: 'latin_american',
  moroccan: 'north_african',
  tunisian: 'north_african',
  algerian: 'north_african',
  japanese: 'east_asian',
  korean: 'east_asian',
  chinese: 'east_asian',
  thai: 'southeast_asian',
  vietnamese: 'southeast_asian',
  spanish: 'iberian',
  portuguese: 'iberian',
  jewish: 'eastern_european',
  polish: 'eastern_european',
  hungarian: 'central_european',
  austrian: 'central_european',
  german: 'central_european',
};

function splitSemicolon(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw.split(';').map((s) => s.trim()).filter(Boolean);
}

function consolidateCuisines(tokens: string[], id: string): CuisineTag[] {
  const result: CuisineTag[] = [];
  for (const token of tokens) {
    const mapped = CUISINE_CONSOLIDATION[token];
    if (!mapped) {
      throw new ConversionError(`Unknown cuisine string '${token}' with no mapping for id '${id}'`);
    }
    if (!result.includes(mapped)) result.push(mapped);
  }
  return result;
}

// RFC 4180-compatible CSV line parser (handles quoted fields with embedded commas and doubled-quote escapes).
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(field);
      field = '';
    } else {
      field += ch;
    }
    i++;
  }
  result.push(field);
  return result;
}

export function convertCatalog(csv: string): Ingredient[] {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim());
  const col = (row: string[], name: string) => row[header.indexOf(name)]?.trim() ?? '';

  const GROUP_TAG_SET = new Set<string>(GROUP_TAGS);

  // First pass: collect all IDs and validate namespace invariants.
  const allIds = new Set<string>();
  const parsedRows: string[][] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCSVLine(line);
    const id = col(cols, 'id');
    if (!id) continue;

    if (GROUP_TAG_SET.has(id)) {
      throw new ConversionError(`Ingredient ID '${id}' collides with a GroupTag name`);
    }
    if (allIds.has(id)) {
      throw new ConversionError(`Duplicate ingredient ID: '${id}'`);
    }
    allIds.add(id);
    parsedRows.push(cols);
  }

  // Second pass: validate and convert each row.
  const ingredients: Ingredient[] = [];

  for (const cols of parsedRows) {
    const get = (name: string) => col(cols, name);
    const id = get('id');

    const categoryRaw = get('category');
    if (!(INGREDIENT_CATEGORIES as readonly string[]).includes(categoryRaw)) {
      throw new ConversionError(`Unknown ingredient category '${categoryRaw}' for id '${id}'`);
    }

    const stageRaw = get('stage');
    if (!(COOKING_STAGES as readonly string[]).includes(stageRaw)) {
      throw new ConversionError(`Unknown cooking stage '${stageRaw}' for id '${id}'`);
    }
    const stage = stageRaw as CookingStage;

    const rolesRaw = splitSemicolon(get('roles'));
    for (const r of rolesRaw) {
      if (!(ROLES as readonly string[]).includes(r)) {
        throw new ConversionError(`Unknown role value '${r}' for id '${id}'`);
      }
    }

    const traitsRaw = splitSemicolon(get('traits'));
    for (const t of traitsRaw) {
      if (!(TRAITS as readonly string[]).includes(t)) {
        throw new ConversionError(`Unknown trait value '${t}' for id '${id}'`);
      }
    }

    const balanceScoresRaw = get('balance_scores');
    let balanceScores: Ingredient['balanceScores'] = {};
    try {
      const parsed = JSON.parse(balanceScoresRaw || '{}') as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        if (!(BALANCE_AXES as readonly string[]).includes(key)) {
          throw new ConversionError(`Unknown balance axis key '${key}' for id '${id}'`);
        }
      }
      balanceScores = parsed as Ingredient['balanceScores'];
    } catch (e) {
      if (e instanceof ConversionError) throw e;
      throw new ConversionError(`Invalid balance_scores JSON for id '${id}': ${String(e)}`);
    }

    const cuisinesRaw = splitSemicolon(get('cuisines'));
    const cuisines = consolidateCuisines(cuisinesRaw, id);

    const saltRiskRaw = get('salt_risk');
    if (!(SALT_RISKS as readonly string[]).includes(saltRiskRaw)) {
      throw new ConversionError(`Unknown salt_risk value '${saltRiskRaw}' for id '${id}'`);
    }

    const cookMinStr = get('cook_min');
    const cookMaxStr = get('cook_max');
    const cookMinutes =
      cookMinStr && cookMaxStr
        ? { min: parseInt(cookMinStr, 10), max: parseInt(cookMaxStr, 10) }
        : undefined;

    const classifyRef = (token: string): IngredientRef => {
      if (GROUP_TAG_SET.has(token)) return token as IngredientRef;
      if (allIds.has(token)) return token as IngredientRef;
      throw new ConversionError(
        `Unresolved ref '${token}' for id '${id}': not a GroupTag or known ingredient ID`,
      );
    };

    const pairsWithRaw = splitSemicolon(get('pairs_with'));
    const avoidWithRaw = splitSemicolon(get('avoid_with'));
    const pairsWith = pairsWithRaw.length > 0 ? pairsWithRaw.map(classifyRef) : undefined;
    const avoidWith = avoidWithRaw.length > 0 ? avoidWithRaw.map(classifyRef) : undefined;

    const notesRaw = get('notes');

    const ingredient: Ingredient = {
      id,
      name: get('name'),
      category: categoryRaw as Ingredient['category'],
      stage,
      compatibleSteps: [stage],
      roles: rolesRaw as Ingredient['roles'],
      traits: traitsRaw as Ingredient['traits'],
      balanceScores,
      cuisines,
      saltRisk: saltRiskRaw as Ingredient['saltRisk'],
    };

    if (cookMinutes !== undefined) ingredient.cookMinutes = cookMinutes;
    if (pairsWith !== undefined) ingredient.pairsWith = pairsWith;
    if (avoidWith !== undefined) ingredient.avoidWith = avoidWith;
    if (notesRaw) ingredient.notes = notesRaw;

    ingredients.push(ingredient);
  }

  return ingredients;
}

import { describe, it, expect } from 'vitest';
import { convertCatalog, ConversionError } from '../../../scripts/convert-catalog';

function buildCsv(rows: string[]): string {
  const header = 'id,name,category,stage,roles,traits,balance_scores,cuisines,cook_min,cook_max,salt_risk,pairs_with,avoid_with,notes';
  return [header, ...rows].join('\n');
}

// A minimal valid CSV row — all required fields, no optional refs.
const BASE = 'test_item,Test Item,protein,brown,protein,,{},universal,,,low,,,';

describe('CSV→JSON converter — semicolon-delimited field splitting', () => {
  it('splits semicolon-delimited roles into an array', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein; fat; body,,{},universal,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.roles).toEqual(['protein', 'fat', 'body']);
  });

  it('splits semicolon-delimited traits into an array', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,savory; earthy; nutty,{},universal,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.traits).toEqual(['savory', 'earthy', 'nutty']);
  });

  it('splits semicolon-delimited cuisines and consolidates to closed CuisineTag values', () => {
    // 'moroccan' consolidates to 'north_african'; 'spanish' to 'iberian'
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},french; moroccan; spanish,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.cuisines).toContain('french');
    expect(result.cuisines).toContain('north_african');
    expect(result.cuisines).toContain('iberian');
    expect(result.cuisines).not.toContain('moroccan');
    expect(result.cuisines).not.toContain('spanish');
  });

  it('splits semicolon-delimited pairs_with into an array of refs', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,roots; meat,,']);
    const [result] = convertCatalog(csv);
    expect(result.pairsWith).toHaveLength(2);
    expect(result.pairsWith).toContain('roots');
    expect(result.pairsWith).toContain('meat');
  });

  it('splits semicolon-delimited avoid_with into an array of refs', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,,grains; vegetables,']);
    const [result] = convertCatalog(csv);
    expect(result.avoidWith).toHaveLength(2);
    expect(result.avoidWith).toContain('grains');
    expect(result.avoidWith).toContain('vegetables');
  });

  it('trims whitespace around each semicolon-separated token', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown, protein ;  fat ,savory; earthy ,{},universal,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.roles).toEqual(['protein', 'fat']);
    expect(result.traits).toEqual(['savory', 'earthy']);
  });
});

describe('CSV→JSON converter — balance_scores JSON parsing', () => {
  it('parses a quoted JSON balance_scores string into a balanceScores object', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,"{""body"":3,""richness"":2}",universal,,,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.balanceScores).toEqual({ body: 3, richness: 2 });
  });

  it('produces an empty balanceScores for {}', () => {
    const csv = buildCsv([BASE]);
    const [result] = convertCatalog(csv);
    expect(result.balanceScores).toEqual({});
  });
});

describe('CSV→JSON converter — cookMinutes handling', () => {
  it('omits cookMinutes when cook_min and cook_max are blank', () => {
    const csv = buildCsv([BASE]);
    const [result] = convertCatalog(csv);
    expect('cookMinutes' in result).toBe(false);
  });

  it('produces cookMinutes with parsed integers when both cook_min and cook_max are present', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,15,30,low,,,']);
    const [result] = convertCatalog(csv);
    expect(result.cookMinutes).toEqual({ min: 15, max: 30 });
  });
});

describe('CSV→JSON converter — IngredientRef classification', () => {
  it('classifies a token matching a GroupTag as a GroupTag ref', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,roots; meat; grains,,']);
    const [result] = convertCatalog(csv);
    expect(result.pairsWith).toContain('roots');
    expect(result.pairsWith).toContain('meat');
    expect(result.pairsWith).toContain('grains');
  });

  it('classifies a token matching a sibling ingredient ID as an IngredientId ref', () => {
    const csv = buildCsv([
      'ingredient_a,Ingredient A,protein,brown,protein,,{},universal,,,low,ingredient_b,,',
      'ingredient_b,Ingredient B,protein,pressure,starch,,{},universal,20,30,low,,,',
    ]);
    const results = convertCatalog(csv);
    const a = results.find((r) => r.id === 'ingredient_a')!;
    expect(a.pairsWith).toContain('ingredient_b');
  });
});

describe('CSV→JSON converter — vocabulary drift errors', () => {
  it('throws ConversionError on an unknown role value', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein; magical,,{},universal,,,low,,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });

  it('throws ConversionError on an unknown cuisine string with no mapping', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},atlantean,,,low,,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });

  it('throws ConversionError on an unknown balance axis key', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,"{""spiciness"":3}",universal,,,low,,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });

  it('throws ConversionError on an unknown cooking stage', () => {
    const csv = buildCsv(['test_item,Test Item,protein,microwave,protein,,{},universal,,,low,,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });

  it('throws ConversionError on an unknown ingredient category', () => {
    const csv = buildCsv(['test_item,Test Item,condiment,brown,protein,,{},universal,,,low,,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });

  it('throws ConversionError on an unknown salt_risk value', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,extreme,,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });
});

describe('CSV→JSON converter — unresolved reference errors', () => {
  it('throws ConversionError when a pairs_with token is neither a GroupTag nor a known ingredient ID', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,mythical_herb,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });

  it('throws ConversionError when an avoid_with token is neither a GroupTag nor a known ingredient ID', () => {
    const csv = buildCsv(['test_item,Test Item,protein,brown,protein,,{},universal,,,low,,ghost_pepper,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });
});

describe('CSV→JSON converter — namespace collision guard', () => {
  it('throws ConversionError when an ingredient ID collides with a GroupTag name', () => {
    // 'roots' is a reserved GroupTag; an ingredient row with id='roots' must be rejected.
    const csv = buildCsv(['roots,The Roots,roots,pressure,body,earthy,{},universal,10,20,low,,,']);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });

  it('throws ConversionError when the catalog contains duplicate ingredient IDs', () => {
    const csv = buildCsv([
      'dup_item,Item One,protein,brown,protein,,{},universal,,,low,,,',
      'dup_item,Item Two,protein,brown,protein,,{},universal,,,low,,,',
    ]);
    expect(() => convertCatalog(csv)).toThrow(ConversionError);
  });
});

describe('CSV→JSON converter — cuisine consolidation mapping', () => {
  const CONSOLIDATION_CASES: [string, string][] = [
    ['generic', 'universal'],
    ['cajun', 'american'],
    ['southern', 'american'],
    ['caribbean', 'latin_american'],
    ['moroccan', 'north_african'],
    ['japanese', 'east_asian'],
    ['korean', 'east_asian'],
    ['thai', 'southeast_asian'],
    ['indian', 'indian'],
    ['spanish', 'iberian'],
    ['jewish', 'eastern_european'],
    ['hungarian', 'central_european'],
  ];

  for (const [raw, expected] of CONSOLIDATION_CASES) {
    it(`consolidates '${raw}' → '${expected}'`, () => {
      const csv = buildCsv([`test_item,Test Item,protein,brown,protein,,{},${raw},,,low,,,`]);
      const [result] = convertCatalog(csv);
      expect(result.cuisines).toContain(expected);
    });
  }
});

/**
 * Phase 4 acceptance — Representative fixture builds
 *
 * Ten fixture builds that validate the combined analysis engine against
 * expected outcomes. Each fixture is documented with its inputs and the
 * observable contract guarantees it exercises.
 *
 * These fixtures serve as the cross-product regression suite: all rules
 * and scoring systems must agree on the outcomes below. Tuning a threshold
 * requires updating the documented expectation here before changing the
 * implementation (per D-25 provisional thresholds policy).
 *
 * Build styles covered:
 *   1.  Heavy (beef + roots + grain): high body, low freshness, acid suggestion fires
 *   2.  Bright (chicken + lemon + spinach): high freshness + acidity, pairing fires
 *   3.  Bean-forward (black beans + tomatoes): bean + acid avoidance warning fires
 *   4.  Root-forward + starch stack: body/starch composition warning fires
 *   5.  French-affinity: french leads the cuisine leaderboard
 *   6.  Mexican-affinity: mexican leads the cuisine leaderboard
 *   7.  East Asian / miso: east_asian leads, miso in correct finish stage → no placement warning
 *   8.  Salt-stack: ham hock + parmesan rind + stock → salt caution fires
 *   9.  No greens: only roots + protein → greens suggestion fires
 *  10.  Timing mismatch: two ingredients with conflicting pressure needs both fire
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { analyzeBuild } from '../../../src/analysis';
import { loadCatalog } from '../../../src/catalog';
import { addIngredient, moveIngredient } from '../../../src/build';
import type { Ingredient, StewBuild, CuisineTag } from '../../../src/types';

function emptyBuild(pressureMinutes?: number): StewBuild {
  return { id: 'fixture-' + Math.random().toString(36).slice(2), ingredients: [], pressureMinutes };
}

function topCuisine(scores: Record<CuisineTag, number>): CuisineTag {
  const entries = Object.entries(scores) as [CuisineTag, number][];
  const nonUniversal = entries.filter(([tag]) => tag !== 'universal');
  return nonUniversal.sort((a, b) => b[1] - a[1])[0][0];
}

describe('Phase 4 fixture builds', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  // ── Fixture 1: Heavy beef stew ────────────────────────────────────────────
  //
  //   beef_chuck     brown      body:4, richness:4, umami:3       french, american
  //   potato         pressure   body:4, texture:2                 universal
  //   parsnip        pressure   body:2, sweetness:4               french, british
  //   pearl_barley   pressure   body:3, texture:4, richness:1     french, central_european, british
  //   beef_stock     deglaze    body:1, richness:3, umami:3       french, american
  //
  //   Expected totals (selected axes):
  //     body = 4+4+2+3+1 = 14 — very high
  //     richness = 4+1+3 = 8 — high
  //     freshness = 0 — none
  //     acidity = 0 — none
  //
  //   Cuisine: french = 4 (beef_chuck, parsnip, pearl_barley, beef_stock) → tops
  //   Rules: no freshness/acid → acid suggestion; no greens → greens suggestion

  it('Fixture 1 (heavy): balance axes match documented totals', () => {
    const b1 = addIngredient(emptyBuild(30), 'beef_chuck', catalog);
    const b2 = addIngredient(b1, 'potato', catalog);
    const b3 = addIngredient(b2, 'parsnip', catalog);
    const b4 = addIngredient(b3, 'pearl_barley', catalog);
    const b5 = addIngredient(b4, 'beef_stock', catalog);
    const result = analyzeBuild(b5, catalog);

    expect(result.balanceScores.body).toBe(14);
    expect(result.balanceScores.richness).toBe(8);
    expect(result.balanceScores.freshness).toBe(0);
    expect(result.balanceScores.acidity).toBe(0);
  });

  it('Fixture 1 (heavy): french leads the cuisine leaderboard', () => {
    const b1 = addIngredient(emptyBuild(30), 'beef_chuck', catalog);
    const b2 = addIngredient(b1, 'potato', catalog);
    const b3 = addIngredient(b2, 'parsnip', catalog);
    const b4 = addIngredient(b3, 'pearl_barley', catalog);
    const b5 = addIngredient(b4, 'beef_stock', catalog);
    const result = analyzeBuild(b5, catalog);

    expect(result.cuisineScores.french).toBe(4);
    expect(topCuisine(result.cuisineScores)).toBe('french');
  });

  it('Fixture 1 (heavy): acid and freshness suggestions fire', () => {
    const b1 = addIngredient(emptyBuild(30), 'beef_chuck', catalog);
    const b2 = addIngredient(b1, 'potato', catalog);
    const b3 = addIngredient(b2, 'parsnip', catalog);
    const b4 = addIngredient(b3, 'pearl_barley', catalog);
    const b5 = addIngredient(b4, 'beef_stock', catalog);
    const result = analyzeBuild(b5, catalog);

    const acidOrFreshSuggestion = result.warnings.find(
      w => w.severity === 'info' &&
        (w.message.toLowerCase().includes('acid') || w.message.toLowerCase().includes('fresh'))
    );
    expect(acidOrFreshSuggestion).toBeDefined();
  });

  // ── Fixture 2: Bright chicken-lemon-spinach ────────────────────────────────
  //
  //   chicken_thighs  brown      body:2, richness:3, umami:2   french, italian, mexican, east_asian, indian
  //   lemon_juice     finish     acidity:5, freshness:4, aromatic_intensity:2   french, mediterranean, middle_eastern
  //   spinach         stir_in    freshness:4, texture:1        italian, east_asian, indian
  //   carrot          aromatics  sweetness:3, texture:1        universal
  //   garlic          aromatics  umami:1, aromatic_intensity:4 universal
  //
  //   Expected totals:
  //     acidity = 5, freshness = 8 — high brightness
  //     body = 2
  //
  //   Pairings: chicken_thighs pairsWith spinach → pairing fires
  //             spinach pairsWith chicken_thighs → symmetric
  //             spinach pairsWith lemon_juice → second pairing fires
  //   Rules: brightness present → no acid suggestion

  it('Fixture 2 (bright): high freshness and acidity balance scores', () => {
    const b1 = addIngredient(emptyBuild(25), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'lemon_juice', catalog);
    const b3 = addIngredient(b2, 'spinach', catalog);
    const b4 = addIngredient(b3, 'carrot', catalog);
    const b5 = addIngredient(b4, 'garlic', catalog);
    const result = analyzeBuild(b5, catalog);

    expect(result.balanceScores.acidity).toBe(5);
    expect(result.balanceScores.freshness).toBe(8);
    expect(result.balanceScores.body).toBe(2);
  });

  it('Fixture 2 (bright): no avoidance warnings among the selected ingredients', () => {
    const b1 = addIngredient(emptyBuild(25), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'lemon_juice', catalog);
    const b3 = addIngredient(b2, 'spinach', catalog);
    const b4 = addIngredient(b3, 'carrot', catalog);
    const b5 = addIngredient(b4, 'garlic', catalog);
    const result = analyzeBuild(b5, catalog);

    const avoidanceWarnings = result.warnings.filter(w => w.severity === 'warning');
    expect(avoidanceWarnings).toHaveLength(0);
  });

  // ── Fixture 3: Bean-forward (black beans + tomatoes) ─────────────────────
  //
  //   dried_black_beans  pressure   body:3, texture:4, umami:1   mexican, latin_american
  //   canned_tomatoes    pressure   body:2, umami:2, acidity:3   italian, mexican
  //   onion              aromatics  sweetness:2, umami:1         universal
  //   garlic             aromatics  umami:1, aromatic_intensity:4 universal
  //   cumin              aromatics  aromatic_intensity:5, heat:1  mexican, indian, north_african
  //
  //   Avoidance: dried_black_beans avoidWith canned_tomatoes → warning fires
  //   Cuisine: mexican = 3 (beans, tomatoes, cumin) → tops

  it('Fixture 3 (bean-forward): dried beans + tomatoes avoidance warning fires', () => {
    const b1 = addIngredient(emptyBuild(40), 'dried_black_beans', catalog);
    const b2 = addIngredient(b1, 'canned_tomatoes', catalog);
    const b3 = addIngredient(b2, 'onion', catalog);
    const b4 = addIngredient(b3, 'garlic', catalog);
    const b5 = addIngredient(b4, 'cumin', catalog);
    const result = analyzeBuild(b5, catalog);

    const beanTomatoWarning = result.warnings.find(
      w => w.relatedIngredientIds?.includes('dried_black_beans') &&
        w.relatedIngredientIds?.includes('canned_tomatoes')
    );
    expect(beanTomatoWarning).toBeDefined();
    expect(beanTomatoWarning!.severity).toBe('warning');
  });

  it('Fixture 3 (bean-forward): mexican leads the cuisine leaderboard', () => {
    const b1 = addIngredient(emptyBuild(40), 'dried_black_beans', catalog);
    const b2 = addIngredient(b1, 'canned_tomatoes', catalog);
    const b3 = addIngredient(b2, 'onion', catalog);
    const b4 = addIngredient(b3, 'garlic', catalog);
    const b5 = addIngredient(b4, 'cumin', catalog);
    const result = analyzeBuild(b5, catalog);

    expect(topCuisine(result.cuisineScores)).toBe('mexican');
  });

  // ── Fixture 4: Root-forward starch stack ─────────────────────────────────
  //
  //   dried_chickpeas  pressure   body:3, texture:4, umami:1   north_african, indian, mediterranean
  //   pearl_barley     pressure   body:3, texture:4, richness:1 french, central_european, british
  //   carrot           aromatics  sweetness:3, texture:1        universal
  //   potato           pressure   body:4, texture:2             universal
  //   parsnip          pressure   body:2, sweetness:4           french, british
  //   turnip           pressure   body:1, sweetness:1, texture:2 scandinavian, french
  //
  //   Total body = 3+3+4+2+1 = 13, texture = 4+1+4+2+2 = 13 — extremely starchy/heavy
  //   Rule: legume + grain + ≥3 roots → starch/body composition warning

  it('Fixture 4 (root-forward): legume + grain + three roots triggers starch warning', () => {
    const b1 = addIngredient(emptyBuild(35), 'dried_chickpeas', catalog);
    const b2 = addIngredient(b1, 'pearl_barley', catalog);
    const b3 = addIngredient(b2, 'carrot', catalog);
    const b4 = addIngredient(b3, 'potato', catalog);
    const b5 = addIngredient(b4, 'parsnip', catalog);
    const b6 = addIngredient(b5, 'turnip', catalog);
    const result = analyzeBuild(b6, catalog);

    const starchWarning = result.warnings.find(
      w =>
        w.message.toLowerCase().includes('body') ||
        w.message.toLowerCase().includes('starch') ||
        w.message.toLowerCase().includes('heavy') ||
        w.message.toLowerCase().includes('grain') ||
        w.message.toLowerCase().includes('legume')
    );
    expect(starchWarning).toBeDefined();
  });

  it('Fixture 4 (root-forward): body score reflects accumulated roots', () => {
    const b1 = addIngredient(emptyBuild(35), 'dried_chickpeas', catalog);
    const b2 = addIngredient(b1, 'pearl_barley', catalog);
    const b3 = addIngredient(b2, 'carrot', catalog);
    const b4 = addIngredient(b3, 'potato', catalog);
    const b5 = addIngredient(b4, 'parsnip', catalog);
    const b6 = addIngredient(b5, 'turnip', catalog);
    const result = analyzeBuild(b6, catalog);

    // 3+3+0+4+2+1 = 13
    expect(result.balanceScores.body).toBe(13);
  });

  // ── Fixture 5: French-affinity ────────────────────────────────────────────
  //
  //   beef_chuck     brown      french:1, american:1
  //   red_wine       deglaze    french:1, italian:1
  //   leek           aromatics  french:1, british:1
  //   thyme          pressure   french:1, british:1
  //   celery_stalk   aromatics  french:1, american:1, italian:1
  //   carrot         aromatics  universal
  //
  //   Cuisine: french = 5 (beef_chuck, red_wine, leek, thyme, celery_stalk) — clearly tops
  //   Pairings: beef_chuck pairsWith red_wine → pairing

  it('Fixture 5 (french): french cuisine score is exactly 5 and leads the leaderboard', () => {
    const b1 = addIngredient(emptyBuild(30), 'beef_chuck', catalog);
    const b2 = addIngredient(b1, 'red_wine', catalog);
    const b3 = addIngredient(b2, 'leek', catalog);
    const b4 = addIngredient(b3, 'thyme', catalog);
    const b5 = addIngredient(b4, 'celery_stalk', catalog);
    const b6 = addIngredient(b5, 'carrot', catalog);
    const result = analyzeBuild(b6, catalog);

    expect(result.cuisineScores.french).toBe(5);
    expect(topCuisine(result.cuisineScores)).toBe('french');
  });

  it('Fixture 5 (french): no avoidance warnings among the selected ingredients', () => {
    const b1 = addIngredient(emptyBuild(30), 'beef_chuck', catalog);
    const b2 = addIngredient(b1, 'red_wine', catalog);
    const b3 = addIngredient(b2, 'leek', catalog);
    const b4 = addIngredient(b3, 'thyme', catalog);
    const b5 = addIngredient(b4, 'celery_stalk', catalog);
    const b6 = addIngredient(b5, 'carrot', catalog);
    const result = analyzeBuild(b6, catalog);

    expect(result.warnings.filter(w => w.severity === 'warning')).toHaveLength(0);
  });

  // ── Fixture 6: Mexican-affinity ───────────────────────────────────────────
  //
  //   pork_shoulder      brown      mexican:1, american:1
  //   chipotle           pressure   mexican:1
  //   cumin              aromatics  mexican:1, indian:1, north_african:1, middle_eastern:1
  //   coriander_seed     aromatics  indian:1, north_african:1, mexican:1
  //   cilantro           finish     mexican:1, indian:1, north_african:1
  //   dried_black_beans  pressure   mexican:1, latin_american:1
  //
  //   Cuisine: mexican = 6 → tops
  //            indian = 3, north_african = 3, american = 1

  it('Fixture 6 (mexican): mexican cuisine score is exactly 6 and leads the leaderboard', () => {
    const b1 = addIngredient(emptyBuild(40), 'pork_shoulder', catalog);
    const b2 = addIngredient(b1, 'chipotle', catalog);
    const b3 = addIngredient(b2, 'cumin', catalog);
    const b4 = addIngredient(b3, 'coriander_seed', catalog);
    const b5 = addIngredient(b4, 'cilantro', catalog);
    const b6 = addIngredient(b5, 'dried_black_beans', catalog);
    const result = analyzeBuild(b6, catalog);

    expect(result.cuisineScores.mexican).toBe(6);
    expect(topCuisine(result.cuisineScores)).toBe('mexican');
  });

  // ── Fixture 7: East Asian / Miso ─────────────────────────────────────────
  //
  //   chicken_thighs  brown      french:1, italian:1, mexican:1, east_asian:1, indian:1
  //   ginger          aromatics  indian:1, east_asian:1, north_african:1
  //   soy_sauce       finish     east_asian:1
  //   napa_cabbage    stir_in    east_asian:1
  //   miso            finish     east_asian:1   ← default stage is finish → no placement warning
  //   green_onions    finish     east_asian:1
  //
  //   Cuisine: east_asian = 6 (chicken+ginger+soy+napa+miso+green_onions) → tops
  //   Pairings: miso pairsWith chicken_thighs → fires
  //   Stage placement: miso is in finish (default) → no miso stage warning

  it('Fixture 7 (east asian): east_asian cuisine leads the leaderboard', () => {
    const b1 = addIngredient(emptyBuild(20), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'ginger', catalog);
    const b3 = addIngredient(b2, 'soy_sauce', catalog);
    const b4 = addIngredient(b3, 'napa_cabbage', catalog);
    const b5 = addIngredient(b4, 'miso', catalog);
    const b6 = addIngredient(b5, 'green_onions', catalog);
    const result = analyzeBuild(b6, catalog);

    expect(result.cuisineScores.east_asian).toBe(6);
    expect(topCuisine(result.cuisineScores)).toBe('east_asian');
  });

  it('Fixture 7 (east asian): miso in finish stage does not produce a miso placement warning', () => {
    const b1 = addIngredient(emptyBuild(20), 'chicken_thighs', catalog);
    const b2 = addIngredient(b1, 'ginger', catalog);
    const b3 = addIngredient(b2, 'soy_sauce', catalog);
    const b4 = addIngredient(b3, 'napa_cabbage', catalog);
    const b5 = addIngredient(b4, 'miso', catalog);
    const b6 = addIngredient(b5, 'green_onions', catalog);
    const result = analyzeBuild(b6, catalog);

    const misoPlacementWarning = result.warnings.find(
      w => w.message.toLowerCase().includes('miso') &&
        (w.message.toLowerCase().includes('finish') || w.message.toLowerCase().includes('stage'))
    );
    expect(misoPlacementWarning).toBeUndefined();
  });

  // ── Fixture 8: Salt stack ─────────────────────────────────────────────────
  //
  //   ham_hock        pressure   saltRisk: high   american, french, central_european
  //   parmesan_rind   pressure   saltRisk: high   italian
  //   chicken_stock   deglaze    saltRisk: medium universal
  //
  //   Avoidance: parmesan_rind avoidWith ham_hock → warning
  //   Composition: two high-salt items + medium stock → salt caution

  it('Fixture 8 (salt stack): salt caution fires with ham hock + parmesan + stock', () => {
    const b1 = addIngredient(emptyBuild(30), 'ham_hock', catalog);
    const b2 = addIngredient(b1, 'parmesan_rind', catalog);
    const b3 = addIngredient(b2, 'chicken_stock', catalog);
    const result = analyzeBuild(b3, catalog);

    const saltWarning = result.warnings.find(
      w => w.message.toLowerCase().includes('salt')
    );
    expect(saltWarning).toBeDefined();
  });

  it('Fixture 8 (salt stack): ham hock + parmesan rind avoidance warning fires', () => {
    const b1 = addIngredient(emptyBuild(30), 'ham_hock', catalog);
    const b2 = addIngredient(b1, 'parmesan_rind', catalog);
    const b3 = addIngredient(b2, 'chicken_stock', catalog);
    const result = analyzeBuild(b3, catalog);

    const avoidanceWarning = result.warnings.find(
      w => w.severity === 'warning' &&
        w.relatedIngredientIds?.includes('ham_hock') &&
        (w.relatedIngredientIds?.includes('parmesan_rind') || w.relatedIngredientIds?.includes('parmesan'))
    );
    expect(avoidanceWarning).toBeDefined();
  });

  // ── Fixture 9: No greens ──────────────────────────────────────────────────
  //
  //   beef_chuck   brown      body:4, richness:4, umami:3   french, american
  //   potato       pressure   body:4, texture:2             universal
  //   carrot       aromatics  sweetness:3, texture:1        universal
  //   onion        aromatics  sweetness:2, umami:1          universal
  //   garlic       aromatics  umami:1, aromatic_intensity:4 universal
  //
  //   Freshness = 0 (no greens, no acid, no herbs)
  //   Rule: no greens + low freshness → greens suggestion fires

  it('Fixture 9 (no greens): greens suggestion fires', () => {
    const b1 = addIngredient(emptyBuild(25), 'beef_chuck', catalog);
    const b2 = addIngredient(b1, 'potato', catalog);
    const b3 = addIngredient(b2, 'carrot', catalog);
    const b4 = addIngredient(b3, 'onion', catalog);
    const b5 = addIngredient(b4, 'garlic', catalog);
    const result = analyzeBuild(b5, catalog);

    const greensSuggestion =
      result.warnings.find(
        w => w.severity === 'info' && w.message.toLowerCase().includes('green')
      ) ||
      result.suggestions.find(s =>
        ['spinach', 'kale', 'swiss_chard', 'frozen_peas', 'napa_cabbage', 'green_onions'].includes(s.ingredientId)
      );
    expect(greensSuggestion).toBeDefined();
  });

  it('Fixture 9 (no greens): freshness score is 0', () => {
    const b1 = addIngredient(emptyBuild(25), 'beef_chuck', catalog);
    const b2 = addIngredient(b1, 'potato', catalog);
    const b3 = addIngredient(b2, 'carrot', catalog);
    const b4 = addIngredient(b3, 'onion', catalog);
    const b5 = addIngredient(b4, 'garlic', catalog);
    const result = analyzeBuild(b5, catalog);

    expect(result.balanceScores.freshness).toBe(0);
  });

  // ── Fixture 10: Timing mismatch ───────────────────────────────────────────
  //
  //   ham_hock  pressure   cookMinutes {min:45, max:60}  → 30 min pressure = undercooked
  //   spinach   pressure   cookMinutes {min:1, max:3}    → 30 min pressure = overcooked (stage warning too)
  //
  //   Both timing findings must fire simultaneously.
  //   Additionally, spinach in pressure stage triggers a stage placement warning.

  it('Fixture 10 (timing): ham_hock timing finding fires (undercooked, 30 min < 45 min min)', () => {
    const b1 = addIngredient(emptyBuild(30), 'ham_hock', catalog);
    const b2 = moveIngredient(addIngredient(b1, 'spinach', catalog), 'spinach', 'pressure');
    const result = analyzeBuild(b2, catalog);

    const hamFinding = result.timingFindings.find(f => f.ingredientId === 'ham_hock');
    expect(hamFinding).toBeDefined();
    expect(hamFinding!.message.length).toBeGreaterThan(0);
  });

  it('Fixture 10 (timing): spinach timing finding fires (overcooked, 30 min > 3 min max)', () => {
    const b1 = addIngredient(emptyBuild(30), 'ham_hock', catalog);
    const b2 = moveIngredient(addIngredient(b1, 'spinach', catalog), 'spinach', 'pressure');
    const result = analyzeBuild(b2, catalog);

    const spinachFinding = result.timingFindings.find(f => f.ingredientId === 'spinach');
    expect(spinachFinding).toBeDefined();
    expect(spinachFinding!.message.length).toBeGreaterThan(0);
  });

  it('Fixture 10 (timing): spinach in pressure stage also produces a stage placement warning', () => {
    const b1 = addIngredient(emptyBuild(30), 'ham_hock', catalog);
    const b2 = moveIngredient(addIngredient(b1, 'spinach', catalog), 'spinach', 'pressure');
    const result = analyzeBuild(b2, catalog);

    const spinachStageWarning = result.warnings.find(
      w => w.message.toLowerCase().includes('spinach')
    );
    expect(spinachStageWarning).toBeDefined();
  });

  it('Fixture 10 (timing): both timing findings fire simultaneously (no cancellation)', () => {
    const b1 = addIngredient(emptyBuild(30), 'ham_hock', catalog);
    const b2 = moveIngredient(addIngredient(b1, 'spinach', catalog), 'spinach', 'pressure');
    const result = analyzeBuild(b2, catalog);

    expect(result.timingFindings).toHaveLength(2);
    const ids = result.timingFindings.map(f => f.ingredientId);
    expect(ids).toContain('ham_hock');
    expect(ids).toContain('spinach');
  });
});

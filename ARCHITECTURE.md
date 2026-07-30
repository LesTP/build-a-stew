# Insta the Pot — Architecture

## Overview

Insta the Pot is a browser-based visual stew composer. Users assemble a dish from ingredient cards, place each card into its cooking stage, and receive a generated cooking sequence, timing warnings, balance feedback, and cuisine-affinity hints. The first release is intentionally a small client-side application with a static ingredient catalog and deterministic rule engine.

This project uses **Pattern B: Single-document architecture**. The application is small, its UI and rule engine share the same build state, and the implementation is best delivered as vertical slices rather than as independently deployable modules. No per-module `ARCH_<module>.md` files are required for the MVP.

## Component Map

| Component | Responsibility | Dependencies |
|---|---|---|
| Ingredient Catalog | Owns canonical ingredient records, controlled vocabularies, and cuisine metadata. | None |
| Build Store | Owns the current stew build, selected ingredients, quantities, pressure time, and saved builds. | Ingredient Catalog |
| Ingredient Library UI | Lets users search, filter, inspect, and add ingredient cards. | Ingredient Catalog, Build Store |
| Stage Timeline UI | Displays the ordered cooking stages and accepts ingredient cards into each stage. | Build Store, Ingredient Catalog |
| Analysis Engine | Calculates balance scores, cuisine affinities, pairings, timing mismatches, and warnings. | Ingredient Catalog, Build Store |
| Instruction Generator | Converts the staged build into a deterministic cooking sequence. | Ingredient Catalog, Build Store, Analysis Engine |
| Build Summary UI | Presents balance bars, cuisine affinities, warnings, suggestions, and generated instructions. | Analysis Engine, Instruction Generator |
| Persistence Adapter | Saves and restores pantry state and stew builds in browser storage; supports JSON import/export. | Build Store |

## Data Flow

### Core Objects

- **Ingredient** — canonical catalog record.
  - `id: string`
  - `name: string`
  - `category: IngredientCategory`
  - `stage: CookingStage`
  - `roles: Role[]` — categorical function tags; never scored.
  - `traits: Trait[]` — descriptive flavor/search tags; never scored.
  - `balanceScores: Partial<Record<BalanceAxis, number>>` — the only scored dimensions.
  - `cuisines: CuisineTag[]`
  - `cuisineWeights?: Partial<Record<CuisineTag, number>>`
  - `saltRisk: SaltRisk`
  - `cookMinutes?: { min: number; max: number }`
  - `pairsWith?: IngredientRef[]`
  - `avoidWith?: IngredientRef[]`
  - `notes?: string`

- **BuildIngredient** — one ingredient selected for the current build.
  - `ingredientId: IngredientId`
  - `quantity?: number`
  - `unit?: string`
  - `stage: CookingStage`

- **StewBuild** — complete editable build state.
  - `id: string`
  - `name?: string`
  - `servings?: number`
  - `ingredients: BuildIngredient[]`
  - `pressureMinutes?: number`
  - `naturalReleaseMinutes?: number`
  - `liquidAmount?: number`
  - `notes?: string`

- **AnalysisResult** — computed interpretation of a build.
  - `balanceScores: Record<BalanceAxis, number>`
  - `cuisineScores: Record<CuisineTag, number>`
  - `warnings: AnalysisMessage[]`
  - `suggestions: IngredientSuggestion[]`
  - `timingFindings: TimingFinding[]`

- **AnalysisMessage** — one deterministic warning or suggestion.
  - `id: string`
  - `severity: "info" | "warning"`
  - `message: string`
  - `relatedIngredientIds?: IngredientId[]`

- **SavedBuildRecord** — serialized local-storage representation of a `StewBuild`.

### Controlled Vocabularies

```ts
export type IngredientCategory =
  | "protein"
  | "aromatics"
  | "liquid"
  | "roots"
  | "vegetable"
  | "legumes"
  | "grains"
  | "greens"
  | "fat"
  | "topping"
  | "spice";

export type CookingStage =
  | "brown"
  | "aromatics"
  | "deglaze"
  | "pressure"
  | "simmer_after"
  | "stir_in"
  | "finish"
  | "serve_over";

// Categorical function tags. Never carry a numeric score.
export type Role =
  | "protein"
  | "collagen"
  | "fat"
  | "starch"
  | "thickener"
  | "body"
  | "texture"
  | "aromatic"
  | "liquid"
  | "acid"
  | "seasoning"
  | "freshener"
  | "topping";

// The only dimensions the analysis engine sums (see Balance Scoring).
export type BalanceAxis =
  | "body"
  | "richness"
  | "umami"
  | "sweetness"
  | "acidity"
  | "heat"
  | "smoke"
  | "freshness"
  | "texture"
  | "aromatic_intensity";

// Descriptive flavor / search tags. Never scored.
export type Trait =
  | "anise"
  | "bitter"
  | "citrusy"
  | "creamy"
  | "earthy"
  | "fermented"
  | "floral"
  | "fruity"
  | "gamey"
  | "garlicky"
  | "herbaceous"
  | "malty"
  | "nutty"
  | "peppery"
  | "pungent"
  | "resinous"
  | "savory"
  | "tangy";

// Closed cuisine vocabulary; see "Cuisine Vocabulary" under Analysis Rules.
export type CuisineTag =
  | "universal"
  | "french"
  | "italian"
  | "mediterranean"
  | "iberian"
  | "mexican"
  | "latin_american"
  | "american"
  | "central_european"
  | "eastern_european"
  | "british"
  | "scandinavian"
  | "middle_eastern"
  | "north_african"
  | "west_african"
  | "indian"
  | "east_asian"
  | "southeast_asian";

export type SaltRisk = "low" | "medium" | "high";

// Named sets of ingredients usable in pairsWith / avoidWith.
export type GroupTag =
  | "meat"
  | "roots"
  | "vegetables"
  | "greens"
  | "grains"
  | "spices"
  | "herbs"
  | "wine"
  | "vinegar"
  | "beans"
  | "black_beans"
  | "white_beans"
  | "lentils";

// A pair/avoid entry is either a single ingredient or a whole group.
// A bare token resolves to a GroupTag when it matches the group vocabulary,
// otherwise it must resolve to an IngredientId. The two namespaces are disjoint.
export type IngredientRef = IngredientId | GroupTag;
```

salt is deliberately not a balance axis.

### Groups

A group is a named set of ingredients. Groups let a `pairsWith`/`avoidWith` entry target a whole family (for example, "chicken pairs with any root") without enumerating every member. Each group is defined either by an ingredient `category` or by an explicit list of ingredient IDs:

| Group | Definition |
|---|---|
| `meat` | category `protein` |
| `roots` | category `roots` |
| `vegetables` | category `vegetable` |
| `greens` | category `greens` |
| `grains` | category `grains` |
| `spices` | category `spice` |
| `herbs` | `parsley`, `dill`, `cilantro`, `mint`, `chives`, `bay_leaf`, `thyme`, `rosemary`, `oregano` |
| `wine` | `white_wine`, `red_wine` |
| `vinegar` | `cider_vinegar`, `sherry_vinegar`, `red_wine_vinegar` |
| `beans` | `dried_black_beans`, `cooked_black_beans`, `dried_white_beans`, `cooked_white_beans` |
| `black_beans` | `dried_black_beans`, `cooked_black_beans` |
| `white_beans` | `dried_white_beans`, `cooked_white_beans` |
| `lentils` | `red_lentils_pressure`, `red_lentils_simmer`, `green_lentils`, `brown_lentils` |

Invariants:
- Group tags and ingredient IDs are disjoint, so any `IngredientRef` token resolves unambiguously.
- Every group has at least one member.
- Group membership is derived deterministically from the catalog; it is not maintained per build.

### Flow

```text
ingredients.json
      │
      ▼
Ingredient Catalog ──────────────┐
      │                          │
      ▼                          ▼
Ingredient Library UI       Build Store ◄──── Persistence Adapter
      │                          │
      └──── add/remove/update ───┘
                                 │
                                 ├────────► Stage Timeline UI
                                 │
                                 ├────────► Analysis Engine
                                 │                │
                                 │                ├────► warnings / suggestions
                                 │                └────► role and cuisine scores
                                 │
                                 └────────► Instruction Generator
                                                  │
                                                  ▼
                                           Build Summary UI
```

The ingredient catalog is immutable at runtime in the MVP. The build store owns all mutable application state. Analysis and instruction generation are pure computations over the catalog and current build.

## Interaction Model

### User Actions

- Browse ingredients by category tab, or search by name.
- Click an ingredient to open it in the Detail column.
- Place the inspected ingredient into a chosen cooking stage (its default stage is suggested).
- Move a placed ingredient to another stage, or remove it.
- Set an optional quantity and unit.
- Set pressure and natural-release times.
- Review balance, cuisine affinities, warnings, and suggestions in the Analysis column.
- Save, duplicate, rename, delete, import, or export a build.
- Copy generated cooking instructions.

### UI States

- **Empty Build** — no ingredients placed; the app emphasizes browsing and starter suggestions.
- **Browsing** — a category tab is active, listing its ingredients.
- **Ingredient Detail Open** — the center Detail column shows full metadata plus stage-placement controls for the selected ingredient; clicking within the Library or pressing Escape closes it.
- **Editing Build** — ingredients are being placed, moved between stages, or removed.
- **Saved Builds View** — local builds are listed and can be restored.
- **Import Error** — imported JSON fails schema validation.

### Layout Zones

Desktop layout — four equal-width columns:

```text
Header: app name · build name · save / import / export
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Library     │ Detail      │ Cooking     │ Analysis    │
│ category    │ selected    │ Timeline    │ balance     │
│ tabs +      │ ingredient  │ (vertical:  │ cuisine     │
│ ingredient  │ + place-in- │ 8 stages,   │ warnings /  │
│ list        │ stage chips │ canonical   │ suggestions │
│             │             │ order)      │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
click ingredient → Detail → pick stage → Timeline
```

The four columns are equal width. The Cooking Timeline is a vertical list of the eight stages in canonical order (not a horizontal board), even on desktop; each placed card shows the ingredient name and its cook-time range. Mobile stacks the four columns vertically in the same order.

### Composer Flow (Phase 3 contract)

- **Browse → inspect → place → assess**, left to right across the four columns.
- **Library** groups ingredients by `category` tabs; a name search filters the list. Card faces stay compact — name plus a salt-risk flag; full metadata lives in Detail.
- Clicking a library ingredient loads it into the **Detail** column, which shows roles, traits, balance scores (as labeled bars), cuisines, salt risk, cook time, pairs/avoid, and notes, plus a **place-in-stage** control.
- The ingredient's default `stage` is suggested, but the user **picks the target stage explicitly**. Choosing a stage places the ingredient — or moves it if already in the build — and returns to Browsing. Clicking within the Library, or pressing Escape, dismisses the open Detail card.
- **Placement is click + keyboard for the MVP; no drag is required.** Every place, move, and remove action is reachable by pointer and keyboard (tab to a card/chip/stage, Enter/Space to activate, Escape to cancel). Drag-and-drop, if added later, is layered on top and never the only path (see Escalation Triggers).
- **Stage placement is unconstrained:** any ingredient may go in any stage; the default is only a suggestion, and intentional overrides surface warnings in Analysis rather than being blocked (see Provisional Contracts: Stage override policy).
- **Analysis** recomputes on every change: balance as presence-summed axis bars (no quantity weighting), ranked cuisine affinity (excluding `universal`, no percentages), and deterministic warnings/suggestions.
- Visual language (color, typography, spacing) is out of scope here and deferred to Phase 6 polish.

## Public API

The MVP is a browser application rather than a published library, but internal module boundaries should expose these stable functions.

### Catalog Access

```ts
getIngredient(id: IngredientId): Ingredient | undefined
listIngredients(filters?: CatalogFilter): Ingredient[]
// CatalogFilter = { stage?: string; category?: string }
```

Guarantees:
- Returned ingredient objects conform to the catalog schema.
- `listIngredients` is deterministic for identical filters.
- Catalog consumers do not mutate returned records.

### Build Mutation

```ts
addIngredient(build: StewBuild, ingredientId: IngredientId, catalog: readonly Ingredient[]): StewBuild
removeIngredient(build: StewBuild, ingredientId: IngredientId): StewBuild
moveIngredient(
  build: StewBuild,
  ingredientId: IngredientId,
  stage: CookingStage
): StewBuild
updateBuildIngredient(
  build: StewBuild,
  ingredientId: IngredientId,
  patch: Partial<Pick<BuildIngredient, "quantity" | "unit" | "stage">>
): StewBuild
```

Guarantees:
- Functions return a new build value; they do not mutate their input.
- `addIngredient` takes the catalog to resolve an ingredient's default stage and reject unknown IDs; the UI binds the catalog via the store (see D-15), so components call a two-argument form. `removeIngredient`, `moveIngredient`, and `updateBuildIngredient` validate against the build and need no catalog.
- Unknown ingredient IDs produce a typed error.
- The same ingredient ID appears at most once in a build in the MVP.

### Analysis

```ts
analyzeBuild(build: StewBuild, catalog: Ingredient[]): AnalysisResult
```

Guarantees:
- Pure and deterministic.
- Does not perform network requests.
- Cuisine scores are affinity scores, not claims of authenticity.
- Warnings explain likely effects rather than declaring combinations invalid unless the imported data is structurally invalid.

### Instruction Generation

```ts
generateInstructions(
  build: StewBuild,
  catalog: Ingredient[],
  analysis: AnalysisResult
): GeneratedRecipe
```

`GeneratedRecipe` contains an ordered array of instruction steps plus a plain-text rendering.

Guarantees:
- Steps follow the canonical stage order.
- Ingredient notes may add handling text but do not reorder stages.
- Missing quantities are omitted rather than invented.

### Persistence

```ts
saveBuild(build: StewBuild): void
loadBuild(id: string): StewBuild | undefined
listSavedBuilds(): SavedBuildRecord[]
deleteBuild(id: string): void
exportBuild(build: StewBuild): string
importBuild(json: string): StewBuild
```

Guarantees:
- Imported data is schema-validated before entering the build store.
- Unknown ingredient IDs cause an import error listing the missing IDs.
- Storage failures surface as user-visible errors and do not silently discard the current build.

## State

- **Ingredient catalog:** static JSON bundled with the application; immutable at runtime.
- **Current build:** in-memory application state owned by the Build Store.
- **Pantry selections:** in-memory state persisted to `localStorage`.
- **Saved builds:** serialized `StewBuild` records in `localStorage`.
- **Derived analysis:** computed from the current build and not persisted.
- **UI state:** search text, active filters, open detail panel, and selected saved build remain local to the UI layer.

No server, account system, database, or cross-device synchronization exists in the MVP.

## Analysis Rules

### Balance Scoring

Each ingredient contributes small integer values to one or more balance axes. Roles and traits are never summed. The MVP uses manually curated directional scores, not nutritional or scientific measurements.

Example:

```json
{
  "id": "lemon_juice",
  "roles": ["acid", "freshener", "seasoning"],
  "traits": ["citrusy"],
  "balanceScores": { "acidity": 5, "freshness": 4, "aromatic_intensity": 2 },
  "saltRisk": "low"
}
```

The engine sums selected ingredient `balanceScores` without quantity weighting in the first release. Quantity-aware scoring is deferred.

### Cuisine Affinity

Cuisine affinity is computed from `cuisineWeights` where present, otherwise from a default weight of `1` for each `cuisines` tag.

Spices, aromatics, and finishers may carry higher weights than neutral bulk ingredients. For example, white beans contribute weak Italian and French affinity; rosemary, Parmesan rind, and lemon contribute stronger evidence.

The UI presents ranked scores such as:

```text
Italian             11
French               7
Mediterranean        5
```

It does not present percentages or claims of authenticity.

#### Cuisine Vocabulary

`CuisineTag` is a closed vocabulary of 18 regional tags. The raw catalog's free-form cuisine strings are consolidated into these tags during catalog normalization:

| Closed tag | Consolidated from |
|---|---|
| `universal` | generic, universal |
| `french` | french |
| `italian` | italian |
| `mediterranean` | mediterranean |
| `iberian` | spanish, portuguese |
| `mexican` | mexican |
| `latin_american` | caribbean, brazilian, andean_inspired |
| `american` | american, southern, cajun |
| `central_european` | central_european, hungarian, belgian |
| `eastern_european` | eastern_european, jewish |
| `british` | british |
| `scandinavian` | scandinavian, northern_european |
| `middle_eastern` | middle_eastern |
| `north_african` | moroccan |
| `west_african` | west_african |
| `indian` | indian, south_asian |
| `east_asian` | chinese, japanese, korean, asian |
| `southeast_asian` | thai, vietnamese, southeast_asian |

Consolidation happens once, when the CSV catalog is converted to validated JSON. Any cuisine string outside this mapping is a catalog-vocabulary-drift error.

### Pairing and Avoidance

`pairsWith` and `avoidWith` entries are `IngredientRef` values — each is either an ingredient ID or a group tag (see Groups).

- An ID entry matches when that exact ingredient is also selected.
- A group entry matches when any selected ingredient belongs to that group.
- Each matched `pairsWith` relationship adds a small positive synergy score.
- Each matched `avoidWith` relationship emits a caution, not a hard prohibition.
- A reference counts once even if both a group and one of its members would match the same selected ingredient.
- Pairing edges are directional in the data but treated as symmetric by the MVP analysis engine.

### Timing

Each ingredient with `cookMinutes` is compared with the selected pressure time.

- Below range: likely undercooked.
- Within range: appropriate.
- Above range: likely to soften, shred, or dissolve.

The warning text should describe the expected result. It should not call the build invalid merely because the user intentionally wants a broken-down texture.

### Initial Rule Set

The MVP should include deterministic rules for at least these cases:

- High richness with low acidity or freshness suggests acid or fresh herbs.
- Legume + grain + multiple roots warns about excessive body/starch.
- High aggregate salt risk (generic heuristic: total SALT_RISK_SCORE >= 3) warns about over-salting. This is the salt-load heuristic; specific cured-protein gating was considered but deferred (see D-34).
- Dried beans plus acidic tomato ingredients warns that old beans may soften slowly.
- No selected greens and low freshness suggests spinach, peas, herbs, or scallions.
- Miso in a pre-finish stage suggests moving it to `finish`.
- Spinach in `pressure` suggests moving it to `stir_in`.
- Couscous in the pot suggests moving it to `serve_over`.
- Selected pressure time beyond a quick-cooking ingredient's range reports the likely texture change.

## Generated Instruction Contract

Instruction generation uses the fixed stage order:

```text
brown
aromatics
deglaze
pressure
simmer_after
stir_in
finish
serve_over
```

Each non-empty stage emits one or more instructions. Ingredient notes can supply short clauses such as:

- “Remove the ham hock, discard the bone, and return the meat.”
- “Dissolve miso in hot broth before stirring it back into the pot.”
- “Prepare couscous separately and serve the stew over it.”

The generator must not invent quantities, temperatures, or cooking times absent from the build or ingredient data.

## Inputs the Insta the Pot MVP Does Not Handle

- **Nutritional analysis** — no calorie, macro, allergen, or dietary-compliance calculations.
- **Food-safety guarantees** — the app offers cooking guidance but does not certify safe internal temperatures or storage practices.
- **Automatic quantity scaling** — servings and quantities may be recorded, but the MVP does not calculate ratios automatically.
- **Ingredient substitutions** — suggestions may identify complementary ingredients but do not guarantee one-to-one substitutions.
- **Authenticity classification** — cuisine scores are affinity hints, not cultural or culinary certification.
- **User-authored catalog entries** — the initial catalog is shipped with the app and is not editable through the UI.
- **Network-backed features** — no accounts, cloud sync, social feed, price lookup, shopping integration, or AI generation.
- **Competitive card-game rules** — the visual card metaphor is used, but scoring for gameplay is outside the MVP.

## Testing Strategy

- **Catalog schema tests** — every ingredient record has a valid ID, category, stage, controlled roles, traits, balance axes, salt risk, controlled cuisines, and valid references.
- **Catalog integrity tests** — no duplicate IDs; every `pairsWith`/`avoidWith` entry resolves to a known ingredient ID or group tag; group tags and IDs are disjoint; every group has at least one member.
- **Build reducer tests** — add, remove, move, update, duplicate prevention, and unknown-ID errors.
- **Analysis unit tests** — balance totals, cuisine weighting, pairings, warnings, and timing findings.
- **Instruction tests** — canonical stage order, empty-stage omission, note handling, and no invented quantities.
- **Persistence tests** — round-trip save/load/export/import and invalid-schema rejection.
- **Component tests** — filtering, card selection, lane placement, warning display, and saved-build restoration.
- **One end-to-end test** — create a chicken, roots, barley, spinach, lemon build; save it; reload; verify generated instructions and expected warnings.

## Escalation Triggers

- **Catalog vocabulary drift** — PLAN or EXECUTE halts if implementation introduces category, stage, role, trait, balance-axis, salt-risk, cuisine, or group strings not present in the controlled vocabularies. Recovery: amend this contract and catalog schema deliberately, then update tests.
- **Analysis becomes non-deterministic** — EXECUTE halts if identical builds can produce different scores, warnings, or instructions. Recovery: remove hidden state or random behavior and add a regression test.
- **Drag-and-drop accessibility conflict** — EXECUTE halts if the chosen interaction cannot be completed using click/tap and keyboard controls. Recovery: implement a non-drag selection path before proceeding.
- **Persistence format breakage** — EXECUTE halts if a catalog or schema change makes previously exported builds unreadable without a migration decision. Recovery: add versioning/migration or explicitly reset the format before release.
- **Rule explosion** — PLAN halts if a phase requires a general-purpose rules DSL or inference engine to implement the agreed MVP rules. Recovery: reduce the rule set to explicit TypeScript functions and defer generalized authoring.
- **Quantity logic leaks into MVP scoring** — PLAN halts if balance or cuisine analysis requires reliable unit conversion or serving normalization. Recovery: keep scoring presence-based and defer quantity weighting.

## Coupling Notes

- **Ingredient Catalog ↔ Analysis Engine:** intentionally tight at the schema level. The analysis engine depends on catalog balance scores, salt risk, cuisine weights, pairings, and timing ranges. Schema changes require coordinated tests.
- **Build Store ↔ UI:** moderate coupling. UI components read and update the current build but should not implement analysis rules themselves.
- **Analysis Engine ↔ Instruction Generator:** loose. Instructions may consume timing findings and warnings, but both remain pure functions over the same build.
- **Persistence Adapter ↔ Build Schema:** tight. Exported builds should carry a schema version from the first release.
- **Drag-and-drop library ↔ Stage Timeline UI:** isolated. The timeline contract should support adding and moving cards without exposing library-specific event types to the build store.

## Provisional Contracts

- **Balance-axis scores** — initial numeric values are heuristic and will be tuned through real stew builds. Resolve during Phase 4 by reviewing at least ten representative builds.
- **Cuisine weights** — scoring weights are provisional until the ingredient catalog contains enough spices and finishers to avoid bulk-ingredient bias. Resolve during Phase 4.
- **Duplicate ingredient policy** — MVP permits only one row per ingredient ID in a build. Revisit if users need the same ingredient in multiple stages, such as bacon rendered early and reserved for finishing.
- **Stage override policy** — the catalog stage is a default. The MVP may initially use constrained placement, but the long-term UI should permit intentional overrides with warnings. Resolve during Phase 3 usability testing.

## Technique-First Redesign (v2) — Phases 7–10

> Status: planned (Phases 7–10, Build). This section is the **v2 contract** and
> **supersedes** the v1 interaction model where they conflict: D-18 (four-column
> Library→Detail→Timeline→Analysis), D-19 (select-to-detail placement), D-20
> (card/detail split), and D-33 (v1 layout reconciliation). It **re-activates**
> D-3 and D-35 (see below), **absorbs FU-2** (mobile shell + visual language),
> and keeps **FU-3 deferred** — v2 does not re-add a pressure input.
>
> Worker references: `design v2.md` (full narrative) and
> `design/ui-spike-v2.html` (interactive layout + behavior mockup). The mockup is
> the visual/interaction source of truth; this section is the contract.

### Concept

The app becomes a **technique-first cooking workbench**: choose a cooking
technique → optionally a cuisine direction → then work a technique-specific
timeline where each step offers **ranked ingredient suggestions** based on cuisine
fit, balance, cook-time compatibility, and what is already selected. MVP registers
**braise/stew only**; the model is data-driven so curry/pasta/tacos are drop-in
later.

### Data model changes

- **Technique** owns the timeline (re-activates D-3 — stage is no longer a single
  global vocabulary):
  ```ts
  interface Technique { id: string; name: string; steps: CookingStep[]; }
  interface CookingStep { id: string; label: string; timing: "short" | "medium" | "long" | "finish"; longCook?: boolean; }
  ```
  Braise reuses the current 8 `CookingStage` ids so the existing catalog needs no
  re-authoring: brown, aromatics, deglaze, pressure (label "Oven / pressure cook",
  `longCook`), simmer_after, stir_in, finish, serve_over.
- **Ingredient** gains **`compatibleSteps: string[]`** — the steps an ingredient
  may appear in. For braise MVP, derive step-appropriateness from the existing
  single `stage` (which stays as the default/suggested step). The step picker
  shows **only step-appropriate** ingredients.

### Suggestion & scoring engine (re-activates D-35; supersedes D-32)

Pure, deterministic module (no React, no randomness — the non-determinism halt
trigger still applies; explicit TS functions, **no rules DSL**). For the selected
step it ranks step-appropriate, not-yet-placed ingredients:

- **Context = the already-selected ingredients** — no separate "anchor" feature;
  the first picks naturally drive scoring.
- **Dimensions:** ⚖ balance/pairing compatibility (fills low axes, penalizes
  overloading high axes; `pairsWith` matches boost, `avoidWith` matches caution),
  🍽 cuisine fit (soft boost when the chosen cuisine matches — **never a filter**),
  ⏱ timing fit (**only at the long-cook step**, judged against the longest
  currently-selected ingredient's cook window; delicate items that would dissolve
  are cautioned; **no user pressure input**, so FU-3 stays deferred).
- **Output:** three buckets **Top / Okay / Fallback** plus per-item reason tags.
  Rows show reason **icons**; the full contextual "why" renders dynamically in the
  Detail card.
  ```ts
  type Reason = "cuisine" | "balance" | "timing" | "caution";
  interface Suggestion { ingredientId: string; bucket: "top" | "okay" | "fallback"; reasons: Reason[]; notes: string[]; cautions: string[]; score: number; }
  ```
- Bucket thresholds and dimension weights are **provisional** — tune against
  fixture builds (as in Phase 4), do not hand-wave.

### Interaction model & layout (supersedes D-18/D-19/D-20)

Per `design/ui-spike-v2.html`:

- **Top strip:** title · technique selector · optional cuisine selector · How ·
  load/save/clear · Recipe.
- **Columns:** Timeline · Step picker · Detail · Balance. Selecting a timeline
  step drives the picker; tapping a placed chip opens its Detail. Picker rows are
  single-line (add(+) · category · name · reason icons · cook · detail); add is
  inline, row/detail opens the Detail card. Detail is dynamic: "why it appears
  here" + cautions + best step + good-with + Add-to-step.
- **Responsive:** wide (≥1600) = 4 equal columns with Balance + legend stacked in
  the 4th; laptop (768–1599) = 3 equal columns with Balance + legend as a
  full-width bottom strip; mobile (<768) = one panel at a time (Timeline/Step/
  Detail tabs) + Balance as a persistent bottom bar, and adding an ingredient
  returns to Timeline. Placement stays **click + keyboard** (drag remains out; the
  accessibility halt trigger still applies).

### Balance panel

Global, always-visible per-axis bars **plus** a translation into cooking language
(e.g. "This may become thick and heavy. Caused by: … Try: …"), a high/low summary,
actionable "Try:" finisher chips, and a step-aware note (e.g. "add lemon at
Finish, not here"). Presence-summed axes only — the quantity halt trigger still
holds.

### Visual system

Category color coding for the 11 categories, applied consistently to picker rows,
chips, and the legend; reason-icon badges (🍽 ⚖ ⏱ ⚠). A persistent **legend**
documents both the reason icons and the category colors.

### Persistence (re-activates the versioning contract)

Bump `schemaVersion` and add a **migration**: legacy v1 builds (single `stage` per
ingredient, `pressureMinutes`/`naturalReleaseMinutes`) load as the **braise**
technique with each ingredient's `stage` mapped to the matching braise step. Do
not break previously exported builds (persistence-format halt trigger).

## Implementation Sequence

| # | Module / Phase | Description | Regime | Depends on | Status |
|---|---|---|---|---|---|
| 1 | Project Bootstrap | Create the React + TypeScript + Vite application, test harness, controlled vocabularies, schema types, runtime schema validation, and an offline CSV→JSON catalog build step proven on a small validated ingredient fixture. | Build | — | Complete |
| 2 | Catalog and Build Core | Run the CSV→JSON build step on the full ingredient catalog to produce the bundled `ingredients.json`, implement the catalog loader and validation, immutable build operations, and local in-memory store. Deliver a text-only or minimally styled build editor proving catalog → build flow. | Build | Project Bootstrap | Complete |
| 3 | Interactive Composer | Implement ingredient search/filtering, card presentation, stage timeline, add/remove/move interactions, ingredient detail view, and accessible non-drag controls. | Build | Catalog and Build Core | Complete |
| 4 | Analysis and Guidance | Implement role scoring, cuisine affinity, pairing logic, timing findings, initial warning rules, and suggested-next-ingredient ranking. Validate against representative builds from the original cooking discussion. | Build | Interactive Composer | Complete |
| 5 | Instructions and Persistence | Generate ordered cooking instructions, add pressure/release controls, implement local save/load and JSON import/export, and add schema versioning. | Build | Analysis and Guidance | Complete |
| 6 | MVP Polish and Validation | Complete responsive layout, accessibility pass, catalog expansion to 50–80 ingredients, end-to-end tests, and operator review of real generated stew builds. | Refine | Instructions and Persistence | Complete |
| 7 | Technique & Schema Foundation | Introduce the `Technique`/`CookingStep` model (braise registered as the sole technique) and ingredient `compatibleSteps`/step-appropriateness; update the CSV→JSON converter and load-time validation to emit/validate the new field; keep the app building and tests green. See Technique-First Redesign (v2). | Build | MVP Polish and Validation | Complete |
| 8 | Suggestion & Scoring Engine | Pure, deterministic `scoreStep` → Top/Okay/Fallback buckets with reason tags (cuisine / balance / timing-vs-longest / caution); fixture builds to tune provisional weights and thresholds. Re-activates D-35. | Build | Technique & Schema Foundation | Complete |
| 9 | Technique-First Composer UI | 4-column responsive layout, technique/cuisine selectors, timeline, ranked single-line step picker, dynamic Detail, balance-in-cooking-language, and the category color system + legend — built to `design/ui-spike-v2.html`. Supersedes D-18/D-19/D-20. | Build | Suggestion & Scoring Engine | Planned |
| 10 | Persistence Migration, Instructions & E2E | `schemaVersion` bump + v1→braise migration, technique-aware generated method, responsive/a11y pass, and an end-to-end test of the new technique-first flow. | Build | Technique-First Composer UI | Planned |

### Phase 1: Project Bootstrap

- Define all controlled vocabularies and core TypeScript types.
- Add runtime schema validation for ingredient JSON.
- Build an offline CSV→JSON catalog step that converts `insta_the_pot_ingredients_v2.csv` into a bundled `ingredients.json`. It must:
  - split the `;`-delimited `roles`, `traits`, `cuisines`, `pairs_with`, and `avoid_with` cells into arrays;
  - parse the quoted `balance_scores` JSON into `balanceScores`;
  - omit `cookMinutes` when `cook_min`/`cook_max` are blank;
  - classify each `pairs_with`/`avoid_with` token as a `GroupTag` (when it matches the group vocabulary) or otherwise an `IngredientId`;
  - fail on vocabulary drift, unresolved references, or a group-tag/ID namespace collision.
- Prove the converter and validator on a seed fixture of 10–15 representative ingredients spanning every stage.
- Establish unit-test and component-test tooling.

### Phase 2: Catalog and Build Core

- Run the Phase 1 converter on the full `insta_the_pot_ingredients_v2.csv` (119 ingredients) to generate the bundled `ingredients.json`, and load the catalog from that artifact.
- Treat the generated `ingredients.json` as a build output, not a hand-edited file; the CSV remains the source of truth.
- Implement immutable build functions and the central store.
- Validate all pair/avoid references and group memberships at load time.
- Render a simple build summary grouped by stage.

### Phase 3: Interactive Composer

- Implement click-to-add before drag-and-drop.
- Add drag-and-drop only after the stage-lane model works through keyboard and pointer controls.
- Keep cards compact; full metadata belongs in a detail panel.

### Phase 4: Analysis and Guidance

- Use explicit TypeScript rules, not a generalized rule language.
- Include at least ten fixture builds covering heavy, bright, bean-forward, root-forward, French-affinity, Mexican-affinity, and Japanese-affinity cases.
- Tune heuristic scores only when fixture expectations are documented.

### Phase 5: Instructions and Persistence

- Add `schemaVersion` to exported builds.
- Treat generated instructions as deterministic output from stage order and notes.
- Do not add AI or free-form recipe prose in this phase.

### Phase 6: MVP Polish and Validation

- Confirm mobile stage stacking.
- Confirm every card operation has a keyboard/click alternative.
- Cook or retrospectively evaluate several builds generated by the app and record mismatches as catalog or rule corrections.

The following punch list was surfaced by the end-of-phase-5 architecture review. Items marked ✓ were resolved in the Phase 6 review pass.

**Analysis rule corrections (contract drift):**
- ✓ Salt warning: amended to generic salt-load heuristic (`saltScore >= 3`); ARCHITECTURE.md Initial Rule Set updated to match. See D-34.
- ✓ Richness warning/suggestion: changed to OR-branch (`richness >= 4 && (freshness <= 2 || acidity <= 2)`), predicate extracted to `isRichAndLow` variable to eliminate duplication.

**Suggested-next-ingredient ranking:**
- Retired (supervised): the two condition-driven suggestions were folded into their warnings, then the suggestions output was removed entirely (IngredientSuggestion type, AnalysisResult.suggestions, addSuggestion, and the Advisories render branch). Ranked suggestions, if wanted later, are a fresh feature - not dormant scaffolding. Supersedes D-35.

**Layout reconciliation to the Composer Flow contract (D-18):**
- ✓ `App.tsx` folded to four columns: InstructionsPanel now renders inside the Analysis column wrapper; CSS grid updated to `repeat(4, minmax(0, 1fr))`; SavedBuildsPanel spans all columns below the main grid.
- Layout has since evolved (supervised, post-Phase-6): the Analysis column was split into separate Balance / Cuisine / Advisories cards, and the grid uses explicit responsive presets - 1 column (phone) / 3 columns (laptop) / 4 columns (>=1600px, with the analysis cards grouped into the 4th) - in `styles.css`. Generated Instructions, saved-builds (Load), and How now open as modal dialogs rather than columns; SavedBuildsPanel is no longer a full-width row. See commits 6e717f9 / 5c38cf8.
- Pressure/release controls remain in BuildSummary (Timeline column) — relocating to Detail deferred (see D-36).

**UI display:**
- ✓ Library card salt badge now renders only for `high` salt risk ingredients.

**Validation (real-browser smoke check):**
- Done (supervised): added `npm run smoke` (`scripts/smoke.mjs`) - builds with the deploy base, serves `dist/`, and asserts the page + referenced JS asset load correctly, catching the base-path blank-page class. A jsdom App-mount test also guards against mount crashes. Full headless-browser assertions (Playwright) remain out of scope.

**Accessibility pass:**
- ✓ Added `role="tabpanel"` and `aria-controls` to complete the tab pattern in IngredientLibrary.
- Click-within-Library dismisses Detail: deferred (see D-36).
- Focus return after Detail close and saved-build restore: deferred (see D-36).

**Test-coverage gaps:**
- localStorage quota test, pairing dedup test, OR-branch test: deferred (see D-36).

**Minor code-quality cleanups:**
- ✓ `InstructionsPanel` now accepts memoized `analysis` prop instead of recomputing.
- Done (supervised): `STAGE_LABELS` extracted to a shared constant in `types.ts` (was duplicated in `BuildSummary`/`InstructionsPanel`); `saveBuild` now writes the blob then the index and rolls the blob back if the index write fails, so a failed save cannot orphan a stored build.

### Phase 7: Technique & Schema Foundation

- Add the `Technique` / `CookingStep` model and register braise (8 steps reusing
  the current `CookingStage` ids; `pressure` is the `longCook` step labelled
  "Oven / pressure cook").
- Add `compatibleSteps` to the ingredient schema; for braise, derive
  step-appropriateness from the existing `stage` (default = suggested step).
- Update the CSV→JSON converter + zod validation to emit/validate
  `compatibleSteps`; `ingredients.json` stays a build output (never hand-edited).
- No UI change beyond keeping the app building; migrate/extend existing tests to
  the new schema.

### Phase 8: Suggestion & Scoring Engine

- Implement pure `scoreStep(step, build, catalog, cuisine)` → ranked
  `Suggestion[]` with Top/Okay/Fallback buckets and reason tags, per the v2
  Scoring contract.
- Timing is scored only at the long-cook step, against the longest selected
  ingredient — no pressure input.
- Add fixture builds + expected buckets; tune provisional weights/thresholds
  before closing (as in Phase 4).

### Phase 9: Technique-First Composer UI

- Build the 4-column responsive layout, technique/cuisine selectors, timeline,
  ranked single-line step picker (reason icons), dynamic Detail card, and the
  balance-in-cooking-language panel with category colors + legend — to
  `design/ui-spike-v2.html`.
- Keep placement click + keyboard; wire chip→Detail, add→place, and mobile
  return-to-Timeline after adding.

### Phase 10: Persistence Migration, Instructions & E2E

- Bump `schemaVersion`; migrate v1 builds to the braise technique (map
  `stage`→step); round-trip import/export.
- Make the generated method technique-aware (canonical step order for the active
  technique).
- Responsive/a11y pass; one end-to-end test of the new technique-first flow.

## Key Decisions

D-1: Single-Document Architecture
Date: 2026-07-09 | Status: Closed
Decision: Use Pattern B with one `ARCHITECTURE.md` and vertical implementation phases.
Rationale: The MVP is a small client-side app whose UI, build state, catalog, and deterministic analysis are tightly related. Separate module contracts would add ceremony without enabling independent implementation.
Revisit if: The analysis engine, catalog tooling, or persistence layer becomes independently reusable or separately deployed.

D-2: Static Catalog First
Date: 2026-07-09 | Status: Closed
Decision: Ship the ingredient catalog as validated static JSON bundled with the app.
Rationale: The proof of concept needs curated data and deterministic behavior, not catalog administration or a backend.
Revisit if: Users need to author ingredients, sync catalogs, or receive catalog updates without application deployment.

D-3: Stage Is a First-Class Field
Date: 2026-07-09 | Status: Closed
Decision: Each distinct ingredient record stores one default cooking stage. Different physical forms, such as fresh versus dried mushrooms or dried versus cooked beans, are separate ingredient records.
Rationale: Stage is operationally useful and generic. Adding a separate technique model would over-engineer the MVP; exceptional handling belongs in notes.
Revisit if: A substantial fraction of ingredients require multiple equally common stages and separate records become unmanageable.

D-4: Lists for Multi-Valued Metadata
Date: 2026-07-09 | Status: Closed
Decision: `roles`, `cuisines`, `pairsWith`, and `avoidWith` are arrays in canonical data.
Rationale: Ingredients have multiple simultaneous roles and affinities. Comma-separated table text is only a human-readable rendering.
Revisit if: Never; this is a structural data requirement.

D-5: Deterministic Rules Before AI
Date: 2026-07-09 | Status: Closed
Decision: Use explicit scoring and rule functions for balance, cuisine affinity, warnings, and instructions.
Rationale: The application must be understandable, testable, offline-capable, and cheap to run. The MVP's value is the encoded cooking model, not generated prose.
Revisit if: Deterministic suggestions are validated and users request conversational explanation or novel recipe generation.

D-6: Cuisine as Affinity, Not Classification
Date: 2026-07-09 | Status: Closed
Decision: Score overlapping cuisine affinities using weighted tags and present ranked scores without percentages.
Rationale: Ingredients such as white beans belong to several traditions, and a single ingredient should not classify a dish. Spices and finishers provide stronger evidence than neutral bulk ingredients.
Revisit if: The product develops authored cuisine profiles with explicit required and excluded combinations.

D-7: No Backend for MVP
Date: 2026-07-09 | Status: Closed
Decision: Use browser local storage for pantry state and saved builds.
Rationale: It minimizes implementation cost and allows the interaction model to be validated before accounts or synchronization.
Revisit if: Shareable URLs, multi-device use, public builds, or collaborative editing become core requirements.

D-8: Card Metaphor Without Game Mechanics
Date: 2026-07-09 | Status: Closed
Decision: Use draggable ingredient cards and stage lanes as the primary visual model, but do not implement competitive or collectible-game mechanics in the MVP.
Rationale: Cards make ingredient properties and composition tangible; game rules would distract from validating the stew-planning tool.
Revisit if: Users consistently engage with balance scoring as play and request challenges, drafting, or printable decks.

D-9: Roles, Traits, and Balance Axes Are Distinct Vocabularies
Date: 2026-07-10 | Status: Closed
Decision: Model `roles` and `traits` as unscored categorical vocabularies and score only the 10 `BalanceAxis` values. Add `traits` and `saltRisk` as first-class ingredient fields.
Rationale: The curated catalog data separates categorical tagging from numeric scoring. An earlier draft of this document collapsed them into a single scored `Role` type that referenced axes and invented values (e.g. `brightness`) absent from the data. Aligning the schema to the data keeps analysis deterministic and testable.
Revisit if: Scoring must attach to roles or traits directly, or a balance axis must become categorical.

D-10: Closed, Consolidated Cuisine Vocabulary
Date: 2026-07-10 | Status: Closed
Decision: `CuisineTag` is a closed vocabulary of 18 regional tags. The raw catalog's ~33 free-form cuisine strings are consolidated into these tags via the mapping in Cuisine Affinity.
Rationale: An open cuisine set undermines the controlled-vocabulary guarantee, bloats the cuisine filter UI, and biases affinity scoring. A compact regional bucketing keeps filtering and affinity meaningful without claiming authenticity.
Revisit if: A build needs finer regional distinctions, or authored cuisine profiles with required/excluded ingredients are introduced.

D-11: Group References in Pairings
Date: 2026-07-10 | Status: Closed
Decision: `pairsWith`/`avoidWith` entries are `IngredientRef` values — either an ingredient ID or a `GroupTag` from a closed group vocabulary. A group entry matches when any selected ingredient belongs to that group. Group tags and ingredient IDs share a disjoint namespace, so bare tokens resolve unambiguously without a prefix.
Rationale: Many curated relationships target a family ("pairs with any root," "avoid other salty proteins") rather than a specific ingredient. Enumerating every member in each list is verbose and drifts as the catalog grows; a small controlled group vocabulary with deterministic, category- or list-based membership captures the intent while keeping analysis pure and testable.
Revisit if: Groups need overlapping or user-defined membership, or per-quantity threshold semantics ("pairs with two or more roots").

## Extension Points

- **Printable deck:** render catalog records as physical cards once the metadata and interaction model stabilize.
- **Game mode:** add drafting, constraints, challenges, or cooperative scoring without changing the underlying ingredient schema.
- **Quantity-aware analysis:** add normalized measures and serving ratios after presence-based scoring proves useful.
- **Catalog editor:** allow expert users to add or tune ingredients and rules.
- **Cloud sharing:** add accounts, synchronization, and public build links.
- **Other one-pot methods:** reuse the stage-and-role model for Dutch ovens, clay pots, slow cookers, or stovetop soups.
- **Recipe capture:** allow a completed build to record photos, tasting notes, and post-cook adjustments.

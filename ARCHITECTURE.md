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

- Browse or search ingredients.
- Filter ingredients by category, stage, cuisine, or pantry availability.
- Add an ingredient to the current build.
- Drag or move a selected card between valid stage lanes.
- Remove an ingredient from the build.
- Set an optional quantity and unit.
- Set pressure and natural-release times.
- Inspect an ingredient card's details.
- Review balance, cuisine affinities, warnings, and suggestions.
- Save, duplicate, rename, delete, import, or export a build.
- Copy generated cooking instructions.

### UI States

- **Empty Build** — no ingredients selected; the app emphasizes browsing and starter suggestions.
- **Editing Build** — cards are being added, removed, reordered, or moved between stages.
- **Ingredient Detail Open** — a side panel or modal shows full metadata for one ingredient.
- **Saved Builds View** — local builds are listed and can be restored.
- **Import Error** — imported JSON fails schema validation.

### Layout Zones

Desktop layout:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Header: app name, build name, save/import/export                    │
├───────────────────────┬──────────────────────────────────────────────┤
│ Ingredient Library    │ Cooking Timeline                             │
│ search + filters      │ Brown → Aromatics → Deglaze → Pressure ... │
│ card grid             │ staged ingredient cards                     │
├───────────────────────┴──────────────────────────────────────────────┤
│ Analysis: balance | cuisine | timing | warnings | suggestions       │
├──────────────────────────────────────────────────────────────────────┤
│ Generated Instructions                                               │
└──────────────────────────────────────────────────────────────────────┘
```

Mobile layout stacks the same zones vertically. Stage lanes become vertically ordered sections rather than a horizontally scrolling board.

## Public API

The MVP is a browser application rather than a published library, but internal module boundaries should expose these stable functions.

### Catalog Access

```ts
getIngredient(id: IngredientId): Ingredient | undefined
listIngredients(filters?: IngredientFilters): Ingredient[]
```

Guarantees:
- Returned ingredient objects conform to the catalog schema.
- `listIngredients` is deterministic for identical filters.
- Catalog consumers do not mutate returned records.

### Build Mutation

```ts
addIngredient(build: StewBuild, ingredientId: IngredientId): StewBuild
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
- Ham hock or smoked sausage plus stock, miso, or Parmesan warns about salt.
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

## Implementation Sequence

| # | Module / Phase | Description | Regime | Depends on | Status |
|---|---|---|---|---|---|
| 1 | Project Bootstrap | Create the React + TypeScript + Vite application, test harness, controlled vocabularies, schema types, runtime schema validation, and an offline CSV→JSON catalog build step proven on a small validated ingredient fixture. | Build | — | Not started |
| 2 | Catalog and Build Core | Run the CSV→JSON build step on the full ingredient catalog to produce the bundled `ingredients.json`, implement the catalog loader and validation, immutable build operations, and local in-memory store. Deliver a text-only or minimally styled build editor proving catalog → build flow. | Build | Project Bootstrap | Not started |
| 3 | Interactive Composer | Implement ingredient search/filtering, card presentation, stage timeline, add/remove/move interactions, ingredient detail view, and accessible non-drag controls. | Build | Catalog and Build Core | Not started |
| 4 | Analysis and Guidance | Implement role scoring, cuisine affinity, pairing logic, timing findings, initial warning rules, and suggested-next-ingredient ranking. Validate against representative builds from the original cooking discussion. | Build | Interactive Composer | Not started |
| 5 | Instructions and Persistence | Generate ordered cooking instructions, add pressure/release controls, implement local save/load and JSON import/export, and add schema versioning. | Build | Analysis and Guidance | Not started |
| 6 | MVP Polish and Validation | Complete responsive layout, accessibility pass, catalog expansion to 50–80 ingredients, end-to-end tests, and operator review of real generated stew builds. | Refine | Instructions and Persistence | Not started |

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

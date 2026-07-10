# Insta the Pot

> Project scope document. The assembler includes this verbatim in the PLAN
> action's prompt (`## Project Scope`).

## Scope

Insta the Pot is a client-side, browser-based visual stew composer. Users assemble a dish from ingredient cards, place each card into a cooking stage, and receive a deterministic cooking sequence plus balance, cuisine-affinity, and timing feedback with warnings and suggestions. The first release is an MVP built as vertical slices over a single-document architecture (`ARCHITECTURE.md`, Pattern B).

Out of scope for the MVP: nutritional/food-safety analysis, automatic quantity scaling, ingredient substitution guarantees, cuisine authenticity classification, user-authored catalog entries, any network/account/cloud/AI features, and competitive card-game mechanics.

## Constraints

- React + TypeScript + Vite; client-side only. No server, database, accounts, or cross-device sync.
- The catalog ships as static, schema-validated JSON bundled at build time and is immutable at runtime. `insta_the_pot_ingredients_v2.csv` is the source of truth; `ingredients.json` is a build output produced by the Phase 1/2 CSV→JSON step (never hand-edited).
- Controlled vocabularies only — categories, stages, roles, traits, balance axes, cuisines, salt risk, and group tags. Introducing any out-of-vocabulary string is a halt (see `ARCHITECTURE.md` Escalation Triggers).
- Analysis and instruction generation must be pure and deterministic: no network calls, no randomness, identical output for identical builds.
- Every card operation must have a click and keyboard alternative; drag-and-drop is additive only (accessibility halt trigger).
- Cuisine scores are affinity hints, not authenticity claims, and are presented as ranked scores without percentages.

## Success Criteria

- CSV→JSON converter emits a schema-valid `ingredients.json`; catalog-integrity passes: no duplicate IDs; every `pairsWith`/`avoidWith` entry resolves to a known ingredient ID or group tag; group tags and IDs are disjoint; every group has at least one member.
- Immutable build operations (add/remove/move/update) with typed unknown-ID errors and at most one row per ingredient.
- Deterministic analysis: balance-axis totals, ranked cuisine affinity, group-aware pairing/avoidance synergies and cautions, timing findings, and the initial warning rule set.
- Deterministic instruction generation in canonical stage order, omitting empty stages and never inventing quantities, temperatures, or times.
- Local save/load and JSON import/export with `schemaVersion` and schema validation on import.
- Accessible composer (keyboard + pointer) with a responsive desktop/mobile layout.
- End-to-end: create a chicken / roots / barley / spinach / lemon build, save it, reload, and verify the generated instructions and expected warnings.

## Risks

- Heuristic balance scores and cuisine weights are provisional; tune them against at least ten representative fixture builds in Phase 4, not ad hoc.
- Drag-and-drop accessibility: implement the non-drag selection path before adding drag (halt trigger if it cannot be completed via click/keyboard).
- Rule explosion: keep analysis rules as explicit TypeScript functions; do not introduce a general-purpose rules DSL (halt trigger).
- Persistence format drift: carry `schemaVersion` from the first export and migrate deliberately rather than breaking previously exported builds.
- Quantity logic must stay out of MVP scoring; keep balance and cuisine analysis presence-based (halt trigger if reliable unit conversion becomes required).

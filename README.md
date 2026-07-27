# Build-a-Stew

A browser-based visual **stew composer**. Pick ingredients, drop them into cooking
stages, and get live balance/cuisine analysis plus a generated recipe — all
client-side, no backend.

**Live:** https://lestp.github.io/build-a-stew/

> Also known as *"Insta the Pot"* — the pun lives on for the eventual printable
> card deck (119 ingredient cards + 1 instructions card).

## What it does

- **Library** — browse the ingredient catalog by category or search.
- **Detail** — inspect an ingredient (roles, traits, balance, cuisines, salt risk)
  and place it into a cooking stage.
- **Timeline** — see the build grouped by cooking stage, in canonical order.
- **Analysis** — Balance scores, Cuisine affinity, and Advisories (pairings,
  warnings, timing findings).
- **Recipe** — step-by-step instructions generated from the current build.
- **Save / Load** — builds persist in `localStorage`; export/import as JSON.

Layout is responsive: 1 column (phone) → 3 columns (laptop) → 4 columns (wide).

## Tech

React + TypeScript + Vite, fully client-side (state in `localStorage`). The
ingredient catalog is authored as CSV and converted to JSON at build/author time.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm test          # vitest + Testing Library (jsdom)
npm run build     # type-check + production build to dist/
npm run smoke     # build, serve, and verify the page + assets load
```

Regenerate the ingredient catalog from the CSV source:

```bash
npm run convert:catalog   # insta_the_pot_ingredients_v2.csv -> src/ingredients.json
```

## Deployment

Hosted on **GitHub Pages** via `.github/workflows/deploy.yml` — every push to
`main` builds and publishes automatically. The Vite `base` is set to
`/build-a-stew/` to match the Pages project path.

## Status

MVP is feature-complete on desktop. Planned next: a mobile-first interaction
model (bottom-nav + Detail bottom-sheet) and a color/shade classification system.

## Project docs

- `ARCHITECTURE.md` — data model, controlled vocabularies, and the interaction contract.
- `PROJECT.md` — scope, constraints, and success criteria.

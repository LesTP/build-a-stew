import { useMemo } from 'react';
import { addIngredient } from './build';
import { loadCatalog } from './catalog';
import { BuildSummary } from './components/BuildSummary';
import { BuildStoreProvider, createEmptyBuild, useBuildStore } from './store';
import type { Ingredient } from './types';

const DEMO_INGREDIENT_IDS = ['chicken_thighs', 'onion', 'white_wine', 'carrot'] as const;

function createDemoBuild(catalog: readonly Ingredient[]) {
  return DEMO_INGREDIENT_IDS.reduce(
    (build, ingredientId) => addIngredient(build, ingredientId, catalog),
    createEmptyBuild('demo-stew'),
  );
}

function AppContent() {
  const { build, catalog, resetBuild } = useBuildStore();
  const groupedStageCount = useMemo(() => {
    return new Set(build.ingredients.map(ingredient => ingredient.stage)).size;
  }, [build.ingredients]);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Build-a-Stew</p>
        <h1>Catalog-driven stew planning</h1>
        <p className="hero-copy">
          A minimal build view that loads ingredients from the generated catalog, seeds a demo build,
          and groups the active pot by cooking stage.
        </p>
        <div className="hero-stats" aria-label="Build overview">
          <div>
            <span className="stat-value">{build.ingredients.length}</span>
            <span className="stat-label">ingredients</span>
          </div>
          <div>
            <span className="stat-value">{groupedStageCount}</span>
            <span className="stat-label">active stages</span>
          </div>
          <div>
            <span className="stat-value">{catalog.length}</span>
            <span className="stat-label">catalog items</span>
          </div>
        </div>
        <div className="hero-actions">
          <button type="button" className="primary-action" onClick={resetBuild}>
            Clear demo build
          </button>
        </div>
      </section>

      <BuildSummary build={build} catalog={catalog} />
    </main>
  );
}

export default function App() {
  const catalog = useMemo(() => loadCatalog(), []);
  const initialBuild = useMemo(() => createDemoBuild(catalog), [catalog]);

  return (
    <BuildStoreProvider catalog={catalog} initialBuild={initialBuild}>
      <AppContent />
    </BuildStoreProvider>
  );
}

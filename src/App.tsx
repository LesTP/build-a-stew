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
    <>
      <header className="app-header">
        <div className="brand-block">
          <p className="eyebrow">Build-a-Stew</p>
          <h1>Insta the Pot</h1>
          <p className="hero-copy">
            A catalog-driven stew composer with four working columns for browsing, inspecting, staging,
            and analysis.
          </p>
        </div>

        <div className="header-toolbar" aria-label="Build controls">
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
          <button type="button" className="primary-action" onClick={resetBuild}>
            Clear demo build
          </button>
        </div>
      </header>

      <main className="app-shell">
        <section className="composer-panel composer-panel--library" aria-labelledby="library-title">
          <div className="panel-heading">
            <p className="eyebrow">Library</p>
            <h2 id="library-title">Ingredient browser</h2>
          </div>
          <p className="panel-copy">
            Phase 3 will add category tabs, search, and ingredient cards here. The catalog is already
            loaded and ready for filtering.
          </p>
          <dl className="panel-metrics" aria-label="Library summary">
            <div>
              <dt>Catalog size</dt>
              <dd>{catalog.length}</dd>
            </div>
            <div>
              <dt>Demo picks</dt>
              <dd>{build.ingredients.length}</dd>
            </div>
          </dl>
        </section>

        <section className="composer-panel composer-panel--detail" aria-labelledby="detail-title">
          <div className="panel-heading">
            <p className="eyebrow">Detail</p>
            <h2 id="detail-title">Ingredient inspector</h2>
          </div>
          <p className="panel-copy">
            Selecting an ingredient will surface metadata, stage placement controls, and action buttons
            in this column.
          </p>
          <div className="panel-placeholder" aria-hidden="true">
            Click an ingredient card to inspect its notes, tags, and stage options.
          </div>
        </section>

        <section className="composer-panel composer-panel--timeline" aria-labelledby="timeline-title">
          <div className="panel-heading">
            <p className="eyebrow">Timeline</p>
            <h2 id="timeline-title">Cooking timeline</h2>
          </div>
          <BuildSummary build={build} catalog={catalog} />
        </section>

        <section className="composer-panel composer-panel--analysis" aria-labelledby="analysis-title">
          <div className="panel-heading">
            <p className="eyebrow">Analysis</p>
            <h2 id="analysis-title">Guidance placeholder</h2>
          </div>
          <p className="panel-copy">
            Phase 4 will fill this lane with scoring, affinity hints, and next-step recommendations.
          </p>
          <div className="panel-placeholder panel-placeholder--soft" aria-hidden="true">
            Analysis is intentionally empty in Phase 3.
          </div>
        </section>
      </main>
    </>
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

import { useEffect, useMemo, useState } from 'react';
import { addIngredient } from './build';
import { analyzeBuild } from './analysis';
import { loadCatalog } from './catalog';
import { AnalysisPanel } from './components/AnalysisPanel';
import { BuildSummary } from './components/BuildSummary';
import { InstructionsPanel } from './components/InstructionsPanel';
import { Modal } from './components/Modal';
import { HowContent } from './components/HowContent';
import { BuildStoreProvider, createEmptyBuild, useBuildStore } from './store';
import { IngredientDetail } from './components/IngredientDetail';
import { IngredientLibrary } from './components/IngredientLibrary';
import { SavedBuildsPanel, notifySavedBuildsChanged } from './components/SavedBuildsPanel';
import { saveBuild } from './persistence';
import type { CookingStage, Ingredient, IngredientCategory } from './types';

const DEMO_INGREDIENT_IDS = ['chicken_thighs', 'onion', 'white_wine', 'carrot'] as const;

function createDemoBuild(catalog: readonly Ingredient[]) {
  return DEMO_INGREDIENT_IDS.reduce(
    (build, ingredientId) => addIngredient(build, ingredientId, catalog),
    createEmptyBuild('demo-stew'),
  );
}

function AppContent() {
  const {
    build,
    catalog,
    resetBuild,
    addIngredient: insertIngredient,
    moveIngredient,
    removeIngredient,
    updateBuild,
  } = useBuildStore();
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<null | 'how' | 'recipe' | 'load'>(null);

  const analysis = useMemo(() => analyzeBuild(build, catalog), [build, catalog]);

  const selectedIngredient = useMemo(() => {
    if (selectedIngredientId === null) {
      return null;
    }

    return catalog.find(ingredient => ingredient.id === selectedIngredientId) ?? null;
  }, [catalog, selectedIngredientId]);

  useEffect(() => {
    if (!selectedIngredientId) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIngredientId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIngredientId]);

  function placeIngredient(ingredientId: string, stage: CookingStage) {
    const catalogIngredient = catalog.find(ingredient => ingredient.id === ingredientId);
    const buildIngredient = build.ingredients.find(ingredient => ingredient.ingredientId === ingredientId);

    if (buildIngredient) {
      moveIngredient(ingredientId, stage);
      return;
    }

    insertIngredient(ingredientId);
    if (catalogIngredient && catalogIngredient.stage !== stage) {
      moveIngredient(ingredientId, stage);
    }
  }

  function handleSaveCurrentBuild() {
    try {
      saveBuild(build);
      setSaveFeedback(`Saved ${build.name ?? build.id}.`);
      notifySavedBuildsChanged();
    } catch (error) {
      setSaveFeedback(error instanceof Error ? error.message : 'Unable to save build.');
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="brand-block">
          <h1>Build-a-Stew</h1>
        </div>

        <div className="header-toolbar" aria-label="Build controls">
          <div className="header-actions header-actions--info">
            <button type="button" className="secondary-action" onClick={() => setOverlay('how')}>
              How
            </button>
            <button type="button" className="secondary-action" onClick={() => setOverlay('recipe')}>
              Recipe
            </button>
          </div>
          <div className="header-actions header-actions--mutate">
            <button type="button" className="primary-action" onClick={handleSaveCurrentBuild}>
              Save
            </button>
            <button type="button" className="secondary-action" onClick={resetBuild}>
              Clear
            </button>
            <button type="button" className="secondary-action" onClick={() => setOverlay('load')}>
              Load
            </button>
          </div>
          {saveFeedback ? (
            <p className="header-feedback" role="status">
              {saveFeedback}
            </p>
          ) : null}
        </div>
      </header>

      <main className="app-shell">
        <IngredientLibrary
          catalog={catalog}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          onCategoryChange={setSelectedCategory}
          onSearchTermChange={setSearchTerm}
          onSelectIngredient={setSelectedIngredientId}
          selectedIngredientId={selectedIngredientId}
        />

        <IngredientDetail
          ingredient={selectedIngredient}
          build={build}
          onClearSelection={() => setSelectedIngredientId(null)}
          onPlaceIngredient={placeIngredient}
        />

        <section className="composer-panel composer-panel--timeline" aria-label="Cooking timeline">
          <div className="panel-heading">
            <h2 id="timeline-title">Cooking timeline</h2>
          </div>
          <BuildSummary
            build={build}
            catalog={catalog}
            onRemoveIngredient={removeIngredient}
            onUpdateBuild={updateBuild}
            showEmptyStages
          />
        </section>

        <div className="analysis-group">
          <AnalysisPanel analysis={analysis} />
        </div>
      </main>

      <Modal open={overlay === 'how'} onClose={() => setOverlay(null)} title="How it works">
        <HowContent />
      </Modal>
      <Modal open={overlay === 'recipe'} onClose={() => setOverlay(null)} title="Recipe">
        <InstructionsPanel build={build} catalog={catalog} analysis={analysis} />
      </Modal>
      <Modal open={overlay === 'load'} onClose={() => setOverlay(null)} title="Saved builds">
        <SavedBuildsPanel />
      </Modal>
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

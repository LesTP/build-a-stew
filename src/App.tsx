import { useEffect, useMemo, useState } from 'react';
import { addIngredient } from './build';
import { analyzeBuild } from './analysis';
import { loadCatalog } from './catalog';
import { AnalysisPanel } from './components/AnalysisPanel';
import { BuildSummary } from './components/BuildSummary';
import { StepPickerPanel } from './components/StepPickerPanel';
import { InstructionsPanel } from './components/InstructionsPanel';
import { Modal } from './components/Modal';
import { HowContent } from './components/HowContent';
import { BuildStoreProvider, createEmptyBuild, useBuildStore } from './store';
import { IngredientDetail } from './components/IngredientDetail';
import { IngredientLibrary } from './components/IngredientLibrary';
import { SavedBuildsPanel, notifySavedBuildsChanged } from './components/SavedBuildsPanel';
import { saveBuild } from './persistence';
import { scoreStep } from './scoring';
import { TECHNIQUES } from './techniques';
import { CUISINE_TAGS } from './types';
import type { CookingStage, CuisineTag, Ingredient, IngredientCategory } from './types';
import type { CookingStep } from './techniques';

const DEMO_INGREDIENT_IDS = ['chicken_thighs', 'onion', 'white_wine', 'carrot'] as const;
const AVAILABLE_TECHNIQUES = Object.values(TECHNIQUES);
const DEFAULT_TECHNIQUE_ID = AVAILABLE_TECHNIQUES[0]?.id ?? 'braise';
const DEFAULT_CUISINE: CuisineTag = 'universal';
const MOBILE_LAYOUT_BREAKPOINT = 768;
type ComposerPanelId = 'timeline' | 'step-picker' | 'detail';

function formatCuisineLabel(cuisine: CuisineTag): string {
  return cuisine.replaceAll('_', ' ');
}

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
  const [selectedTechniqueId, setSelectedTechniqueId] = useState(DEFAULT_TECHNIQUE_ID);
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineTag>(DEFAULT_CUISINE);
  const [activeStepId, setActiveStepId] = useState(AVAILABLE_TECHNIQUES[0]?.steps[0]?.id ?? 'brown');
  const [activePanelId, setActivePanelId] = useState<ComposerPanelId>('timeline');
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < MOBILE_LAYOUT_BREAKPOINT);

  const analysis = useMemo(() => analyzeBuild(build, catalog), [build, catalog]);
  const selectedTechnique = TECHNIQUES[selectedTechniqueId as keyof typeof TECHNIQUES] ?? AVAILABLE_TECHNIQUES[0];
  const activeStep = useMemo(
    () => selectedTechnique.steps.find(step => step.id === activeStepId) ?? selectedTechnique.steps[0],
    [activeStepId, selectedTechnique],
  );
  const stepSuggestions = useMemo(() => {
    if (!activeStep) {
      return [];
    }

    return scoreStep(activeStep, build, catalog, selectedCuisine);
  }, [activeStep, build, catalog, selectedCuisine]);

  const selectedIngredient = useMemo(() => {
    if (selectedIngredientId === null) {
      return null;
    }

    return catalog.find(ingredient => ingredient.id === selectedIngredientId) ?? null;
  }, [catalog, selectedIngredientId]);

  const selectedSuggestion = useMemo(() => {
    if (!selectedIngredientId) {
      return null;
    }

    return stepSuggestions.find(suggestion => suggestion.ingredientId === selectedIngredientId) ?? null;
  }, [selectedIngredientId, stepSuggestions]);

  useEffect(() => {
    if (selectedIngredientId) {
      setActivePanelId('detail');
    }
  }, [selectedIngredientId]);

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

  useEffect(() => {
    if (selectedTechnique.steps.some((step: CookingStep) => step.id === activeStepId)) {
      return;
    }

    setActiveStepId(selectedTechnique.steps[0]?.id ?? activeStepId);
  }, [activeStepId, selectedTechnique]);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobileLayout(window.innerWidth < MOBILE_LAYOUT_BREAKPOINT);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  function placeIngredient(ingredientId: string, stage: CookingStage, selectIngredient = true) {
    const catalogIngredient = catalog.find(ingredient => ingredient.id === ingredientId);
    const buildIngredient = build.ingredients.find(ingredient => ingredient.ingredientId === ingredientId);

    if (buildIngredient) {
      moveIngredient(ingredientId, stage);
      if (selectIngredient) {
        setSelectedIngredientId(ingredientId);
      }
      return;
    }

    insertIngredient(ingredientId);
    if (catalogIngredient && catalogIngredient.stage !== stage) {
      moveIngredient(ingredientId, stage);
    }
    if (selectIngredient) {
      setSelectedIngredientId(ingredientId);
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
          <div className="header-controls">
            <label className="header-field" htmlFor="technique-select">
              <span className="header-field__label">Technique</span>
              <select
                id="technique-select"
                value={selectedTechniqueId}
                onChange={event => setSelectedTechniqueId(event.currentTarget.value)}
              >
                {AVAILABLE_TECHNIQUES.map(technique => (
                  <option key={technique.id} value={technique.id}>
                    {technique.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="header-field" htmlFor="cuisine-select">
              <span className="header-field__label">Cuisine</span>
              <select
                id="cuisine-select"
                value={selectedCuisine}
                onChange={event => setSelectedCuisine(event.currentTarget.value as CuisineTag)}
              >
                {CUISINE_TAGS.map(cuisine => (
                  <option key={cuisine} value={cuisine}>
                    {formatCuisineLabel(cuisine)}
                  </option>
                ))}
              </select>
            </label>
          </div>
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

      <aside className="library-rail">
        <IngredientLibrary
          catalog={catalog}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          onCategoryChange={setSelectedCategory}
          onSearchTermChange={setSearchTerm}
          onSelectIngredient={setSelectedIngredientId}
          selectedIngredientId={selectedIngredientId}
        />
      </aside>

      <nav className="composer-panel composer-panel--panel-tabs" role="tablist" aria-label="Composer panels">
        {([
          ['timeline', 'Timeline'],
          ['step-picker', 'Step picker'],
          ['detail', 'Detail'],
        ] as const).map(([panelId, label]) => (
          <button
            key={panelId}
            type="button"
            role="tab"
            aria-selected={activePanelId === panelId}
            className={activePanelId === panelId ? 'panel-tab panel-tab--active' : 'panel-tab'}
            aria-controls={`${panelId}-panel`}
            onClick={() => setActivePanelId(panelId)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="app-shell">
        <section
          id="timeline-panel"
          className="composer-panel composer-panel--timeline"
          aria-label="Timeline"
          hidden={isMobileLayout && activePanelId !== 'timeline'}
        >
          <div className="panel-heading">
            <h2 id="timeline-title">Timeline</h2>
          </div>
          <BuildSummary
            build={build}
            catalog={catalog}
            steps={selectedTechnique.steps}
            activeStepId={activeStepId}
            onRemoveIngredient={removeIngredient}
            onSelectIngredient={ingredientId => {
              setActivePanelId('detail');
              setSelectedIngredientId(ingredientId);
            }}
            onStepChange={stepId => {
              setActivePanelId(isMobileLayout ? 'step-picker' : 'timeline');
              setActiveStepId(stepId);
            }}
            onUpdateBuild={updateBuild}
            showEmptyStages
          />
        </section>

        <section
          id="step-picker-panel"
          className="composer-panel composer-panel--step-picker"
          aria-label="Step picker"
          hidden={isMobileLayout && activePanelId !== 'step-picker'}
        >
          {activeStep ? (
            <StepPickerPanel
              catalog={catalog}
              selectedIngredientId={selectedIngredientId}
              step={activeStep}
              suggestions={stepSuggestions}
              onAddIngredient={ingredientId => {
                if (isMobileLayout) {
                  setSelectedIngredientId(null);
                  setActivePanelId('timeline');
                  placeIngredient(ingredientId, activeStep.id, false);
                  return;
                }

                setActivePanelId('detail');
                placeIngredient(ingredientId, activeStep.id);
              }}
              onSelectIngredient={ingredientId => {
                setActivePanelId('detail');
                setSelectedIngredientId(ingredientId);
              }}
            />
          ) : (
            <>
              <div className="panel-heading">
                <h2 id="step-picker-title">Step picker</h2>
              </div>
              <div className="panel-placeholder" aria-hidden="true">
                Step-ranked ingredient suggestions will appear here.
              </div>
            </>
          )}
        </section>

        <IngredientDetail
          id="detail-panel"
          ingredient={selectedIngredient}
          build={build}
          candidateSuggestion={selectedSuggestion}
          selectedStepId={activeStep?.id ?? selectedTechnique.steps[0]?.id ?? 'brown'}
          onClearSelection={() => {
            setActivePanelId('timeline');
            setSelectedIngredientId(null);
          }}
          onPlaceIngredient={(ingredientId, stage) => {
            if (isMobileLayout) {
              setSelectedIngredientId(null);
              setActivePanelId('timeline');
              placeIngredient(ingredientId, stage, false);
              return;
            }

            setActivePanelId('detail');
            placeIngredient(ingredientId, stage);
          }}
          hidden={isMobileLayout && activePanelId !== 'detail'}
        />

        <div className="analysis-group">
          <AnalysisPanel
            analysis={analysis}
            stepSuggestions={stepSuggestions}
            onTryIngredient={ingredientId => {
              if (isMobileLayout) {
                setSelectedIngredientId(null);
                setActivePanelId('timeline');
                placeIngredient(ingredientId, activeStep?.id ?? selectedTechnique.steps[0]?.id ?? 'brown', false);
                return;
              }

              setActivePanelId('detail');
              placeIngredient(ingredientId, activeStep?.id ?? selectedTechnique.steps[0]?.id ?? 'brown');
            }}
          />
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

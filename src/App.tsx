import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Legend } from './components/Legend';
import { SavedBuildsPanel, notifySavedBuildsChanged } from './components/SavedBuildsPanel';
import { handleTablistKeyDown } from './components/tablist';
import { saveBuild } from './persistence';
import { scoreStep } from './scoring';
import { TECHNIQUES } from './techniques';
import { CUISINE_TAGS } from './types';
import type { CookingStage, CuisineTag, Ingredient } from './types';
import type { CookingStep } from './techniques';

const DEMO_INGREDIENT_IDS = ['chicken_thighs', 'onion', 'white_wine', 'carrot'] as const;
const AVAILABLE_TECHNIQUES = Object.values(TECHNIQUES);
const DEFAULT_TECHNIQUE_ID = AVAILABLE_TECHNIQUES[0]?.id ?? 'braise';
const DEFAULT_CUISINE: CuisineTag = 'universal';
const MOBILE_LAYOUT_BREAKPOINT = 768;
type ComposerPanelId = 'timeline' | 'step-picker' | 'detail';

function formatCuisineLabel(cuisine: CuisineTag): string {
  const label = cuisine.replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem('bas-theme') === 'light' ? 'light' : 'dark',
  );
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<null | 'how' | 'recipe' | 'load'>(null);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState(DEFAULT_TECHNIQUE_ID);
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineTag>(DEFAULT_CUISINE);
  const [activeStepId, setActiveStepId] = useState(AVAILABLE_TECHNIQUES[0]?.steps[0]?.id ?? 'brown');
  const [activePanelId, setActivePanelId] = useState<ComposerPanelId>('timeline');
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < MOBILE_LAYOUT_BREAKPOINT);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('bas-theme', theme);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [theme]);
  const panelTabRefs = useRef<Record<ComposerPanelId, HTMLButtonElement | null>>({
    timeline: null,
    'step-picker': null,
    detail: null,
  });
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const overlayTriggerRef = useRef<HTMLElement | null>(null);
  const pendingPanelFocusRef = useRef<ComposerPanelId | null>(null);
  const pendingIngredientFocusRef = useRef<string | null>(null);
  const didOpenDetailRef = useRef(false);

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
      return;
    }

    const pendingPanelId = pendingPanelFocusRef.current;
    if (pendingPanelId) {
      const panelTab = panelTabRefs.current[pendingPanelId];
      pendingPanelFocusRef.current = null;
      panelTab?.focus({ preventScroll: true });
      return;
    }

    const trigger = detailTriggerRef.current;
    if (trigger && trigger.isConnected && !trigger.closest('[hidden]')) {
      trigger.focus({ preventScroll: true });
      return;
    }

    if (isMobileLayout) {
      panelTabRefs.current.timeline?.focus({ preventScroll: true });
    }
  }, [isMobileLayout, selectedIngredientId]);

  useEffect(() => {
    if (selectedIngredientId === null) {
      didOpenDetailRef.current = false;
      return;
    }

    if (didOpenDetailRef.current) {
      return;
    }

    didOpenDetailRef.current = true;
    const closeButton = document.querySelector<HTMLButtonElement>('#detail-panel .close-button');
    closeButton?.focus({ preventScroll: true });
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

  useEffect(() => {
    if (overlay !== null) {
      return;
    }

    const trigger = overlayTriggerRef.current;
    if (trigger && trigger.isConnected) {
      trigger.focus({ preventScroll: true });
      overlayTriggerRef.current = null;
    }
  }, [overlay]);

  useEffect(() => {
    const pendingPanelId = pendingPanelFocusRef.current;
    if (!pendingPanelId) {
      return;
    }

    const panelTab = panelTabRefs.current[pendingPanelId];
    if (panelTab) {
      panelTab.focus({ preventScroll: true });
      pendingPanelFocusRef.current = null;
    }
  }, [activePanelId, isMobileLayout]);

  useEffect(() => {
    const ingredientId = pendingIngredientFocusRef.current;
    if (!ingredientId) {
      return;
    }

    const chip = document.querySelector<HTMLButtonElement>(
      `.ingredient-chip[data-ingredient-id="${ingredientId}"]`,
    );
    if (chip && !chip.closest('[hidden]')) {
      chip.focus({ preventScroll: true });
      pendingIngredientFocusRef.current = null;
    }
  }, [activePanelId, build, isMobileLayout]);

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

  function focusCurrentElementAsTrigger(ref: { current: HTMLElement | null }) {
    ref.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function openIngredientDetail(ingredientId: string) {
    focusCurrentElementAsTrigger(detailTriggerRef);
    setActivePanelId('detail');
    setSelectedIngredientId(ingredientId);
  }

  function closeIngredientDetail() {
    if (isMobileLayout) {
      pendingPanelFocusRef.current = 'timeline';
    }

    setActivePanelId('timeline');
    setSelectedIngredientId(null);
  }

  function openOverlay(nextOverlay: 'how' | 'recipe' | 'load') {
    focusCurrentElementAsTrigger(overlayTriggerRef);
    setOverlay(nextOverlay);
  }

  function closeOverlay() {
    setOverlay(null);
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
            <button type="button" className="secondary-action" onClick={() => openOverlay('how')}>
              How
            </button>
            <button type="button" className="secondary-action" onClick={() => openOverlay('recipe')}>
              Recipe
            </button>
            <button
              type="button"
              className="secondary-action theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
          </div>
          <div className="header-actions header-actions--mutate">
            <button type="button" className="primary-action" onClick={handleSaveCurrentBuild}>
              Save
            </button>
            <button type="button" className="secondary-action" onClick={resetBuild}>
              Clear
            </button>
            <button type="button" className="secondary-action" onClick={() => openOverlay('load')}>
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

      <nav
        className="composer-panel composer-panel--panel-tabs"
        role="tablist"
        aria-label="Composer panels"
        onKeyDown={handleTablistKeyDown}
      >
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
            ref={button => {
              panelTabRefs.current[panelId] = button;
            }}
            onClick={() => {
              setActivePanelId(panelId);
            }}
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
            onSelectIngredient={openIngredientDetail}
            onStepChange={stepId => {
              setActivePanelId(isMobileLayout ? 'step-picker' : 'timeline');
              setActiveStepId(stepId);
            }}
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
                  pendingPanelFocusRef.current = 'timeline';
                  setSelectedIngredientId(null);
                  setActivePanelId('timeline');
                  placeIngredient(ingredientId, activeStep.id, false);
                  return;
                }

                focusCurrentElementAsTrigger(detailTriggerRef);
                pendingIngredientFocusRef.current = ingredientId;
                setActivePanelId('detail');
                placeIngredient(ingredientId, activeStep.id);
              }}
              onSelectIngredient={openIngredientDetail}
            />
          ) : (
            <>
              <div className="panel-heading">
                <h2 id="step-picker-title">Ingredient picker</h2>
              </div>
              <div className="panel-placeholder" aria-hidden="true">
                Step-ranked ingredient suggestions will appear here.
              </div>
            </>
          )}
          <Legend />
        </section>

        <IngredientDetail
          id="detail-panel"
          ingredient={selectedIngredient}
          build={build}
          candidateSuggestion={selectedSuggestion}
          selectedStepId={activeStep?.id ?? selectedTechnique.steps[0]?.id ?? 'brown'}
          onClearSelection={closeIngredientDetail}
          hidden={isMobileLayout && activePanelId !== 'detail'}
        />

        <div className="analysis-group">
          <AnalysisPanel
            analysis={analysis}
            stepSuggestions={stepSuggestions}
            onTryIngredient={ingredientId => {
              if (isMobileLayout) {
                pendingPanelFocusRef.current = 'timeline';
                setSelectedIngredientId(null);
                setActivePanelId('timeline');
                placeIngredient(ingredientId, activeStep?.id ?? selectedTechnique.steps[0]?.id ?? 'brown', false);
                return;
              }

              focusCurrentElementAsTrigger(detailTriggerRef);
              pendingIngredientFocusRef.current = ingredientId;
              setActivePanelId('detail');
              placeIngredient(ingredientId, activeStep?.id ?? selectedTechnique.steps[0]?.id ?? 'brown');
            }}
          />
        </div>
      </main>

      <Modal open={overlay === 'how'} onClose={closeOverlay} title="How it works">
        <HowContent />
      </Modal>
      <Modal open={overlay === 'recipe'} onClose={closeOverlay} title="Recipe">
        <InstructionsPanel build={build} catalog={catalog} analysis={analysis} />
      </Modal>
      <Modal open={overlay === 'load'} onClose={closeOverlay} title="Saved builds">
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

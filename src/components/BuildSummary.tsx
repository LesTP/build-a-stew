import { groupBuildByStage } from '../build';
import { COOKING_STAGES, STAGE_LABELS, type Ingredient, type StewBuild } from '../types';
import type { CookingStep } from '../techniques';

interface BuildSummaryProps {
  build: StewBuild;
  catalog: readonly Ingredient[];
  onRemoveIngredient?: (ingredientId: string) => void;
  onSelectIngredient?: (ingredientId: string) => void;
  steps?: readonly CookingStep[];
  activeStepId?: CookingStep['id'] | null;
  onStepChange?: (stepId: CookingStep['id']) => void;
  onUpdateBuild?: (patch: Partial<StewBuild>) => void;
  showEmptyStages?: boolean;
}

function ingredientNameMap(catalog: readonly Ingredient[]): Map<string, Ingredient> {
  return new Map(catalog.map(ingredient => [ingredient.id, ingredient]));
}

function formatCookMinutes(cookMinutes: Ingredient['cookMinutes']): string | null {
  if (!cookMinutes) {
    return null;
  }

  if (cookMinutes.min === cookMinutes.max) {
    return `${cookMinutes.min} min`;
  }

  return `${cookMinutes.min}-${cookMinutes.max} min`;
}

export function BuildSummary({
  build,
  catalog,
  onRemoveIngredient,
  onSelectIngredient,
  steps,
  activeStepId = null,
  onStepChange,
  showEmptyStages = false,
}: BuildSummaryProps) {
  const grouped = groupBuildByStage(build);
  const ingredientsById = ingredientNameMap(catalog);
  const selectedCount = build.ingredients.length;
  const timelineSteps = steps ?? COOKING_STAGES.map(stage => ({
    id: stage,
    label: STAGE_LABELS[stage],
    timing: stage === 'pressure' || stage === 'simmer_after' ? 'long' : stage === 'finish' || stage === 'serve_over' ? 'finish' : 'short',
    ...(stage === 'pressure' ? { longCook: true as const } : {}),
  }));
  const shouldRenderTimeline = selectedCount > 0 || showEmptyStages;

  return (
    <div className="timeline-body">
      <p className="summary-meta">
        {selectedCount === 0 ? 'No ingredients selected' : `${selectedCount} ingredient${selectedCount === 1 ? '' : 's'} selected`}
      </p>

      {!shouldRenderTimeline ? (
        <div className="empty-state">
          <p>Nothing is in the pot yet.</p>
          <p>Load ingredients from the catalog to see the stage lanes populate here.</p>
        </div>
      ) : (
        <div className="stage-lane-list">
          <div className="timeline-step-strip" role="tablist" aria-label="Cooking steps">
            {timelineSteps.map(step => {
              const active = step.id === activeStepId;

              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`stage-panel-${step.id}`}
                  className={active ? 'timeline-step-tab timeline-step-tab--active' : 'timeline-step-tab'}
                  onClick={() => onStepChange?.(step.id)}
                >
                  <span className="timeline-step-tab__label">{step.label}</span>
                </button>
              );
            })}
          </div>

          <div className="stage-lane-list__grid" role="list" aria-label="Build stages">
            {COOKING_STAGES.map(stage => {
              const ingredients = grouped[stage] ?? [];
              const active = stage === activeStepId;

              return (
                <article
                  key={stage}
                  id={`stage-panel-${stage}`}
                  className={active ? 'stage-card stage-card--active' : 'stage-card'}
                  role="listitem"
                  data-stage={stage}
                  data-active={active ? 'true' : 'false'}
                >
                  <div className="stage-card__header">
                    <h3>{active ? 'Active lane' : 'Stage lane'}</h3>
                    <span className="stage-count">
                      {ingredients.length} item{ingredients.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {ingredients.length === 0 ? (
                    <div className="stage-empty">No ingredients in this stage yet.</div>
                  ) : (
                    <ol className="ingredient-list">
                      {ingredients.map(ingredient => {
                        const catalogIngredient = ingredientsById.get(ingredient.ingredientId);
                        const cookMinutes = formatCookMinutes(catalogIngredient?.cookMinutes);
                        const ingredientName = catalogIngredient?.name ?? ingredient.ingredientId;

                        return (
                          <li key={ingredient.ingredientId} className="ingredient-row">
                            <button
                              type="button"
                              className="ingredient-chip"
                              onClick={() => onSelectIngredient?.(ingredient.ingredientId)}
                              aria-label={`Open detail for ${ingredientName}`}
                            >
                              <span className="ingredient-chip__name">{ingredientName}</span>
                              {cookMinutes ? (
                                <span className="ingredient-chip__cook-time ingredient-cook-time">{cookMinutes}</span>
                              ) : null}
                            </button>
                            {onRemoveIngredient ? (
                              <button
                                type="button"
                                className="remove-button"
                                onClick={() => onRemoveIngredient(ingredient.ingredientId)}
                                aria-label={`Remove ${ingredientName}`}
                                aria-hidden="true"
                                tabIndex={-1}
                                data-ingredient-id={ingredient.ingredientId}
                              >
                                ×
                              </button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

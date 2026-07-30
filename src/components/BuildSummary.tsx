import { groupBuildByStage } from '../build';
import { COOKING_STAGES, STAGE_LABELS, type Ingredient, type StewBuild } from '../types';
import type { CookingStep } from '../techniques';
import { handleTablistKeyDown } from './tablist';

interface BuildSummaryProps {
  build: StewBuild;
  catalog: readonly Ingredient[];
  onRemoveIngredient?: (ingredientId: string) => void;
  onSelectIngredient?: (ingredientId: string) => void;
  steps?: readonly CookingStep[];
  activeStepId?: CookingStep['id'] | null;
  onStepChange?: (stepId: CookingStep['id']) => void;
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

  return (
    <div className="timeline-body">
      <p className="summary-meta">
        {selectedCount === 0 ? 'No ingredients selected' : `${selectedCount} ingredient${selectedCount === 1 ? '' : 's'} selected`}
      </p>

      <div className="stage-lane-list" role="tablist" aria-label="Cooking steps" onKeyDown={handleTablistKeyDown}>
        {timelineSteps.map(step => {
          const ingredients = grouped[step.id] ?? [];
          const active = step.id === activeStepId;

          return (
            <article
              key={step.id}
              className={active ? 'stage-card stage-card--active' : 'stage-card'}
              data-stage={step.id}
              data-active={active ? 'true' : 'false'}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`stage-panel-${step.id}`}
                className="stage-card__header"
                onClick={() => onStepChange?.(step.id)}
              >
                <h3>{step.label}</h3>
                <span className="stage-count">
                  {ingredients.length > 0 ? `${ingredients.length} item${ingredients.length === 1 ? '' : 's'}` : ''}
                </span>
              </button>
              <div id={`stage-panel-${step.id}`} className="stage-card__body">
                {ingredients.length === 0 ? (
                  <div className="stage-empty">Tap to add ingredients here.</div>
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
                            data-ingredient-id={ingredient.ingredientId}
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
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

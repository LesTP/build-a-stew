import { groupBuildByStage } from '../build';
import { COOKING_STAGES, STAGE_LABELS, type Ingredient, type StewBuild } from '../types';

interface BuildSummaryProps {
  build: StewBuild;
  catalog: readonly Ingredient[];
  onRemoveIngredient?: (ingredientId: string) => void;
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
  showEmptyStages = false,
}: BuildSummaryProps) {
  const grouped = groupBuildByStage(build);
  const ingredientsById = ingredientNameMap(catalog);
  const selectedCount = build.ingredients.length;

  return (
    <div className="timeline-body">
      <p className="summary-meta">
        {selectedCount === 0 ? 'No ingredients selected' : `${selectedCount} ingredient${selectedCount === 1 ? '' : 's'} selected`}
      </p>

      {selectedCount === 0 && !showEmptyStages ? (
        <div className="empty-state">
          <p>Nothing is in the pot yet.</p>
          <p>Load ingredients from the catalog to see the stage lanes populate here.</p>
        </div>
      ) : (
        <div className="stage-lane-list" role="list" aria-label="Build stages">
          {COOKING_STAGES.map(stage => {
            const ingredients = grouped[stage] ?? [];

            return (
              <article key={stage} className="stage-card" role="listitem" data-stage={stage}>
                <div className="stage-card__header">
                  <h3>{STAGE_LABELS[stage]}</h3>
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
                          <span className="ingredient-name">{ingredientName}</span>
                          <span className="ingredient-cook-time">{cookMinutes ?? ''}</span>
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
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

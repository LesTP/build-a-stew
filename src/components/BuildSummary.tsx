import { groupBuildByStage } from '../build';
import { COOKING_STAGES, type CookingStage, type Ingredient, type StewBuild } from '../types';

interface BuildSummaryProps {
  build: StewBuild;
  catalog: readonly Ingredient[];
}

const STAGE_LABELS: Record<CookingStage, string> = {
  brown: 'Brown',
  aromatics: 'Aromatics',
  deglaze: 'Deglaze',
  pressure: 'Pressure',
  simmer_after: 'Simmer after',
  stir_in: 'Stir in',
  finish: 'Finish',
  serve_over: 'Serve over',
};

function ingredientNameMap(catalog: readonly Ingredient[]): Map<string, Ingredient> {
  return new Map(catalog.map(ingredient => [ingredient.id, ingredient]));
}

export function BuildSummary({ build, catalog }: BuildSummaryProps) {
  const grouped = groupBuildByStage(build);
  const ingredientsById = ingredientNameMap(catalog);
  const selectedCount = build.ingredients.length;

  return (
    <section className="summary-panel" aria-labelledby="build-summary-title">
      <div className="summary-header">
        <div>
          <p className="eyebrow">Current build</p>
          <h2 id="build-summary-title">Stage-grouped summary</h2>
        </div>
        <p className="summary-meta">
          {selectedCount === 0 ? 'No ingredients selected' : `${selectedCount} ingredient${selectedCount === 1 ? '' : 's'} selected`}
        </p>
      </div>

      {selectedCount === 0 ? (
        <div className="empty-state">
          <p>Nothing is in the pot yet.</p>
          <p>Load ingredients from the catalog to see the stage lanes populate here.</p>
        </div>
      ) : (
        <div className="stage-lane-list" role="list" aria-label="Build stages">
          {COOKING_STAGES.map(stage => {
            const ingredients = grouped[stage];
            if (!ingredients || ingredients.length === 0) {
              return null;
            }

            return (
              <article key={stage} className="stage-card" role="listitem" data-stage={stage}>
                <div className="stage-card__header">
                  <h3>{STAGE_LABELS[stage]}</h3>
                  <span className="stage-count">
                    {ingredients.length} item{ingredients.length === 1 ? '' : 's'}
                  </span>
                </div>
                <ol className="ingredient-list">
                  {ingredients.map(ingredient => {
                    const catalogIngredient = ingredientsById.get(ingredient.ingredientId);
                    return (
                      <li key={ingredient.ingredientId} className="ingredient-row">
                        <span className="ingredient-name">
                          {catalogIngredient?.name ?? ingredient.ingredientId}
                        </span>
                        <span className="ingredient-stage">{STAGE_LABELS[ingredient.stage]}</span>
                      </li>
                    );
                  })}
                </ol>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

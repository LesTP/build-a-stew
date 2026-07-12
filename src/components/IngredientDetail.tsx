import { COOKING_STAGES, type Ingredient, type StewBuild } from '../types';

interface IngredientDetailProps {
  ingredient: Ingredient | null;
  build: StewBuild;
  onClearSelection(): void;
  onPlaceIngredient(ingredientId: string, stage: (typeof COOKING_STAGES)[number]): void;
}

function formatCookMinutes(cookMinutes: Ingredient['cookMinutes']): string {
  if (!cookMinutes) {
    return 'Not specified';
  }

  return cookMinutes.min === cookMinutes.max
    ? `${cookMinutes.min} min`
    : `${cookMinutes.min}-${cookMinutes.max} min`;
}

function formatRef(ref: string): string {
  return ref.replace(/_/g, ' ');
}

export function IngredientDetail({
  ingredient,
  build,
  onClearSelection,
  onPlaceIngredient,
}: IngredientDetailProps) {
  if (!ingredient) {
    return (
      <section className="composer-panel composer-panel--detail" aria-label="Detail">
        <div className="panel-heading">
          <h2 id="detail-title">Detail</h2>
        </div>
        <p className="panel-copy">
          Selecting an ingredient will surface metadata, stage placement controls, and action buttons
          in this column.
        </p>
        <div className="panel-placeholder" aria-hidden="true">
          Click an ingredient card to inspect its notes, tags, and stage options.
        </div>
      </section>
    );
  }

  const buildIngredient = build.ingredients.find(entry => entry.ingredientId === ingredient.id);
  const selectedStage = buildIngredient?.stage ?? ingredient.stage;

  return (
    <section className="composer-panel composer-panel--detail" aria-label="Detail">
      <div className="panel-heading">
        <h2 id="detail-title">Detail</h2>
      </div>

      <div className="detail-card">
        <div className="detail-card__header">
          <div>
            <h3>{ingredient.name}</h3>
            <p className="detail-subtitle">{ingredient.category}</p>
          </div>
          <button type="button" className="close-button" onClick={onClearSelection}>
            Close
          </button>
        </div>

        <div className="detail-section">
          <h4>Place in stage</h4>
          <div className="stage-picker" role="group" aria-label="Place ingredient in stage">
            {COOKING_STAGES.map(stage => {
              const active = stage === selectedStage;

              return (
                <button
                  key={stage}
                  type="button"
                  className={active ? 'stage-chip stage-chip--active' : 'stage-chip'}
                  aria-pressed={active}
                  onClick={() => onPlaceIngredient(ingredient.id, stage)}
                >
                  {formatRef(stage)}
                </button>
              );
            })}
          </div>
        </div>

        <dl className="detail-meta">
          <div>
            <dt>Roles</dt>
            <dd>{ingredient.roles.map(formatRef).join(', ') || 'None'}</dd>
          </div>
          <div>
            <dt>Traits</dt>
            <dd>{ingredient.traits.map(formatRef).join(', ') || 'None'}</dd>
          </div>
          <div>
            <dt>Cuisines</dt>
            <dd>{ingredient.cuisines.map(formatRef).join(', ') || 'None'}</dd>
          </div>
          <div>
            <dt>Salt risk</dt>
            <dd>{ingredient.saltRisk}</dd>
          </div>
          <div>
            <dt>Cook time</dt>
            <dd>{formatCookMinutes(ingredient.cookMinutes)}</dd>
          </div>
        </dl>

        <div className="detail-section">
          <h4>Balance scores</h4>
          <ul className="balance-list">
            {Object.entries(ingredient.balanceScores).map(([axis, score]) => (
              <li key={axis} className="balance-row">
                <span className="balance-label">{axis}</span>
                <div className="balance-track" aria-hidden="true">
                  <span className="balance-fill" style={{ width: `${Math.max(0, Math.min(100, score * 20))}%` }} />
                </div>
                <span className="balance-value">{score}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-section">
          <h4>Pairs with</h4>
          <p className="detail-list">
            {ingredient.pairsWith?.length ? ingredient.pairsWith.map(formatRef).join(', ') : 'None listed'}
          </p>
        </div>

        <div className="detail-section">
          <h4>Avoid with</h4>
          <p className="detail-list">
            {ingredient.avoidWith?.length ? ingredient.avoidWith.map(formatRef).join(', ') : 'None listed'}
          </p>
        </div>

        {ingredient.notes ? (
          <div className="detail-section">
            <h4>Notes</h4>
            <p className="detail-notes">{ingredient.notes}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

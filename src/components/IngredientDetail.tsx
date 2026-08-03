import { COOKING_STAGES, STAGE_LABELS, type Ingredient, type StewBuild } from '../types';
import type { Suggestion } from '../scoring';

interface IngredientDetailProps {
  id?: string;
  hidden?: boolean;
  ingredient: Ingredient | null;
  build: StewBuild;
  catalog: readonly Ingredient[];
  candidateSuggestion?: Suggestion | null;
  selectedStepId: (typeof COOKING_STAGES)[number];
  onClearSelection(): void;
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

function formatList(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const BUCKET_PHRASE: Record<string, string> = {
  top: 'Top choice',
  okay: 'Good option',
  fallback: 'Fallback option',
};

const REASON_CLAUSE: Record<string, string> = {
  balance: 'it helps the flavor balance',
  cuisine: 'it fits the cuisine',
  timing: 'its cook time suits this step',
};

export function IngredientDetail({
  id,
  hidden,
  ingredient,
  build,
  catalog,
  candidateSuggestion,
  selectedStepId,
  onClearSelection,
}: IngredientDetailProps) {
  if (!ingredient) {
    return (
      <section id={id} className="composer-panel composer-panel--detail" aria-label="Ingredient details" hidden={hidden}>
        <div className="panel-placeholder">
          Select an ingredient to see general info, whether it fits with what you&rsquo;ve already
          added, and why.
        </div>
      </section>
    );
  }

  const buildIngredient = build.ingredients.find(entry => entry.ingredientId === ingredient.id);
  const isPlaced = buildIngredient !== undefined;
  const candidateCautions = candidateSuggestion?.cautions ?? [];
  const candidateReasons = candidateSuggestion?.reasons ?? [];
  const candidateGoodWith = ingredient.pairsWith?.length ? ingredient.pairsWith.map(formatRef).join(', ') : 'None listed';

  const bucketPhrase = candidateSuggestion ? BUCKET_PHRASE[candidateSuggestion.bucket] ?? 'Option' : 'Option';
  const reasonClauses = candidateReasons
    .filter(reason => reason !== 'caution')
    .map(reason => REASON_CLAUSE[reason])
    .filter((clause): clause is string => Boolean(clause));
  const whyText = reasonClauses.length > 0
    ? `${bucketPhrase} because ${formatList(reasonClauses)}.`
    : `${bucketPhrase} for this step.`;
  const detailBuildIds = new Set(build.ingredients.map(entry => entry.ingredientId));
  const pairingNames = (ingredient.pairsWith ?? [])
    .filter(pairId => detailBuildIds.has(pairId))
    .map(pairId => catalog.find(item => item.id === pairId)?.name ?? formatRef(pairId));

  return (
    <section id={id} className="composer-panel composer-panel--detail" aria-label="Ingredient details" hidden={hidden}>
      <div className="detail-card">
        <div className="detail-card__header">
          <div>
            <h3>{ingredient.name}</h3>
            <p className={`detail-subtitle detail-subtitle--${ingredient.category}`}>{ingredient.category}</p>
          </div>
          <button type="button" className="close-button" onClick={onClearSelection}>
            Close
          </button>
        </div>

        {!isPlaced ? (
          <>
            <p className="detail-line">
              <strong>Best step:</strong> {STAGE_LABELS[selectedStepId]}
            </p>
            <p className="detail-why">{whyText}</p>
            {pairingNames.length > 0 ? (
              <p className="detail-pairing">Pairs well with {pairingNames.join(', ')}.</p>
            ) : null}
            {candidateCautions.length > 0 ? (
              <div className="detail-section">
                <h4>Cautions</h4>
                <ul className="detail-bullet-list">
                  {candidateCautions.map((caution, index) => (
                    <li key={`${ingredient.id}:caution:${index}`}>{caution}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

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
          <h4>Good with</h4>
          <p className="detail-list">
            {candidateGoodWith}
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

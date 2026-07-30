import { useEffect, useMemo, useState } from 'react';
import type { CookingStep } from '../techniques';
import type { Suggestion } from '../scoring';
import type { Ingredient } from '../types';

interface StepPickerPanelProps {
  catalog: readonly Ingredient[];
  selectedIngredientId: string | null;
  step: CookingStep;
  suggestions: readonly Suggestion[];
  onAddIngredient(ingredientId: string): void;
  onSelectIngredient(ingredientId: string): void;
}

const BUCKET_TITLES: Record<Suggestion['bucket'], string> = {
  top: 'Top',
  okay: 'Okay',
  fallback: 'Fallback',
};

const REASON_ICONS: Record<Suggestion['reasons'][number], string> = {
  cuisine: '🍽',
  balance: '⚖',
  timing: '⏱',
  caution: '⚠',
};

function formatCookMinutes(cookMinutes: Ingredient['cookMinutes']): string {
  if (!cookMinutes) {
    return 'no cook';
  }

  return cookMinutes.min === cookMinutes.max
    ? `${cookMinutes.min} min`
    : `${cookMinutes.min}-${cookMinutes.max} min`;
}

function groupSuggestions(suggestions: readonly Suggestion[]) {
  return suggestions.reduce<Record<Suggestion['bucket'], Suggestion[]>>(
    (groups, suggestion) => {
      groups[suggestion.bucket].push(suggestion);
      return groups;
    },
    { top: [], okay: [], fallback: [] },
  );
}

export function StepPickerPanel({
  catalog,
  selectedIngredientId,
  step,
  suggestions,
  onAddIngredient,
  onSelectIngredient,
}: StepPickerPanelProps) {
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth < 720);
  const ingredientsById = useMemo(
    () => new Map(catalog.map(ingredient => [ingredient.id, ingredient])),
    [catalog],
  );
  const groupedSuggestions = useMemo(() => groupSuggestions(suggestions), [suggestions]);
  const bucketOrder: Suggestion['bucket'][] = ['top', 'okay', 'fallback'];
  const primarySuggestion = suggestions[0] ?? null;

  useEffect(() => {
    const updateLayout = () => {
      setIsCompactLayout(window.innerWidth < 720);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  return (
    <>
      <div className="panel-heading">
        <h2 id="step-picker-title">Step picker</h2>
      </div>
      <p className="panel-copy">
        Ranked for <strong>{step.label}</strong>. Add with the plus button or open detail for the
        why.
      </p>
      {isCompactLayout && primarySuggestion ? (() => {
        const ingredient = ingredientsById.get(primarySuggestion.ingredientId);

        if (!ingredient) {
          return null;
        }

        return (
          <div className="step-picker-mobile-action">
            <button
              type="button"
              className="primary-action step-picker-mobile-action__button"
              onClick={() => onAddIngredient(primarySuggestion.ingredientId)}
            >
              Add {ingredient.name}
            </button>
          </div>
        );
      })() : null}

      {suggestions.length === 0 ? (
        <div className="panel-placeholder panel-placeholder--soft" aria-hidden="true">
          No step-appropriate ingredients are available yet.
        </div>
      ) : (
        <div className="step-picker-groups" aria-label={`${step.label} suggestions`}>
          {bucketOrder.map(bucket => {
            const bucketSuggestions = groupedSuggestions[bucket];

            if (bucketSuggestions.length === 0) {
              return null;
            }

            return (
              <section key={bucket} className="step-picker-bucket" aria-labelledby={`step-picker-${bucket}`}>
                <div className={`step-picker-bucket__title step-picker-bucket__title--${bucket}`}>
                  <span id={`step-picker-${bucket}`}>{BUCKET_TITLES[bucket]}</span>
                </div>
                <ol className="step-picker-list">
                  {bucketSuggestions.map(suggestion => {
                    const ingredient = ingredientsById.get(suggestion.ingredientId);
                    if (!ingredient) {
                      return null;
                    }

                    const active = suggestion.ingredientId === selectedIngredientId;

                    return (
                      <li
                        key={suggestion.ingredientId}
                        className={active ? 'step-picker-row step-picker-row--active' : 'step-picker-row'}
                      >
                        <button
                          type="button"
                          className="step-picker-row__add"
                          aria-hidden={isCompactLayout}
                          tabIndex={isCompactLayout ? -1 : 0}
                          onClick={() => {
                            onAddIngredient(suggestion.ingredientId);
                            onSelectIngredient(suggestion.ingredientId);
                          }}
                          aria-label={`Add ${ingredient.name} to ${step.label}`}
                        >
                          +
                        </button>

                        <button
                          type="button"
                          className="step-picker-row__detail"
                          onClick={() => onSelectIngredient(suggestion.ingredientId)}
                          aria-label={`Detail for ${ingredient.name}`}
                        >
                          <span className={`step-picker-row__category step-picker-row__category--${ingredient.category}`}>
                            {ingredient.category}
                          </span>
                          <span className="step-picker-row__name">{ingredient.name}</span>
                          <span className="step-picker-row__icons" aria-hidden="true">
                            {suggestion.reasons.map(reason => (
                              <span
                                key={reason}
                                className={`step-reason-icon step-reason-icon--${reason}`}
                                aria-hidden="true"
                              >
                                {REASON_ICONS[reason]}
                              </span>
                            ))}
                          </span>
                          <span className="step-picker-row__cook">{formatCookMinutes(ingredient.cookMinutes)}</span>
                        </button>

                        <span className="step-picker-row__detail-label" aria-hidden="true">
                          Detail
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

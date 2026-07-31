import { CUISINE_LABELS, type AnalysisResult, type BalanceAxis, type CuisineTag } from '../types';
import type { Suggestion } from '../scoring';

interface AnalysisPanelProps {
  analysis: AnalysisResult;
  stepSuggestions?: readonly Suggestion[];
  onTryIngredient?: (ingredientId: string) => void;
}

const BALANCE_LABELS: Record<BalanceAxis, string> = {
  body: 'Body',
  richness: 'Richness',
  umami: 'Umami',
  sweetness: 'Sweetness',
  acidity: 'Acidity',
  heat: 'Heat',
  smoke: 'Smoke',
  freshness: 'Freshness',
  texture: 'Texture',
  aromatic_intensity: 'Aromatic intensity',
};

const BALANCE_ADJECTIVE: Record<BalanceAxis, { positive: string; negative: string }> = {
  body: { positive: 'full-bodied', negative: 'light' },
  richness: { positive: 'rich', negative: 'lean' },
  umami: { positive: 'savory', negative: 'mild' },
  sweetness: { positive: 'sweet', negative: 'savory' },
  acidity: { positive: 'bright', negative: 'mellow' },
  heat: { positive: 'spicy', negative: 'gentle' },
  smoke: { positive: 'smoky', negative: 'clean' },
  freshness: { positive: 'fresh', negative: 'muted' },
  texture: { positive: 'textured', negative: 'smooth' },
  aromatic_intensity: { positive: 'aromatic', negative: 'subtle' },
};

function intensityWord(score: number): string {
  const magnitude = Math.abs(score);
  if (magnitude >= 5) return 'highly';
  if (magnitude >= 3) return 'fairly';
  return 'slightly';
}

function formatCuisineLabel(cuisine: CuisineTag): string {
  return CUISINE_LABELS[cuisine];
}

function formatSignedScore(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

function rankCuisineScores(scores: AnalysisResult['cuisineScores']): Array<[CuisineTag, number]> {
  return Object.entries(scores)
    .filter(([cuisine, score]) => cuisine !== 'universal' && score > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])) as Array<[CuisineTag, number]>;
}

function rankBalanceSignals(scores: AnalysisResult['balanceScores']) {
  return (Object.entries(scores) as Array<[BalanceAxis, number]>)
    .filter(([, score]) => score !== 0)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]) || right[1] - left[1] || left[0].localeCompare(right[0]));
}

function describeBalance(scores: AnalysisResult['balanceScores']): string {
  const signals = rankBalanceSignals(scores);
  if (signals.length === 0) {
    return 'Add ingredients to shape the flavor.';
  }

  const phrases = signals.slice(0, 3).map(([axis, score]) => {
    const adjective = score > 0 ? BALANCE_ADJECTIVE[axis].positive : BALANCE_ADJECTIVE[axis].negative;
    return `${intensityWord(score)} ${adjective}`;
  });

  if (phrases.length === 1) {
    return `So far, it's leaning ${phrases[0]}.`;
  }

  const last = phrases.pop();
  return `So far, it's leaning ${phrases.join(', ')}${phrases.length > 0 ? ', and ' : ''}${last}.`;
}

function describeBalanceCauses(scores: AnalysisResult['balanceScores']): string {
  const signals = rankBalanceSignals(scores).slice(0, 3);
  if (signals.length === 0) {
    return 'Caused by: the current build is still light on ingredient signal.';
  }

  return `Caused by: ${signals.map(([axis, score]) => `${BALANCE_LABELS[axis]} ${formatSignedScore(score)}`).join(', ')}.`;
}

function rankTrySuggestions(suggestions: readonly Suggestion[]): Suggestion[] {
  const preferred = suggestions.filter(suggestion => suggestion.bucket !== 'fallback');
  return (preferred.length > 0 ? preferred : suggestions).slice(0, 3);
}

export function AnalysisPanel({
  analysis,
  stepSuggestions = [],
  onTryIngredient = () => undefined,
}: AnalysisPanelProps) {
  const rankedCuisines = rankCuisineScores(analysis.cuisineScores);
  const rankedTrySuggestions = rankTrySuggestions(stepSuggestions);
  const noAdvisories =
    analysis.warnings.length === 0 &&
    analysis.timingFindings.length === 0;

  return (
    <>
      <section className="composer-panel composer-panel--balance" aria-labelledby="balance-title">
        <div className="panel-heading">
          <h2 id="balance-title">Flavor balance</h2>
        </div>
        <p className="balance-summary">{describeBalance(analysis.balanceScores)}</p>
        <p className="balance-causes">{describeBalanceCauses(analysis.balanceScores)}</p>
        <ul className="analysis-score-list">
          {(Object.entries(analysis.balanceScores) as Array<[BalanceAxis, number]>).map(([axis, score]) => (
            <li key={axis} className="analysis-score-row">
              <span className="analysis-score-label">{BALANCE_LABELS[axis]}</span>
              <div className="analysis-score-track" aria-hidden="true">
                <span
                  className="analysis-score-fill"
                  style={{ width: `${Math.min(100, Math.max(0, score * 8))}%` }}
                />
              </div>
              <span className="analysis-score-value">{score}</span>
            </li>
          ))}
        </ul>
        <div className="balance-try-panel" aria-label="Try ingredients">
          <h3 className="analysis-section-title">Try:</h3>
          {rankedTrySuggestions.length === 0 ? (
            <p className="analysis-empty-note">No step-ranked ingredients are ready yet.</p>
          ) : (
            <div className="balance-try-list">
              {rankedTrySuggestions.map(suggestion => (
                <button
                  key={suggestion.ingredientId}
                  type="button"
                  className="balance-try-chip"
                  onClick={() => onTryIngredient(suggestion.ingredientId)}
                >
                  Try {suggestion.ingredientId.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="composer-panel composer-panel--cuisine" aria-labelledby="cuisine-title">
        <div className="panel-heading">
          <h2 id="cuisine-title">Cuisine</h2>
        </div>
        {rankedCuisines.length === 0 ? (
          <p className="analysis-empty-note">No non-universal cuisine signal yet.</p>
        ) : (
          <ol className="analysis-ranking">
            {rankedCuisines.slice(0, 5).map(([cuisine, score]) => (
              <li key={cuisine} className="analysis-ranking__item">
                <span>{formatCuisineLabel(cuisine)}</span>
                <span>{score}</span>
              </li>
            ))}
          </ol>
          )}
      </section>

      <section className="composer-panel composer-panel--advisories" aria-labelledby="advisories-title">
        <div className="panel-heading">
          <h2 id="advisories-title">Advisories</h2>
        </div>
        {noAdvisories ? (
          <p className="analysis-empty-note">No advisories for the current build.</p>
        ) : (
          <ul className="analysis-list">
            {analysis.warnings.map(warning => (
              <li key={warning.id} className={`analysis-list__item analysis-list__item--${warning.severity}`}>
                <span className="analysis-list__severity">{warning.severity}</span>
                <p className="analysis-list__message">{warning.message}</p>
              </li>
            ))}
            {analysis.timingFindings.map(finding => (
              <li key={`timing:${finding.ingredientId}:${finding.message}`} className="analysis-list__item analysis-list__item--timing">
                <span className="analysis-list__severity">timing</span>
                <p className="analysis-list__message">{finding.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

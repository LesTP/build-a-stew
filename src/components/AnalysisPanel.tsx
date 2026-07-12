import type { AnalysisResult, BalanceAxis, CuisineTag, StewBuild } from '../types';

interface AnalysisPanelProps {
  build: StewBuild;
  analysis: AnalysisResult;
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

function formatCuisineLabel(cuisine: CuisineTag): string {
  return cuisine.replaceAll('_', ' ');
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function rankCuisineScores(scores: AnalysisResult['cuisineScores']): Array<[CuisineTag, number]> {
  return Object.entries(scores)
    .filter(([cuisine, score]) => cuisine !== 'universal' && score > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])) as Array<[CuisineTag, number]>;
}

export function AnalysisPanel({ build, analysis }: AnalysisPanelProps) {
  const rankedCuisines = rankCuisineScores(analysis.cuisineScores);
  const topCuisine = rankedCuisines[0];

  return (
    <div>
      <div className="panel-heading">
        <h2 id="analysis-title">Analysis</h2>
      </div>

      <p className="panel-copy">
        {formatCount(build.ingredients.length, 'ingredient')} in the build.
      </p>
      <p className="panel-copy">
        {topCuisine
          ? `Cuisine affinity is led by ${formatCuisineLabel(topCuisine[0])}.`
          : 'No non-universal cuisine signal yet.'}
      </p>

      <div className="detail-section">
        <h3 className="analysis-section-title">Balance scores</h3>
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
      </div>

      <div className="detail-section">
        <h3 className="analysis-section-title">Cuisine affinity</h3>
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
      </div>

      <div className="detail-section">
        <h3 className="analysis-section-title">Advisories</h3>
        {analysis.warnings.length === 0 && analysis.suggestions.length === 0 && analysis.timingFindings.length === 0 ? (
          <p className="analysis-empty-note">No advisories for the current build.</p>
        ) : (
          <ul className="analysis-list">
            {analysis.warnings.map(warning => (
              <li key={warning.id} className={`analysis-list__item analysis-list__item--${warning.severity}`}>
                <span className="analysis-list__severity">{warning.severity}</span>
                <p className="analysis-list__message">{warning.message}</p>
              </li>
            ))}
            {analysis.suggestions.map(suggestion => (
              <li key={`suggestion:${suggestion.ingredientId}:${suggestion.message}`} className="analysis-list__item analysis-list__item--suggestion">
                <span className="analysis-list__severity">suggestion</span>
                <p className="analysis-list__message">
                  {suggestion.message}
                  <span className="analysis-list__meta">{` ${suggestion.ingredientId.replaceAll('_', ' ')}`}</span>
                </p>
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
      </div>
    </div>
  );
}

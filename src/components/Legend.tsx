const REASON_ICONS = {
  cuisine: '🍽',
  balance: '⚖',
  timing: '⏱',
  caution: '⚠',
} as const;

const REASON_LABELS: Record<keyof typeof REASON_ICONS, string> = {
  cuisine: 'cuisine fit',
  balance: 'balance / pairing',
  timing: 'timing',
  caution: 'caution',
};

type ReasonKey = keyof typeof REASON_ICONS;

interface LegendProps {
  categories: readonly string[];
  reasons: readonly string[];
}

export function Legend({ categories, reasons }: LegendProps) {
  if (categories.length === 0 && reasons.length === 0) {
    return null;
  }

  return (
    <section className="picker-legend" aria-label="Legend">
      {categories.length > 0 ? (
        <div className="legend-group">
          <h3 className="legend-title">Category</h3>
          <ul className="legend-list legend-list--categories">
            {categories.map(category => (
              <li key={category} className="legend-item">
                <span className={`legend-swatch legend-swatch--${category}`} aria-hidden="true" />
                <span className="legend-label">{category}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {reasons.length > 0 ? (
        <div className="legend-group">
          <h3 className="legend-title">Why it fits</h3>
          <ul className="legend-list legend-list--reasons">
            {reasons.map(reason => (
              <li key={reason} className="legend-item">
                <span className={`step-reason-icon step-reason-icon--${reason}`} aria-hidden="true">
                  {REASON_ICONS[reason as ReasonKey]}
                </span>
                <span className="legend-label">{REASON_LABELS[reason as ReasonKey]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

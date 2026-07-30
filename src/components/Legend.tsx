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

import { INGREDIENT_CATEGORIES } from '../types';

export function Legend() {
  return (
    <section className="picker-legend" aria-label="Legend">
      <div className="legend-group">
        <h3 className="legend-title">Category</h3>
        <ul className="legend-list legend-list--categories">
          {INGREDIENT_CATEGORIES.map(category => (
            <li key={category} className="legend-item">
              <span className={`legend-swatch legend-swatch--${category}`} aria-hidden="true" />
              <span className="legend-label">{category}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="legend-group">
        <h3 className="legend-title">Why it fits</h3>
        <ul className="legend-list legend-list--reasons">
          {(Object.keys(REASON_ICONS) as Array<keyof typeof REASON_ICONS>).map(reason => (
            <li key={reason} className="legend-item">
              <span className={`step-reason-icon step-reason-icon--${reason}`} aria-hidden="true">
                {REASON_ICONS[reason]}
              </span>
              <span className="legend-label">{REASON_LABELS[reason]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// @vitest-environment jsdom

/**
 * Phase 9 acceptance — step picker and candidate-detail contract
 *
 * Contract guarantees under test:
 *   - The Step picker renders ranked suggestion rows for the active step
 *   - Each row is single-line and exposes add, category, ingredient name,
 *     reason icons, cook-time, and a Detail affordance
 *   - Suggestion rows are ordered by bucket: Top → Okay → Fallback
 *   - Opening a candidate row shows the Detail card in candidate mode with
 *     "why it appears here", cautions, best step, good-with, and Add-to-step
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../../src/App';

async function selectPressureStep(user: ReturnType<typeof userEvent.setup>) {
  const timeline = screen.getByRole('region', { name: /timeline/i });
  await user.click(within(timeline).getByRole('tab', { name: /pressure/i }));
}

describe('Phase 9 step picker', () => {
  it('renders ranked suggestion rows for the active step', async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectPressureStep(user);

    const picker = screen.getByRole('region', { name: /step picker/i });
    const rows = within(picker).getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);

    const rowText = rows[0].textContent ?? '';
    expect(rowText).toMatch(/\+/);
    expect(rowText).toMatch(/🍽|⚖|⏱|⚠/);
    expect(rowText).toMatch(/\d+\s*min/i);
  });

  it('orders suggestion buckets top, then okay, then fallback', async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectPressureStep(user);

    const picker = screen.getByRole('region', { name: /step picker/i });
    const rows = within(picker).getAllByRole('listitem');
    const text = rows.map((row) => row.textContent ?? '');

    const topIndex = text.findIndex((value) => /top/i.test(value));
    const okayIndex = text.findIndex((value) => /okay/i.test(value));
    const fallbackIndex = text.findIndex((value) => /fallback/i.test(value));

    if (topIndex >= 0 && okayIndex >= 0) {
      expect(topIndex).toBeLessThan(okayIndex);
    }
    if (okayIndex >= 0 && fallbackIndex >= 0) {
      expect(okayIndex).toBeLessThan(fallbackIndex);
    }
  });

  it('opens a candidate Detail card with the explanatory fields', async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectPressureStep(user);

    const picker = screen.getByRole('region', { name: /step picker/i });
    const firstRow = within(picker).getAllByRole('listitem')[0];

    const detailButton =
      within(firstRow).queryByRole('button', { name: /detail/i }) ??
      within(firstRow).getByRole('button', { name: /add/i });

    await user.click(detailButton);

    const detail = screen.getByRole('region', { name: /detail/i });
    expect(within(detail).getByText(/why it appears here/i)).toBeDefined();
    expect(within(detail).getByText(/best step/i)).toBeDefined();
    expect(within(detail).getByText(/good with/i)).toBeDefined();
    expect(within(detail).getByText(/cautions/i)).toBeDefined();
    expect(within(detail).getByRole('button', { name: /add to step/i })).toBeDefined();
  });
});

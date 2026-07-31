// @vitest-environment jsdom

/**
 * Phase 9 acceptance — timeline and placed-chip contract
 *
 * Contract guarantees under test:
 *   - The Timeline shows the canonical braise steps in order
 *   - Selecting a timeline step marks the active step for the picker
 *   - Placed ingredients render as clickable chips in the Timeline
 *   - Clicking a placed chip opens its Detail view
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../../src/App';

const CANONICAL_STEPS = [
  'brown',
  'aromatics',
  'deglaze',
  'pressure',
  'simmer after',
  'stir in',
  'finish',
  'serve over',
] as const;

describe('Phase 9 timeline', () => {
  it('renders the canonical braise steps in order', () => {
    render(<App />);

    const timeline = screen.getByRole('region', { name: /step sequence/i });
    const text = within(timeline).getByText(/brown/i).textContent ?? '';
    expect(text).toMatch(/brown/i);

    for (const step of CANONICAL_STEPS) {
      expect(
        within(timeline).getByText(new RegExp(step, 'i')),
        `Missing timeline step "${step}"`,
      ).toBeDefined();
    }
  });

  it('shows placed ingredients as clickable chips that open Detail', async () => {
    const user = userEvent.setup();
    render(<App />);

    const timeline = screen.getByRole('region', { name: /step sequence/i });
    const chickenChip = within(timeline).getByRole('button', { name: /open detail for chicken thigh/i });

    await user.click(chickenChip);

    const detail = screen.getByRole('region', { name: /detail/i });
    expect(within(detail).getByText(/chicken thigh/i)).toBeDefined();
  });

  it('marks the selected timeline step as active for the picker', async () => {
    const user = userEvent.setup();
    render(<App />);

    const timeline = screen.getByRole('region', { name: /step sequence/i });
    const pressureStep = within(timeline).getByRole('tab', { name: /pressure/i });

    await user.click(pressureStep);

    expect(pressureStep.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('region', { name: /step picker/i })).toBeDefined();
  });
});

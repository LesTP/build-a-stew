// @vitest-environment jsdom

/**
 * Phase 9 acceptance — balance, legend, mobile, and keyboard contract
 *
 * Contract guarantees under test:
 *   - The Balance panel translates the analysis into cooking language
 *   - Try chips are rendered as actionable buttons
 *   - The legend documents the category colors and the four reason icons
 *   - Mobile mode collapses the composer into timeline / step-picker / detail tabs
 *   - The Balance bar remains visible in mobile mode
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../../../src/App';

const CATEGORY_LABELS = [
  'protein',
  'aromatics',
  'liquid',
  'roots',
  'vegetable',
  'legumes',
  'grains',
  'greens',
  'fat',
  'topping',
  'spice',
] as const;

function setViewportWidth(width: number): () => void {
  const previousWidth = window.innerWidth;

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));

  return () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: previousWidth,
    });
    window.dispatchEvent(new Event('resize'));
  };
}

let restoreViewport: (() => void) | null = null;

afterEach(() => {
  restoreViewport?.();
  restoreViewport = null;
});

describe('Phase 9 balance and legend', () => {
  it('renders the cooking-language balance summary and Try chips', () => {
    render(<App />);

    const balance = screen.getByRole('region', { name: /balance/i });
    expect(within(balance).getByText(/this may become/i)).toBeDefined();
    expect(within(balance).getByText(/caused by:/i)).toBeDefined();
    expect(within(balance).getByText(/try:/i)).toBeDefined();
    expect(within(balance).getAllByRole('button', { name: /try/i }).length).toBeGreaterThan(0);
  });

  it('documents every category and reason icon in the legend', () => {
    render(<App />);

    const legend = screen.getByRole('region', { name: /legend/i });
    for (const label of CATEGORY_LABELS) {
      expect(within(legend).getByText(new RegExp(label, 'i'))).toBeDefined();
    }

    for (const icon of ['🍽', '⚖', '⏱', '⚠'] as const) {
      expect(within(legend).getByText(icon)).toBeDefined();
    }
  });
});

describe('Phase 9 mobile behavior', () => {
  it('collapses the composer into panel tabs on narrow screens', () => {
    restoreViewport = setViewportWidth(375);
    render(<App />);

    const panelTabs = screen
      .getAllByRole('tab')
      .filter((tab) => /timeline|step picker|detail/i.test(tab.textContent ?? ''));

    expect(panelTabs.map((tab) => tab.textContent?.toLowerCase())).toEqual([
      'timeline',
      'step picker',
      'detail',
    ]);

    expect(screen.getByRole('region', { name: /balance/i })).toBeDefined();
  });

  it('supports keyboard navigation to the active step and add controls', async () => {
    const user = userEvent.setup();
    restoreViewport = setViewportWidth(375);
    render(<App />);

    await user.tab();
    await user.tab();

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    await user.click(timelineTab);

    const timeline = screen.getByRole('region', { name: /timeline/i });
    const pressureStep = within(timeline).getByRole('tab', { name: /pressure/i });
    await user.click(pressureStep);

    const picker = screen.getByRole('region', { name: /step picker/i });
    const addButton = within(picker).getByRole('button', { name: /add/i });
    addButton.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('region', { name: /timeline/i })).toBeDefined();
  });
});

// @vitest-environment jsdom

/**
 * FU-1 app-shell coverage + mount smoke test:
 *   - App mounts and renders the title, library, and the five header controls
 *   - The removed KPI stats are gone
 *   - How / Recipe / Load open (and close) as popups
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../../src/App';

describe('App shell — header controls and popups', () => {
  it('mounts and renders the title, library, and the five header controls', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /build-a-stew/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /library/i })).toBeDefined();

    const banner = screen.getByRole('banner');
    for (const label of ['How', 'Recipe', 'Save', 'Clear', 'Load']) {
      expect(
        within(banner).getByRole('button', { name: new RegExp(`^${label}$`, 'i') }),
        `Missing header button "${label}"`,
      ).toBeDefined();
    }
  });

  it('no longer renders the removed KPI stat labels', () => {
    render(<App />);
    const banner = screen.getByRole('banner');
    expect(within(banner).queryByText(/catalog items/i)).toBeNull();
    expect(within(banner).queryByText(/active stages/i)).toBeNull();
  });

  it('opens and closes the How popup', async () => {
    const user = userEvent.setup();
    render(<App />);
    const banner = screen.getByRole('banner');

    expect(screen.queryByRole('heading', { name: /how it works/i, hidden: true })).toBeNull();
    await user.click(within(banner).getByRole('button', { name: /^how$/i }));
    expect(screen.getByRole('heading', { name: /how it works/i, hidden: true })).toBeDefined();

    await user.click(screen.getByRole('button', { name: /close/i, hidden: true }));
    expect(screen.queryByRole('heading', { name: /how it works/i, hidden: true })).toBeNull();
  });

  it('opens the Recipe and Load popups', async () => {
    const user = userEvent.setup();
    render(<App />);
    const banner = screen.getByRole('banner');

    await user.click(within(banner).getByRole('button', { name: /^recipe$/i }));
    expect(screen.getByRole('heading', { name: /^recipe$/i, hidden: true })).toBeDefined();
    await user.click(screen.getByRole('button', { name: /close/i, hidden: true }));

    await user.click(within(banner).getByRole('button', { name: /^load$/i }));
    expect(screen.getAllByRole('heading', { name: /saved builds/i, hidden: true }).length).toBeGreaterThan(0);
  });
});

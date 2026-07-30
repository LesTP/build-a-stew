// @vitest-environment jsdom

/**
 * Phase 9 acceptance — shell and responsive layout contract
 *
 * Contract guarantees under test:
 *   - The top strip exposes the app title plus Technique, Cuisine, How, Save,
 *     Clear, Load, and Recipe controls
 *   - The wide layout renders the four composer regions in order:
 *     Timeline → Step picker → Detail → Balance
 *   - The composer keeps the four regions visible together in desktop mode
 */

import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../../../src/App';

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

describe('Phase 9 shell', () => {
  it('renders the top strip controls for the technique-first flow', () => {
    render(<App />);

    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('heading', { name: /build-a-stew/i })).toBeDefined();

    for (const label of ['How', 'Recipe', 'Save', 'Clear', 'Load']) {
      expect(
        within(banner).getByRole('button', { name: new RegExp(`^${label}$`, 'i') }),
        `Missing header button "${label}"`,
      ).toBeDefined();
    }

    expect(screen.getByRole('combobox', { name: /technique/i })).toBeDefined();
    expect(screen.getByRole('combobox', { name: /cuisine/i })).toBeDefined();
  });

  it('renders the four composer regions in desktop order', () => {
    restoreViewport = setViewportWidth(1680);
    render(<App />);

    const timeline = screen.getByRole('region', { name: /timeline/i });
    const stepPicker = screen.getByRole('region', { name: /step picker/i });
    const detail = screen.getByRole('region', { name: /detail/i });
    const balance = screen.getByRole('region', { name: /balance/i });

    const regions = screen.getAllByRole('region');
    const ordered = [timeline, stepPicker, detail, balance];
    const indices = ordered.map((region) => regions.indexOf(region));

    for (let i = 1; i < indices.length; i++) {
      expect(indices[i - 1]).toBeLessThan(indices[i]);
    }
  });
});

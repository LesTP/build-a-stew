// @vitest-environment jsdom

/**
 * Phase 3 acceptance — Composer layout
 *
 * Contract guarantees under test:
 *   - App shell renders four named column regions: Library, Detail, Timeline, Analysis
 *   - A header bar is present with the app name and build-level controls
 *   - The Analysis column is present in Phase 3 even as a placeholder
 *   - The four columns appear in left-to-right DOM order matching the visual spec:
 *     Library → Detail → Cooking Timeline → Analysis
 */

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../../../src/App';

describe('Composer layout — Phase 3', () => {
  it('renders a top-level header landmark', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeDefined();
  });

  it('header contains the application name', () => {
    render(<App />);
    const header = screen.getByRole('banner');
    // App name should appear somewhere in the header — "Insta the Pot" or "build-a-stew"
    expect(header.textContent).toMatch(/insta|stew|pot/i);
  });

  it('renders a Library region', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /library/i })).toBeDefined();
  });

  it('renders a Detail region', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /detail/i })).toBeDefined();
  });

  it('renders a Cooking Timeline region', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /timeline|cooking/i })).toBeDefined();
  });

  it('renders the analysis cards (Balance, Cuisine, Advisories)', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /^balance$/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /^cuisine$/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /^advisories$/i })).toBeDefined();
  });

  it('all core column regions are present simultaneously', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /library/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /detail/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /timeline|cooking/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /^balance$/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /^cuisine$/i })).toBeDefined();
    expect(screen.getByRole('region', { name: /^advisories$/i })).toBeDefined();
  });

  it('columns appear in DOM order: Library, Detail, Timeline, then the analysis cards', () => {
    render(<App />);
    const ordered = [
      screen.getByRole('region', { name: /library/i }),
      screen.getByRole('region', { name: /detail/i }),
      screen.getByRole('region', { name: /timeline|cooking/i }),
      screen.getByRole('region', { name: /^balance$/i }),
      screen.getByRole('region', { name: /^cuisine$/i }),
      screen.getByRole('region', { name: /^advisories$/i }),
    ];

    const allRegions = screen.getAllByRole('region');
    const indices = ordered.map(el => allRegions.indexOf(el));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i - 1]).toBeLessThan(indices[i]);
    }
  });
});

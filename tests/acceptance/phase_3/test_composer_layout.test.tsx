// @vitest-environment jsdom

/**
 * Phase 3 acceptance — Composer layout
 *
 * Contract guarantees under test:
 *   - App shell renders four named column regions: Library, Detail, Timeline, Analysis
 *   - A header bar is present with the app name and build-level controls
 *   - The Analysis column is present in Phase 3 even as a placeholder
 *   - (The v1 left-to-right DOM-order guarantee, Library → Detail → Timeline →
 *     Analysis, is RETIRED: the technique-first redesign reorders the composer
 *     to Timeline → Step picker → Detail. See D-37 / D-42 and the Phase 9 suite
 *     test_shell_and_layout. The region-PRESENCE guarantees below still hold.)
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
});

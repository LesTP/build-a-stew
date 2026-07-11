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

  it('renders an Analysis region', () => {
    render(<App />);
    expect(screen.getByRole('region', { name: /analysis/i })).toBeDefined();
  });

  it('all four column regions are present simultaneously', () => {
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    const detail = screen.getByRole('region', { name: /detail/i });
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    const analysis = screen.getByRole('region', { name: /analysis/i });
    expect(library).toBeDefined();
    expect(detail).toBeDefined();
    expect(timeline).toBeDefined();
    expect(analysis).toBeDefined();
  });

  it('four columns appear in the correct DOM order: Library, Detail, Timeline, Analysis', () => {
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    const detail = screen.getByRole('region', { name: /detail/i });
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    const analysis = screen.getByRole('region', { name: /analysis/i });

    const allRegions = screen.getAllByRole('region');
    const indices = [library, detail, timeline, analysis].map(el =>
      allRegions.indexOf(el)
    );
    // Each successive column must appear after the previous in DOM order
    expect(indices[0]).toBeLessThan(indices[1]);
    expect(indices[1]).toBeLessThan(indices[2]);
    expect(indices[2]).toBeLessThan(indices[3]);
  });

  it('analysis column is present as a placeholder — its content need not be computed in Phase 3', () => {
    render(<App />);
    const analysis = screen.getByRole('region', { name: /analysis/i });
    // The column exists; content verification is Phase 4's concern
    expect(analysis).toBeDefined();
  });
});

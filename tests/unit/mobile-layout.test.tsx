// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../../src/App';

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

describe('mobile composer layout', () => {
  it('shows one active panel at a time while keeping Balance visible', async () => {
    const user = userEvent.setup();
    restoreViewport = setViewportWidth(375);
    render(<App />);

    expect(screen.getByRole('region', { name: /step sequence/i })).toBeDefined();
    expect(screen.queryByRole('region', { name: /step picker/i })).toBeNull();
    expect(screen.queryByRole('region', { name: /detail/i })).toBeNull();
    expect(screen.getByRole('region', { name: /balance/i })).toBeDefined();

    await user.click(screen.getByRole('tab', { name: /step picker/i }));
    expect(screen.getByRole('region', { name: /step picker/i })).toBeDefined();
    expect(screen.queryByRole('region', { name: /step sequence/i })).toBeNull();

    await user.click(screen.getByRole('tab', { name: /detail/i }));
    expect(screen.getByRole('region', { name: /detail/i })).toBeDefined();
    expect(screen.queryByRole('region', { name: /step picker/i })).toBeNull();

    const panelTabs = screen
      .getAllByRole('tab')
      .filter((tab) => /timeline|step picker|detail/i.test(tab.textContent ?? ''));

    expect(panelTabs.map((tab) => tab.textContent?.toLowerCase())).toEqual([
      'timeline',
      'step picker',
      'detail',
    ]);
  });

  it('returns focus to the Timeline tab after adding an ingredient on mobile', async () => {
    const user = userEvent.setup();
    restoreViewport = setViewportWidth(375);
    render(<App />);

    await user.click(screen.getByRole('tab', { name: /step picker/i }));

    const addButton = screen.getByRole('button', { name: /^add /i });
    await user.click(addButton);

    const timelineTab = screen.getByRole('tab', { name: /timeline/i });
    expect(screen.getByRole('region', { name: /step sequence/i })).toBeDefined();
    expect(document.activeElement).toBe(timelineTab);
  });
});

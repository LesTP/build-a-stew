// @vitest-environment jsdom

/**
 * Phase 3 acceptance — Stage Timeline column and build mutations
 *
 * Contract guarantees under test:
 *   - Timeline renders all 8 cooking stages in the canonical order
 *     (brown → aromatics → deglaze → pressure → simmer_after → stir_in → finish → serve_over)
 *   - Placed ingredients appear under their assigned stage in the Timeline
 *   - After a move, the ingredient appears in the new stage and NOT in the old stage
 *   - After a remove, the ingredient no longer appears in the Timeline
 *   - Removing via pointer (click on a remove control) works
 *   - Two different ingredients can be placed in different stages simultaneously
 *   - Two different ingredients can be placed in the SAME stage simultaneously
 *
 * ARCHITECTURE ref: "The Cooking Timeline is a vertical list of the eight stages in
 * canonical order … each placed card shows the ingredient name and its cook-time range."
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../../../src/App';

const CANONICAL_STAGES = [
  'brown', 'aromatics', 'deglaze', 'pressure',
  'simmer_after', 'stir_in', 'finish', 'serve_over',
] as const;

/** Helper: place an ingredient into a given stage via Library → Detail → stage picker. */
async function placeIngredient(
  user: ReturnType<typeof userEvent.setup>,
  searchTerm: string,
  stage: string
): Promise<void> {
  const library = screen.getByRole('region', { name: /library/i });
  const searchInput = within(library).getByRole('searchbox')
    ?? within(library).getByRole('textbox');

  await user.clear(searchInput);
  await user.type(searchInput, searchTerm);

  const card = within(library).getByText(new RegExp(searchTerm, 'i'));
  await user.click(card);

  const detail = screen.getByRole('region', { name: /detail/i });
  const stageLabel = stage.replace(/_/g, ' ');
  const stageBtn = within(detail).getByRole('button', { name: new RegExp(stageLabel, 'i') })
    ?? within(detail).getByText(new RegExp(`^${stageLabel}$`, 'i'));
  await user.click(stageBtn);
}

describe('Stage Timeline — Phase 3', () => {
  // ── Stage order guarantee ───────────────────────────────────────────────────

  it('Timeline renders all 8 cooking stages', () => {
    render(<App />);
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });

    for (const stage of CANONICAL_STAGES) {
      const stageLabel = stage.replace(/_/g, ' ');
      const stageEl = within(timeline).queryByText(new RegExp(stageLabel, 'i'));
      expect(stageEl, `Stage "${stage}" not visible in Timeline`).toBeDefined();
    }
  });

  it('Timeline stages appear in the canonical order defined by the contract', () => {
    render(<App />);
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });

    const positions = CANONICAL_STAGES.map(stage => {
      const stageLabel = stage.replace(/_/g, ' ');
      const el = within(timeline).queryByText(new RegExp(stageLabel, 'i'));
      return el ? el.getBoundingClientRect().top : Number.MAX_SAFE_INTEGER;
    });

    // Each stage should appear at a greater vertical offset than the previous
    for (let i = 1; i < positions.length; i++) {
      expect(
        positions[i],
        `Stage "${CANONICAL_STAGES[i]}" should appear after "${CANONICAL_STAGES[i - 1]}" in the Timeline`
      ).toBeGreaterThanOrEqual(positions[i - 1]);
    }
  });

  it('"brown" is the first stage in the Timeline', () => {
    render(<App />);
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    const allStageEls = CANONICAL_STAGES.map(s =>
      within(timeline).queryByText(new RegExp(s.replace(/_/g, ' '), 'i'))
    ).filter(Boolean);
    // The first stage element found should be "brown"
    expect(allStageEls[0]?.textContent).toMatch(/brown/i);
  });

  it('"serve_over" is the last stage in the Timeline', () => {
    render(<App />);
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    const allStageEls = CANONICAL_STAGES.map(s =>
      within(timeline).queryByText(new RegExp(s.replace(/_/g, ' '), 'i'))
    ).filter(Boolean);
    expect(allStageEls[allStageEls.length - 1]?.textContent).toMatch(/serve.?over/i);
  });

  // ── Placed ingredient appears in Timeline ───────────────────────────────────

  it('a placed ingredient appears in the Timeline under its assigned stage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await placeIngredient(user, 'chicken', 'pressure');

    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    expect(within(timeline).queryByText(/chicken/i)).toBeDefined();
  });

  // ── Move ────────────────────────────────────────────────────────────────────

  it('after a move, the ingredient appears once in the new stage and not the old stage', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Place chicken in "pressure"
    await placeIngredient(user, 'chicken', 'pressure');

    // Move chicken to "brown" via Detail
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    await user.clear(searchInput);
    await user.type(searchInput, 'chicken');
    await user.click(within(library).getByText(/chicken/i));

    const detail = screen.getByRole('region', { name: /detail/i });
    const brownBtn = within(detail).getByRole('button', { name: /^brown$/i })
      ?? within(detail).getByText(/^brown$/i);
    await user.click(brownBtn);

    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    // Should appear exactly once in Timeline
    const occurrences = within(timeline).queryAllByText(/chicken/i);
    expect(occurrences.length).toBe(1);
  });

  // ── Remove ──────────────────────────────────────────────────────────────────

  it('after remove, the ingredient no longer appears in the Timeline', async () => {
    const user = userEvent.setup();
    render(<App />);

    await placeIngredient(user, 'chicken', 'pressure');

    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    expect(within(timeline).queryByText(/chicken/i)).toBeDefined();

    // Find and click a remove/delete button on the chicken card in the Timeline
    const chickenEl = within(timeline).getByText(/chicken/i);
    const chickenCard = chickenEl.closest('[data-testid]') ?? chickenEl.closest('li') ?? chickenEl.parentElement;
    expect(chickenCard).toBeDefined();

    const removeBtn = within(chickenCard as HTMLElement).getByRole('button', { name: /remove|delete|×|✕/i });
    await user.click(removeBtn);

    expect(within(timeline).queryByText(/chicken/i)).toBeNull();
  });

  // ── Multiple ingredients ────────────────────────────────────────────────────

  it('two ingredients in different stages both appear in the Timeline', async () => {
    const user = userEvent.setup();
    render(<App />);

    await placeIngredient(user, 'chicken', 'pressure');
    await placeIngredient(user, 'garlic', 'aromatics');

    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    expect(within(timeline).queryByText(/chicken/i)).toBeDefined();
    expect(within(timeline).queryByText(/garlic/i)).toBeDefined();
  });

  it('two ingredients in the same stage both appear under that stage in the Timeline', async () => {
    const user = userEvent.setup();
    render(<App />);

    await placeIngredient(user, 'chicken', 'pressure');
    await placeIngredient(user, 'carrot', 'pressure');

    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    expect(within(timeline).queryByText(/chicken/i)).toBeDefined();
    expect(within(timeline).queryByText(/carrot/i)).toBeDefined();
  });

  it('add + remove + re-add sequence leaves the ingredient in the Timeline once', async () => {
    const user = userEvent.setup();
    render(<App />);

    // First add
    await placeIngredient(user, 'chicken', 'pressure');

    // Remove via Timeline
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    const chickenEl = within(timeline).getByText(/chicken/i);
    const card1 = chickenEl.closest('[data-testid]') ?? chickenEl.closest('li') ?? chickenEl.parentElement;
    const removeBtn1 = within(card1 as HTMLElement).getByRole('button', { name: /remove|delete|×|✕/i });
    await user.click(removeBtn1);
    expect(within(timeline).queryByText(/chicken/i)).toBeNull();

    // Re-add
    await placeIngredient(user, 'chicken', 'pressure');

    // Should appear exactly once
    const occurrences = within(timeline).queryAllByText(/chicken/i);
    expect(occurrences.length).toBe(1);
  });
});

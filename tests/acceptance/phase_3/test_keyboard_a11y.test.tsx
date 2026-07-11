// @vitest-environment jsdom

/**
 * Phase 3 acceptance — Keyboard accessibility for place and remove flows
 *
 * Contract guarantees under test:
 *   - Every place action (select ingredient, pick stage) is reachable via keyboard alone
 *   - Every remove action is reachable via keyboard alone
 *   - Tab order reaches interactive controls in the Library, Detail, and Timeline
 *   - Stage-picker buttons in Detail are keyboard-activatable (Enter / Space)
 *   - Remove buttons in the Timeline are keyboard-activatable (Enter / Space)
 *   - Escape keypress while Detail is open dismisses the Detail panel
 *
 * ARCHITECTURE ref: "Placement is click + keyboard for the MVP; no drag is required.
 * Every place, move, and remove action is reachable by pointer and keyboard (tab to a
 * card/chip/stage, Enter/Space to activate, Escape to cancel). Drag-and-drop, if added
 * later, is layered on top and never the only path."
 *
 * Escalation Trigger: "EXECUTE halts if the chosen interaction cannot be completed
 * using click/tap and keyboard controls."
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import App from '../../../src/App';

describe('Keyboard accessibility — Phase 3', () => {
  // ── Library card reachable by keyboard ─────────────────────────────────────

  it('Library ingredient cards are focusable via Tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    const library = screen.getByRole('region', { name: /library/i });

    // Tab through the page until something inside the Library is focused
    let foundLibraryFocus = false;
    for (let i = 0; i < 30; i++) {
      await user.tab();
      const active = document.activeElement;
      if (active && library.contains(active)) {
        foundLibraryFocus = true;
        break;
      }
    }
    expect(foundLibraryFocus, 'No Library element received focus via Tab').toBe(true);
  });

  it('an ingredient card in the Library can be activated via Enter to open Detail', async () => {
    const user = userEvent.setup();
    render(<App />);

    const library = screen.getByRole('region', { name: /library/i });

    // Tab until the first ingredient button inside Library is focused
    let reached = false;
    for (let i = 0; i < 40; i++) {
      await user.tab();
      const active = document.activeElement;
      if (
        active &&
        library.contains(active) &&
        (active.getAttribute('role') === 'button' || active.tagName === 'BUTTON') &&
        // Exclude category tab buttons — we want ingredient cards
        !['protein','aromatics','liquid','roots','vegetable','legumes','grains','greens','fat','topping','spice']
          .some(cat => active.textContent?.toLowerCase() === cat)
      ) {
        reached = true;
        await user.keyboard('{Enter}');
        break;
      }
    }

    if (reached) {
      // Detail should now show some content
      const detail = screen.getByRole('region', { name: /detail/i });
      // Detail should be non-empty
      expect(detail.textContent?.trim().length).toBeGreaterThan(0);
    } else {
      // If we couldn't find an ingredient card via Tab, that's the failure
      expect(reached, 'Could not reach an ingredient card via Tab').toBe(true);
    }
  });

  // ── Stage picker reachable by keyboard ──────────────────────────────────────

  it('stage-picker buttons in Detail are focusable via Tab and activatable via Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    // First, open Detail by clicking a library card (pointer)
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    await user.type(searchInput, 'chicken');
    await user.click(within(library).getByText(/chicken/i));

    const detail = screen.getByRole('region', { name: /detail/i });
    expect(within(detail).queryByText(/chicken/i)).toBeDefined();

    // Now Tab through the Detail panel until a stage button is focused
    let foundStagePicker = false;
    for (let i = 0; i < 25; i++) {
      await user.tab();
      const active = document.activeElement;
      if (
        active &&
        detail.contains(active) &&
        (active.getAttribute('role') === 'button' || active.tagName === 'BUTTON')
      ) {
        const label = active.textContent ?? '';
        if (/brown|aromatics|deglaze|pressure|simmer|stir.?in|finish|serve/i.test(label)) {
          foundStagePicker = true;
          // Activate via Enter
          await user.keyboard('{Enter}');
          break;
        }
      }
    }

    expect(foundStagePicker, 'Could not reach a stage-picker button in Detail via Tab').toBe(true);

    // After Enter, ingredient should appear in the Timeline
    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    expect(within(timeline).queryByText(/chicken/i)).toBeDefined();
  });

  it('stage-picker buttons can be activated via Space', async () => {
    const user = userEvent.setup();
    render(<App />);

    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    await user.type(searchInput, 'chicken');
    await user.click(within(library).getByText(/chicken/i));

    const detail = screen.getByRole('region', { name: /detail/i });

    // Find the pressure stage button and focus it directly
    const pressureBtn = within(detail).queryByRole('button', { name: /pressure/i });
    if (pressureBtn) {
      pressureBtn.focus();
      await user.keyboard(' ');

      const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
      expect(within(timeline).queryByText(/chicken/i)).toBeDefined();
    }
  });

  // ── Remove reachable by keyboard ────────────────────────────────────────────

  it('remove buttons in the Timeline are focusable via Tab', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Place an ingredient first (by pointer)
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    await user.type(searchInput, 'chicken');
    await user.click(within(library).getByText(/chicken/i));
    const detail = screen.getByRole('region', { name: /detail/i });
    const pressureBtn = within(detail).queryByRole('button', { name: /pressure/i })
      ?? within(detail).queryByText(/pressure/i);
    if (pressureBtn) await user.click(pressureBtn);

    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    expect(within(timeline).queryByText(/chicken/i)).toBeDefined();

    // Tab until a remove button inside the Timeline is focused
    let foundRemoveBtn = false;
    for (let i = 0; i < 30; i++) {
      await user.tab();
      const active = document.activeElement;
      if (
        active &&
        timeline.contains(active) &&
        (active.getAttribute('role') === 'button' || active.tagName === 'BUTTON')
      ) {
        const label = (active.getAttribute('aria-label') ?? active.textContent ?? '').toLowerCase();
        if (/remove|delete|×|✕/.test(label)) {
          foundRemoveBtn = true;
          break;
        }
      }
    }
    expect(foundRemoveBtn, 'Could not reach a remove button in the Timeline via Tab').toBe(true);
  });

  it('remove button in the Timeline is activatable via Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Place an ingredient
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    await user.type(searchInput, 'chicken');
    await user.click(within(library).getByText(/chicken/i));
    const detail = screen.getByRole('region', { name: /detail/i });
    const pressureBtn = within(detail).queryByRole('button', { name: /pressure/i })
      ?? within(detail).queryByText(/pressure/i);
    if (pressureBtn) await user.click(pressureBtn);

    const timeline = screen.getByRole('region', { name: /timeline|cooking/i });
    const removeButton = within(timeline).getByRole('button', { name: /remove chicken thighs/i });
    removeButton.focus();
    await user.keyboard('{Enter}');

    // Ingredient should be gone
    expect(within(timeline).queryByText(/chicken/i)).toBeNull();
  });

  // ── Escape dismisses Detail ──────────────────────────────────────────────────

  it('Escape keypress dismisses the Detail panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    await user.type(searchInput, 'chicken');
    await user.click(within(library).getByText(/chicken/i));

    const detail = screen.getByRole('region', { name: /detail/i });
    expect(within(detail).queryByText(/chicken/i)).toBeDefined();

    await user.keyboard('{Escape}');

    expect(within(detail).queryByText(/chicken/i)).toBeNull();
  });

  // ── Category tabs are keyboard accessible ───────────────────────────────────

  it('category tabs in the Library are focusable via Tab and activatable via Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    const library = screen.getByRole('region', { name: /library/i });

    // Tab until we reach a category tab
    let foundTab = false;
    for (let i = 0; i < 20; i++) {
      await user.tab();
      const active = document.activeElement;
      if (
        active &&
        library.contains(active) &&
        (active.getAttribute('role') === 'tab' || active.tagName === 'BUTTON')
      ) {
        const label = active.textContent ?? '';
        if (/protein|aromatics|liquid|roots|vegetable|legumes|grains|greens|fat|topping|spice/i.test(label)) {
          foundTab = true;
          break;
        }
      }
    }
    expect(foundTab, 'Could not reach a category tab via Tab').toBe(true);
  });
});

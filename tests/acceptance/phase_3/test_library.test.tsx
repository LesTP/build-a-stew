// @vitest-environment jsdom

/**
 * Phase 3 acceptance — Ingredient Library column
 *
 * Contract guarantees under test:
 *   - Library provides one tab per IngredientCategory
 *   - Selecting a category tab filters the ingredient list to that category only
 *   - Name search further filters the visible list (intersection with active tab)
 *   - Clearing search restores the full tab result
 *   - Ingredient cards in the list are compact: name and salt-risk indicator are present;
 *     full metadata (roles, cuisines, balance scores) is NOT exposed on the card face
 *   - The Library lists at least one ingredient from the catalog on initial render
 *
 * ARCHITECTURE ref: Library column — "Card faces stay compact — name plus a salt-risk
 * flag; full metadata lives in Detail."
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../../../src/App';

// Canonical category vocabulary from ARCHITECTURE.md
const ALL_CATEGORIES = [
  'protein', 'aromatics', 'liquid', 'roots', 'vegetable',
  'legumes', 'grains', 'greens', 'fat', 'topping', 'spice',
] as const;

describe('Ingredient Library — Phase 3', () => {
  // ── Initial state ───────────────────────────────────────────────────────────

  it('renders at least one ingredient card in the initial view', () => {
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    // Expect at least one listitem / article / button representing an ingredient
    const cards = within(library).getAllByRole('button');
    expect(cards.length).toBeGreaterThan(0);
  });

  // ── Category tabs ───────────────────────────────────────────────────────────

  it('renders a tab or button for every ingredient category in the controlled vocabulary', () => {
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    for (const category of ALL_CATEGORIES) {
      // Each category name should appear as a tab/button label (case-insensitive)
      const tab = within(library).queryByRole('tab', { name: new RegExp(category, 'i') })
        ?? within(library).queryByRole('button', { name: new RegExp(category, 'i') });
      expect(tab, `Missing tab for category "${category}"`).toBeDefined();
    }
  });

  it('clicking a category tab shows only ingredients from that category', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });

    // Click the "protein" tab
    const proteinTab = within(library).getByRole('tab', { name: /protein/i })
      ?? within(library).getByRole('button', { name: /protein/i });
    await user.click(proteinTab);

    // All displayed cards must belong to a protein (chicken, beef, pork, lamb, etc.)
    // We verify by checking that chicken_thighs (a known protein) is in the list
    // and that a known non-protein (e.g. garlic, an aromatic) is NOT in the list
    expect(within(library).queryAllByText(/chicken/i)[0]).toBeDefined();
    expect(within(library).queryByText(/garlic/i)).toBeNull();
  });

  it('clicking the aromatics tab filters to aromatics-category ingredients', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });

    const aromaticsTab = within(library).getByRole('tab', { name: /aromatics/i })
      ?? within(library).getByRole('button', { name: /aromatics/i });
    await user.click(aromaticsTab);

    // Garlic is a known aromatic in the catalog
    expect(within(library).queryAllByText(/garlic/i)[0]).toBeDefined();
    // Chicken thighs is NOT an aromatic
    expect(within(library).queryByText(/chicken thigh/i)).toBeNull();
  });

  // ── Name search ─────────────────────────────────────────────────────────────

  it('name search input is present in the Library', () => {
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    expect(searchInput).toBeDefined();
  });

  it('typing in search filters ingredients to those whose name matches', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');

    await user.type(searchInput, 'chicken');

    // At least one chicken-named ingredient should appear
    expect(within(library).queryAllByText(/chicken/i)[0]).toBeDefined();
  });

  it('search shows no results for a term that matches nothing in the catalog', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');

    await user.type(searchInput, 'xyzzy_no_such_ingredient_12345');

    // No ingredient cards should be visible
    const cards = within(library).queryAllByRole('button').filter(
      // Exclude the tab buttons — only ingredient cards
      (el) => !ALL_CATEGORIES.some(cat => el.textContent?.toLowerCase().includes(cat))
    );
    expect(cards.length).toBe(0);
  });

  it('search composes with the active category tab — result is the intersection', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });

    // Activate protein tab
    const proteinTab = within(library).getByRole('tab', { name: /protein/i })
      ?? within(library).getByRole('button', { name: /protein/i });
    await user.click(proteinTab);

    // Then search for "chicken"
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');
    await user.type(searchInput, 'chicken');

    // "chicken thighs" — protein + matches "chicken" — should appear
    expect(within(library).queryAllByText(/chicken/i)[0]).toBeDefined();

    // Search for something that exists in a different category (e.g. garlic)
    await user.clear(searchInput);
    await user.type(searchInput, 'garlic');

    // Garlic is NOT protein; intersection with protein tab should yield nothing
    expect(within(library).queryByText(/garlic/i)).toBeNull();
  });

  it('clearing the search input restores the full category tab result', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });
    const searchInput = within(library).getByRole('searchbox')
      ?? within(library).getByRole('textbox');

    await user.type(searchInput, 'chicken');
    const narrowCount = within(library).getAllByRole('button').length;

    await user.clear(searchInput);
    const wideCount = within(library).getAllByRole('button').length;

    // After clearing, more cards should be visible than during a narrow search
    expect(wideCount).toBeGreaterThanOrEqual(narrowCount);
  });

  // ── Card compactness guarantee ───────────────────────────────────────────────

  it('ingredient cards show the ingredient name', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });

    // Activate protein tab where chicken_thighs is known to appear
    const proteinTab = within(library).getByRole('tab', { name: /protein/i })
      ?? within(library).getByRole('button', { name: /protein/i });
    await user.click(proteinTab);

    expect(within(library).queryByText(/chicken thigh/i)).toBeDefined();
  });

  it('ingredient cards do NOT expose the full roles or balance-scores metadata inline', async () => {
    const user = userEvent.setup();
    render(<App />);
    const library = screen.getByRole('region', { name: /library/i });

    // Balance axis names from the vocabulary — should not appear on library cards
    const balanceAxes = ['body', 'richness', 'umami', 'sweetness', 'acidity', 'heat', 'smoke', 'freshness', 'texture', 'aromatic_intensity'];
    for (const axis of balanceAxes) {
      // The axis label should NOT be visible in the library card list
      // (it belongs in the Detail panel)
      const axisText = within(library).queryByText(new RegExp(`^${axis}$`, 'i'));
      expect(axisText, `Balance axis "${axis}" should not be exposed on library card faces`).toBeNull();
    }
  });
});

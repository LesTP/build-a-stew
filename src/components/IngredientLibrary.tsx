import { INGREDIENT_CATEGORIES, type Ingredient, type IngredientCategory } from '../types';
import { handleTablistKeyDown } from './tablist';

interface IngredientLibraryProps {
  catalog: readonly Ingredient[];
  selectedCategory: IngredientCategory | null;
  searchTerm: string;
  onCategoryChange(category: IngredientCategory | null): void;
  onSearchTermChange(searchTerm: string): void;
  onSelectIngredient(ingredientId: string): void;
  selectedIngredientId: string | null;
}

function matchesSearch(ingredient: Ingredient, searchTerm: string): boolean {
  if (searchTerm.trim() === '') {
    return true;
  }

  return ingredient.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
}

function getFilteredIngredients(
  catalog: readonly Ingredient[],
  selectedCategory: IngredientCategory | null,
  searchTerm: string,
): Ingredient[] {
  if (selectedCategory === null && searchTerm.trim() === '') {
    return [];
  }

  return catalog.filter(ingredient => {
    if (selectedCategory !== null && ingredient.category !== selectedCategory) {
      return false;
    }

    return matchesSearch(ingredient, searchTerm);
  });
}

export function IngredientLibrary({
  catalog,
  selectedCategory,
  searchTerm,
  onCategoryChange,
  onSearchTermChange,
  onSelectIngredient,
  selectedIngredientId,
}: IngredientLibraryProps) {
  const filteredIngredients = getFilteredIngredients(catalog, selectedCategory, searchTerm);
  const nothingSelected = selectedCategory === null && searchTerm.trim() === '';

  return (
    <aside className="composer-panel composer-panel--library" role="region" aria-labelledby="library-title">
      <div className="panel-heading">
        <h2 id="library-title">Library</h2>
      </div>

      <div className="library-toolbar">
        <div className="search-field">
          <label className="visually-hidden" htmlFor="ingredient-search">Search ingredients</label>
          <input
            id="ingredient-search"
            type="search"
            role="searchbox"
            value={searchTerm}
            onChange={event => onSearchTermChange(event.currentTarget.value)}
            placeholder="Search ingredients"
          />
        </div>

        <div className="category-tabs" role="tablist" aria-label="Ingredient categories" onKeyDown={handleTablistKeyDown}>
          {INGREDIENT_CATEGORIES.map(category => {
            const active = category === selectedCategory;

            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="library-results-panel"
                className={
                  active
                    ? `category-tab category-tab--${category} category-tab--active`
                    : `category-tab category-tab--${category}`
                }
                onClick={() => onCategoryChange(active ? null : category)}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div id="library-results-panel" className="library-results" role="tabpanel" aria-label="Ingredient cards">
        {filteredIngredients.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <p>{nothingSelected ? 'Pick a category to browse ingredients.' : 'No ingredients match the current filter.'}</p>
          </div>
        ) : (
          <div className="ingredient-card-grid" role="list">
            {filteredIngredients.map(ingredient => {
              const selected = ingredient.id === selectedIngredientId;

              return (
                <div key={ingredient.id} role="listitem">
                  <button
                    type="button"
                    className={
                      selected
                        ? `ingredient-card ingredient-card--${ingredient.category} ingredient-card--selected`
                        : `ingredient-card ingredient-card--${ingredient.category}`
                    }
                    onClick={() => onSelectIngredient(ingredient.id)}
                    aria-pressed={selected}
                  >
                    <span className="ingredient-card__copy">
                      <span className="ingredient-card__name">{ingredient.name}</span>
                      <span className={`ingredient-card__category ingredient-card__category--${ingredient.category}`}>
                        {ingredient.category}
                      </span>
                    </span>
                    {ingredient.saltRisk === 'high' && (
                      <span className="salt-risk salt-risk--high">high salt</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

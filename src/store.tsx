import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { addIngredient, moveIngredient, removeIngredient, updateBuildIngredient } from './build';
import { loadCatalog } from './catalog';
import type {
  CookingStage,
  Ingredient,
  IngredientId,
  StewBuild,
} from './types';
import type { BuildIngredientPatch } from './build';

export interface BuildStoreState {
  catalog: readonly Ingredient[];
  build: StewBuild;
}

export interface BuildStoreApi extends BuildStoreState {
  addIngredient(ingredientId: IngredientId): void;
  removeIngredient(ingredientId: IngredientId): void;
  moveIngredient(ingredientId: IngredientId, stage: CookingStage): void;
  updateBuildIngredient(ingredientId: IngredientId, patch: BuildIngredientPatch): void;
  updateBuild(patch: Partial<StewBuild>): void;
  replaceBuild(build: StewBuild): void;
  resetBuild(): void;
}

export interface BuildStoreProviderProps {
  children: ReactNode;
  catalog?: readonly Ingredient[];
  initialBuild?: StewBuild;
}

type BuildStoreAction =
  | { type: 'add'; ingredientId: IngredientId }
  | { type: 'remove'; ingredientId: IngredientId }
  | { type: 'move'; ingredientId: IngredientId; stage: CookingStage }
  | { type: 'update'; ingredientId: IngredientId; patch: BuildIngredientPatch }
  | { type: 'patch-build'; patch: Partial<StewBuild> }
  | { type: 'replace'; build: StewBuild }
  | { type: 'reset' };

interface BuildStoreContextValue extends BuildStoreState {
  dispatch(action: BuildStoreAction): void;
}

const BuildStoreContext = createContext<BuildStoreContextValue | null>(null);

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function createEmptyBuild(id = 'stew-build'): StewBuild {
  return { id, ingredients: [] };
}

function createInitialState(catalog: readonly Ingredient[], initialBuild?: StewBuild): BuildStoreState {
  return {
    catalog: cloneValue(catalog),
    build: initialBuild ? cloneValue(initialBuild) : createEmptyBuild(),
  };
}

export function createBuildStoreReducer(catalog: readonly Ingredient[]) {
  return function buildStoreReducer(state: BuildStoreState, action: BuildStoreAction): BuildStoreState {
    switch (action.type) {
      case 'add':
        return {
          ...state,
          build: addIngredient(state.build, action.ingredientId, catalog),
        };
      case 'remove':
        return {
          ...state,
          build: removeIngredient(state.build, action.ingredientId),
        };
      case 'move':
        return {
          ...state,
          build: moveIngredient(state.build, action.ingredientId, action.stage),
        };
      case 'update':
        return {
          ...state,
          build: updateBuildIngredient(state.build, action.ingredientId, action.patch),
        };
      case 'patch-build':
        return {
          ...state,
          build: {
            ...state.build,
            ...action.patch,
          },
        };
      case 'replace':
        return {
          ...state,
          build: cloneValue(action.build),
        };
      case 'reset':
        return {
          ...state,
          build: createEmptyBuild(state.build.id),
        };
      default:
        return state;
    }
  };
}

export function BuildStoreProvider({ children, catalog, initialBuild }: BuildStoreProviderProps) {
  const resolvedCatalog = useMemo(() => catalog ? cloneValue(catalog) : loadCatalog(), [catalog]);
  const reducer = useMemo(() => createBuildStoreReducer(resolvedCatalog), [resolvedCatalog]);
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState(resolvedCatalog, initialBuild));

  const value = useMemo<BuildStoreContextValue>(() => ({
    ...state,
    dispatch,
  }), [state, dispatch]);

  return <BuildStoreContext.Provider value={value}>{children}</BuildStoreContext.Provider>;
}

export function useBuildStore(): BuildStoreApi {
  const context = useContext(BuildStoreContext);
  if (context === null) {
    throw new Error('useBuildStore must be used within a BuildStoreProvider');
  }

  const { build, catalog, dispatch } = context;

  return {
    build,
    catalog,
    addIngredient(ingredientId) {
      dispatch({ type: 'add', ingredientId });
    },
    removeIngredient(ingredientId) {
      dispatch({ type: 'remove', ingredientId });
    },
    moveIngredient(ingredientId, stage) {
      dispatch({ type: 'move', ingredientId, stage });
    },
    updateBuildIngredient(ingredientId, patch) {
      dispatch({ type: 'update', ingredientId, patch });
    },
    updateBuild(patch) {
      dispatch({ type: 'patch-build', patch });
    },
    replaceBuild(nextBuild) {
      dispatch({ type: 'replace', build: nextBuild });
    },
    resetBuild() {
      dispatch({ type: 'reset' });
    },
  };
}

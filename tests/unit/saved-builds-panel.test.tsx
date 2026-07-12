// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import App from '../../src/App';
import { addIngredient } from '../../src/build';
import { loadCatalog } from '../../src/catalog';
import { BuildStoreProvider, createEmptyBuild, useBuildStore } from '../../src/store';
import { SavedBuildsPanel, SAVED_BUILDS_CHANGED_EVENT } from '../../src/components/SavedBuildsPanel';
import type { SavedBuildRecord, StewBuild, Ingredient } from '../../src/types';

const mockState = vi.hoisted(() => {
  const savedBuilds: SavedBuildRecord[] = [];
  const buildsById: Record<string, StewBuild> = {};

  return {
    savedBuilds,
    buildsById,
    saveBuild: vi.fn((build: StewBuild) => {
      buildsById[build.id] = structuredClone(build);

      const record: SavedBuildRecord = {
        id: build.id,
        name: build.name,
        savedAt: '2026-07-12T00:00:00.000Z',
        schemaVersion: 1,
      };

      const existingIndex = savedBuilds.findIndex(entry => entry.id === build.id);
      if (existingIndex === -1) {
        savedBuilds.push(record);
      } else {
        savedBuilds[existingIndex] = record;
      }
    }),
    loadBuild: vi.fn((id: string) => {
      const build = buildsById[id];
      return build ? structuredClone(build) : undefined;
    }),
    deleteBuild: vi.fn((id: string) => {
      delete buildsById[id];
      const existingIndex = savedBuilds.findIndex(entry => entry.id === id);
      if (existingIndex !== -1) {
        savedBuilds.splice(existingIndex, 1);
      }
    }),
    exportBuild: vi.fn((build: StewBuild) => JSON.stringify({ schemaVersion: 1, ...build })),
    importBuild: vi.fn((json: string) => JSON.parse(json) as StewBuild),
    listSavedBuilds: vi.fn(() => savedBuilds.map(record => ({ ...record }))),
  };
});

vi.mock('../../src/persistence', () => ({
  saveBuild: mockState.saveBuild,
  loadBuild: mockState.loadBuild,
  deleteBuild: mockState.deleteBuild,
  exportBuild: mockState.exportBuild,
  importBuild: mockState.importBuild,
  listSavedBuilds: mockState.listSavedBuilds,
}));

function createBuild(catalog: readonly Ingredient[], id: string, name: string): StewBuild {
  let build = createEmptyBuild(id);
  build = addIngredient(build, 'chicken_thighs', catalog);
  build = addIngredient(build, 'onion', catalog);
  return {
    ...build,
    name,
  };
}

function BuildObserver() {
  const { build } = useBuildStore();
  return (
    <output data-testid="current-build">
      {build.id}:{build.name ?? ''}
    </output>
  );
}

function PanelHarness({
  catalog,
  initialBuild,
}: {
  catalog: readonly Ingredient[];
  initialBuild: StewBuild;
}) {
  return (
    <BuildStoreProvider catalog={catalog} initialBuild={initialBuild}>
      <BuildObserver />
      <SavedBuildsPanel />
    </BuildStoreProvider>
  );
}

describe('Saved builds UI', () => {
  let catalog: Ingredient[];

  beforeAll(() => {
    catalog = loadCatalog();
  });

  beforeEach(() => {
    mockState.savedBuilds.length = 0;
    for (const key of Object.keys(mockState.buildsById)) {
      delete mockState.buildsById[key];
    }
    mockState.saveBuild.mockClear();
    mockState.loadBuild.mockClear();
    mockState.deleteBuild.mockClear();
    mockState.exportBuild.mockClear();
    mockState.importBuild.mockClear();
    mockState.listSavedBuilds.mockClear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      get length() {
        return 0;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('the header Save button calls saveBuild, and Load reveals the saved list', async () => {
    const user = userEvent.setup();
    const initialBuild = createBuild(catalog, 'header-build', 'Header Build');

    render(<App />);

    mockState.buildsById[initialBuild.id] = structuredClone(initialBuild);

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(mockState.saveBuild).toHaveBeenCalled();

    // Saved-builds management now lives behind the Load popup.
    await user.click(screen.getByRole('button', { name: /^load$/i }));
    await screen.findByRole('list', { name: /saved build records/i, hidden: true });
  });

  it('renders saved builds, restores a build, and removes a build from the list', async () => {
    const user = userEvent.setup();
    const currentBuild = createBuild(catalog, 'current-build', 'Current Build');
    const restoredBuild = createBuild(catalog, 'restored-build', 'Restored Build');
    const deletedBuild = createBuild(catalog, 'deleted-build', 'Deleted Build');

    mockState.savedBuilds.push(
      { id: restoredBuild.id, name: restoredBuild.name, savedAt: '2026-07-12T00:00:00.000Z', schemaVersion: 1 },
      { id: deletedBuild.id, name: deletedBuild.name, savedAt: '2026-07-12T00:00:00.000Z', schemaVersion: 1 },
    );
    mockState.buildsById[restoredBuild.id] = structuredClone(restoredBuild);
    mockState.buildsById[deletedBuild.id] = structuredClone(deletedBuild);

    render(<PanelHarness catalog={catalog} initialBuild={currentBuild} />);

    screen.getByText('Restored Build');
    screen.getByText('Deleted Build');

    const recordList = screen.getByRole('list', { name: /saved build records/i });
    const restoreButtons = within(recordList).getAllByRole('button', { name: /restore/i });
    const deleteButtons = within(recordList).getAllByRole('button', { name: /delete/i });

    await user.click(restoreButtons[0]);
    expect(mockState.loadBuild).toHaveBeenCalledWith(restoredBuild.id);
    expect(screen.getByTestId('current-build').textContent).toContain('restored-build:Restored Build');

    await user.click(deleteButtons[1]);
    expect(mockState.deleteBuild).toHaveBeenCalledWith(deletedBuild.id);
    await waitFor(() => {
      expect(screen.queryByText('Deleted Build')).toBeNull();
    });
  });

  it('renames a saved build inline', async () => {
    const user = userEvent.setup();
    const currentBuild = createBuild(catalog, 'current-build', 'Current Build');
    const renamedBuild = createBuild(catalog, 'rename-me', 'Rename Me');

    mockState.savedBuilds.push(
      { id: renamedBuild.id, name: renamedBuild.name, savedAt: '2026-07-12T00:00:00.000Z', schemaVersion: 1 },
    );
    mockState.buildsById[renamedBuild.id] = structuredClone(renamedBuild);

    render(<PanelHarness catalog={catalog} initialBuild={currentBuild} />);

    await user.click(screen.getAllByRole('button', { name: /rename/i })[0]);
    const input = screen.getByRole('textbox', { name: /rename/i });
    await user.clear(input);
    await user.type(input, 'Renamed Build');
    await user.click(screen.getByRole('button', { name: /save name/i }));

    expect(mockState.saveBuild).toHaveBeenCalledWith(expect.objectContaining({ id: 'rename-me', name: 'Renamed Build' }));
    await waitFor(() => {
      screen.getByText('Renamed Build');
    });
  });

  it('shows an inline error when import JSON is invalid', async () => {
    const user = userEvent.setup();
    const currentBuild = createBuild(catalog, 'current-build', 'Current Build');

    render(<PanelHarness catalog={catalog} initialBuild={currentBuild} />);

    const input = screen.getByLabelText(/import build from json/i) as HTMLInputElement;
    await user.upload(input, new File(['not json'], 'broken.json', { type: 'application/json' }));

    screen.getByText(/unexpected token|invalid/i);
  });

  it('exports the current build through a browser download', async () => {
    const user = userEvent.setup();
    const currentBuild = createBuild(catalog, 'export-me', 'Export Me');
    const createObjectURL = vi.fn(() => 'blob:download');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    render(<PanelHarness catalog={catalog} initialBuild={currentBuild} />);

    await user.click(screen.getByRole('button', { name: /export json/i }));

    expect(mockState.exportBuild).toHaveBeenCalledWith(currentBuild);
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');
  });
});

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { deleteBuild, exportBuild, importBuild, listSavedBuilds, loadBuild, saveBuild } from '../persistence';
import { useBuildStore } from '../store';
import type { SavedBuildRecord } from '../types';

export const SAVED_BUILDS_CHANGED_EVENT = 'build-a-stew:saved-builds-changed';

export function notifySavedBuildsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SAVED_BUILDS_CHANGED_EVENT));
  }
}

function buildLabel(id: string, name: string | undefined): string {
  return name?.trim() ? name : id;
}

export function SavedBuildsPanel() {
  const { build, replaceBuild } = useBuildStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    const onSavedBuildsChanged = () => setRefreshToken(token => token + 1);
    window.addEventListener(SAVED_BUILDS_CHANGED_EVENT, onSavedBuildsChanged);
    return () => window.removeEventListener(SAVED_BUILDS_CHANGED_EVENT, onSavedBuildsChanged);
  }, []);

  const savedBuilds = useMemo(() => listSavedBuilds(), [refreshToken]);

  useEffect(() => {
    if (editingId === null) {
      return;
    }

    const editingRecord = savedBuilds.find(record => record.id === editingId);
    setDraftName(editingRecord?.name ?? '');
  }, [editingId, savedBuilds]);

  function updateFeedback(message: string) {
    setFeedback(message);
  }

  function handleRestore(id: string) {
    try {
      const restored = loadBuild(id);
      if (!restored) {
        updateFeedback('Saved build not found.');
        return;
      }

      replaceBuild(restored);
      updateFeedback(`Restored ${buildLabel(restored.id, restored.name)}.`);
    } catch (error) {
      updateFeedback(error instanceof Error ? error.message : 'Unable to restore build.');
    }
  }

  function handleDelete(id: string) {
    try {
      deleteBuild(id);
      if (editingId === id) {
        setEditingId(null);
        setDraftName('');
      }
      updateFeedback('Deleted saved build.');
      notifySavedBuildsChanged();
    } catch (error) {
      updateFeedback(error instanceof Error ? error.message : 'Unable to delete build.');
    }
  }

  function handleBeginRename(record: SavedBuildRecord) {
    setEditingId(record.id);
    setDraftName(record.name ?? '');
    setFeedback(null);
  }

  function handleCancelRename() {
    setEditingId(null);
    setDraftName('');
  }

  function handleCommitRename(id: string) {
    try {
      const restored = loadBuild(id);
      if (!restored) {
        updateFeedback('Saved build not found.');
        return;
      }

      const nextName = draftName.trim();
      const renamed = {
        ...restored,
        name: nextName === '' ? undefined : nextName,
      };

      saveBuild(renamed);
      if (build.id === id) {
        replaceBuild(renamed);
      }

      setEditingId(null);
      setDraftName('');
      updateFeedback(`Renamed ${buildLabel(id, renamed.name)}.`);
      notifySavedBuildsChanged();
    } catch (error) {
      updateFeedback(error instanceof Error ? error.message : 'Unable to rename build.');
    }
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const json = await file.text();
      const imported = importBuild(json);
      replaceBuild(imported);
      updateFeedback(`Imported ${buildLabel(imported.id, imported.name)}.`);
    } catch (error) {
      updateFeedback(error instanceof Error ? error.message : 'Unable to import build.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    void handleImportFile(event.currentTarget.files?.[0]);
  }

  function handleExportCurrentBuild() {
    try {
      const json = exportBuild(build);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${build.id}.json`;
      link.rel = 'noopener';
      link.click();
      URL.revokeObjectURL(url);
      updateFeedback(`Exported ${buildLabel(build.id, build.name)}.`);
    } catch (error) {
      updateFeedback(error instanceof Error ? error.message : 'Unable to export build.');
    }
  }

  return (
    <section className="composer-panel composer-panel--saved-builds" aria-labelledby="saved-builds-title">
      <div className="panel-heading">
        <h2 id="saved-builds-title">Saved builds</h2>
      </div>

      <div className="saved-builds__toolbar">
        <button type="button" className="secondary-action" onClick={handleExportCurrentBuild}>
          Export JSON
        </button>
        <button
          type="button"
          className="secondary-action"
          onClick={() => fileInputRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          aria-label="Import build from JSON"
          onChange={handleImportChange}
        />
      </div>

      {feedback ? (
        <p className="saved-builds__feedback" role="status">
          {feedback}
        </p>
      ) : null}

      {savedBuilds.length === 0 ? (
        <div className="panel-placeholder panel-placeholder--soft">
          No saved builds yet. Save the current build to create one.
        </div>
      ) : (
        <div className="saved-builds-list" role="list" aria-label="Saved build records">
          {savedBuilds.map(record => {
            const label = buildLabel(record.id, record.name);

            return (
              <article key={record.id} className="saved-build-card" role="listitem">
                {editingId === record.id ? (
                  <form
                    className="saved-builds__rename-form"
                    onSubmit={event => {
                      event.preventDefault();
                      handleCommitRename(record.id);
                    }}
                  >
                    <label className="saved-builds__rename-label" htmlFor={`saved-build-name-${record.id}`}>
                      Rename
                    </label>
                    <input
                      id={`saved-build-name-${record.id}`}
                      type="text"
                      value={draftName}
                      onChange={event => setDraftName(event.currentTarget.value)}
                    />
                    <div className="saved-build-card__actions">
                      <button type="submit" className="secondary-action">
                        Save name
                      </button>
                      <button type="button" className="secondary-action" onClick={handleCancelRename}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="saved-build-card__header">
                      <div>
                        <h3>{label}</h3>
                        <p className="saved-build-card__meta">ID: {record.id}</p>
                      </div>
                      <p className="saved-build-card__meta">Saved {record.savedAt}</p>
                    </div>
                    <div className="saved-build-card__actions">
                      <button type="button" className="secondary-action" onClick={() => handleRestore(record.id)}>
                        Restore
                      </button>
                      <button type="button" className="secondary-action" onClick={() => handleBeginRename(record)}>
                        Rename
                      </button>
                      <button type="button" className="secondary-action" onClick={() => handleDelete(record.id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

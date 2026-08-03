import { useState } from 'react';
import { listSavedBuilds } from '../persistence';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface SaveBuildFormProps {
  initialName?: string;
  onSave: (id: string, name: string) => void;
  onCancel: () => void;
}

export function SaveBuildForm({ initialName = '', onSave, onCancel }: SaveBuildFormProps) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();
  const id = slugify(trimmed);
  const collision = id !== '' && listSavedBuilds().some(record => record.id === id);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed || !id) {
      return;
    }
    onSave(id, trimmed);
  }

  return (
    <form className="save-build-form" onSubmit={handleSubmit}>
      <label className="save-build-form__label" htmlFor="save-build-name">
        Stew name
      </label>
      <input
        id="save-build-name"
        className="save-build-form__input"
        type="text"
        value={name}
        onChange={event => setName(event.currentTarget.value)}
        placeholder="e.g. Sunday beef braise"
        autoFocus
      />
      {collision ? (
        <p className="save-build-form__warning" role="status">
          A saved stew named &ldquo;{trimmed}&rdquo; already exists &mdash; saving will overwrite it.
        </p>
      ) : null}
      <div className="save-build-form__actions">
        <button type="button" className="secondary-action" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-action" disabled={!trimmed}>
          {collision ? 'Overwrite' : 'Save'}
        </button>
      </div>
    </form>
  );
}

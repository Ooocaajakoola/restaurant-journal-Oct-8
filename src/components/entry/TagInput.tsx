import { useId, useState } from 'react';
import { normalizeTag } from '../../lib/tags';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/Field';
import { Icon } from '../ui/Icon';

interface TagInputProps {
  tags: string[];
  onChange(next: string[]): void;
  /** Tags already used elsewhere, offered as one-tap suggestions. */
  suggestions?: string[];
}

export function TagInput({ tags, onChange, suggestions = [] }: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    const name = normalizeTag(raw);
    if (name && !tags.includes(name)) onChange([...tags, name]);
    setDraft('');
  }

  const offered = suggestions.filter((s) => !tags.includes(s)).slice(0, 8);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted">
        Tags
      </label>
      {tags.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Selected tags">
          {tags.map((t) => (
            <li key={t}>
              <button
                type="button"
                aria-label={`Remove tag ${t}`}
                onClick={() => onChange(tags.filter((x) => x !== t))}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface-2 pl-3 pr-2.5 text-sm font-medium"
              >
                #{t}
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          className={inputClass}
          value={draft}
          placeholder="e.g. late-night"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <Button className="shrink-0" onClick={() => add(draft)} disabled={!normalizeTag(draft)}>
          Add tag
        </Button>
      </div>
      {offered.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Suggested tags">
          {offered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => add(s)}
                className="inline-flex min-h-11 items-center rounded-full border border-dashed border-line px-3 text-sm text-muted hover:bg-surface-2"
              >
                + {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

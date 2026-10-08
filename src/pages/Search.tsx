import { Link, useSearchParams } from 'react-router-dom';
import { EntryCard } from '../components/entry/EntryCard';
import { PageHeader } from '../components/layout/PageHeader';
import { ChipLink } from '../components/ui/Chip';
import { Field, inputClass } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import type { EntryFilter } from '../data/repositories';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { plural } from '../lib/format';

type SearchMode = 'all' | 'dish' | 'city' | 'tag' | 'date';

const MODES: Array<{ mode: SearchMode; label: string; placeholder: string }> = [
  { mode: 'all', label: 'Everything', placeholder: 'Place, dish, city, tag or note' },
  { mode: 'dish', label: 'Dish', placeholder: 'e.g. croissant' },
  { mode: 'city', label: 'City', placeholder: 'City, country or airport code (e.g. NRT)' },
  { mode: 'tag', label: 'Tag', placeholder: 'e.g. late-night' },
  { mode: 'date', label: 'Date', placeholder: '' },
];

function isMode(v: string | null): v is SearchMode {
  return MODES.some((m) => m.mode === v);
}

function buildFilter(mode: SearchMode, q: string, from: string, to: string): EntryFilter | null {
  const text = q.trim();
  switch (mode) {
    case 'date':
      return from || to ? { dateFrom: from || undefined, dateTo: to || undefined } : null;
    case 'dish':
      return text ? { dish: text } : null;
    case 'city':
      return text ? { city: text } : null;
    case 'tag':
      return text ? { tagQuery: text } : null;
    default:
      return text ? { text } : null;
  }
}

export default function Search() {
  const repos = useRepositories();
  const [params, setParams] = useSearchParams();

  // /search?tag=late-night (used by tag chips elsewhere) is shorthand for a tag search.
  const legacyTag = params.get('tag');
  const modeParam = params.get('by');
  const mode: SearchMode = legacyTag ? 'tag' : isMode(modeParam) ? modeParam : 'all';
  const q = legacyTag ?? params.get('q') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const filter = buildFilter(mode, q, from, to);
  const results = useAsyncData(() => (filter ? repos.entries.list(filter) : Promise.resolve([])), [mode, q, from, to]);
  const tags = useAsyncData(() => repos.tags.list(), []);

  function update(next: Record<string, string | undefined>) {
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.delete('tag');
        // Keep the shorthand tag as an explicit tag search once the user edits anything.
        if (legacyTag) {
          out.set('by', 'tag');
          out.set('q', legacyTag);
        }
        for (const [k, v] of Object.entries(next)) {
          if (v) out.set(k, v);
          else out.delete(k);
        }
        return out;
      },
      { replace: true },
    );
  }

  const active = MODES.find((m) => m.mode === mode)!;
  const entries = results.data ?? [];

  return (
    <>
      <PageHeader title="Search" subtitle="Find a dish, city, tag or date." />

      <form role="search" aria-label="Search your journal" className="mb-5 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-muted">Search by</legend>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <label key={m.mode}>
                <input
                  type="radio"
                  name="search-by"
                  value={m.mode}
                  checked={mode === m.mode}
                  onChange={() => update({ by: m.mode === 'all' ? undefined : m.mode })}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface-2 px-4 font-medium peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]">
                  {m.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode === 'date' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From" hint="Leave “To” empty for everything since this date.">
              {(id, described) => (
                <input id={id} aria-describedby={described} type="date" className={inputClass} value={from} onChange={(e) => update({ from: e.target.value || undefined })} />
              )}
            </Field>
            <Field label="To">
              {(id) => <input id={id} type="date" className={inputClass} value={to} onChange={(e) => update({ to: e.target.value || undefined })} />}
            </Field>
          </div>
        ) : (
          <Field label={`Search ${active.mode === 'all' ? 'everything' : `by ${active.label.toLowerCase()}`}`}>
            {(id) => (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <Icon name="search" />
                </span>
                <input
                  id={id}
                  type="search"
                  autoComplete="off"
                  className={`${inputClass} pl-11`}
                  value={q}
                  placeholder={active.placeholder}
                  onChange={(e) => update({ q: e.target.value || undefined })}
                />
              </div>
            )}
          </Field>
        )}
      </form>

      {!filter ? (
        <section aria-labelledby="try-h">
          <h2 id="try-h" className="mb-2 text-lg font-bold">
            Try a tag
          </h2>
          {tags.data && tags.data.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {tags.data.slice(0, 10).map((t) => (
                <li key={t.id}>
                  <ChipLink to={`/search?by=tag&q=${encodeURIComponent(t.name)}`}>
                    #{t.name} <span className="ml-1.5 text-muted">{t.entryCount}</span>
                  </ChipLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Tags you add to entries will show up here.</p>
          )}
        </section>
      ) : (
        <>
          <p role="status" className="mb-3 text-sm text-muted">
            {results.loading && !results.data ? 'Searching…' : `${plural(entries.length, 'result')}`}
          </p>
          {entries.length === 0 && !results.loading ? (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
              <p>Nothing found. Try a different {mode === 'all' ? 'word' : active.label.toLowerCase()}.</p>
              <Link to="/search" className="mt-2 inline-flex min-h-11 items-center text-accent underline">
                Clear search
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2" aria-label="Search results">
              {entries.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

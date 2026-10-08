import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, buttonClasses } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { RatingBadge } from '../components/ui/RatingBadge';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { directionsUrl } from '../lib/directions';
import { plural } from '../lib/format';
import { listSharePath } from '../lib/shareLink';
import { useJournalStore } from '../store/journalStore';

/**
 * Read-only view of a list, reached from a share link (/l/:listId).
 * Owners can also open their own private lists here.
 */
export default function SharedList() {
  const { listId = '' } = useParams();
  const repos = useRepositories();
  const invalidate = useJournalStore((s) => s.invalidate);

  const list = useAsyncData(async () => (await repos.lists.get(listId)) ?? (await repos.lists.getShared(listId)), [listId]);
  const me = useAsyncData(() => repos.users.getCurrent(), []);
  const mine = useAsyncData(() => repos.lists.listMine(), []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  if (list.loading && !list.data) return <p role="status">Loading…</p>;

  if (!list.data) {
    return (
      <>
        <PageHeader title="List not available" subtitle="The link may be wrong, or the owner stopped sharing it." />
        <Link to="/" className={buttonClasses('primary')}>
          Go to Quick Log
        </Link>
      </>
    );
  }

  const l = list.data;
  const isOwner = me.data?.id === l.ownerId;
  const existingCopy = (mine.data ?? []).find((m) => m.sourceListId === l.id);
  const copyId = justSavedId ?? existingCopy?.id ?? null;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const copy = await repos.lists.saveCopyToMyJournal(l.id);
      invalidate();
      setJustSavedId(copy.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this list.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article>
      <PageHeader
        title={l.title}
        subtitle={isOwner ? 'Your list' : `Shared by ${l.owner.displayName}`}
      />
      {l.description && <p className="-mt-2 mb-4">{l.description}</p>}

      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-muted">
        <Icon name="link" size={16} />
        Read-only · {plural(l.items.length, 'place')}
      </p>

      {!isOwner && (
        <div className="mb-6">
          {copyId ? (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-success/60 bg-surface p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-success text-canvas">
                <Icon name="check" />
              </span>
              <p className="min-w-40 flex-1 font-bold">{justSavedId ? 'Saved to your journal' : 'Already in your journal'}</p>
              <Link to={listSharePath(copyId)} className={buttonClasses('secondary')}>
                View my copy
              </Link>
            </div>
          ) : (
            <Button variant="primary" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
              <Icon name="plus" size={18} />
              {saving ? 'Saving…' : 'Save to my journal'}
            </Button>
          )}
          {error && (
            <p role="alert" className="mt-3 text-danger">
              {error}
            </p>
          )}
        </div>
      )}

      {l.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">This list has no places yet.</p>
      ) : (
        <ol className="space-y-3" aria-label="Places in this list">
          {l.items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">{item.place.name}</h2>
                <p className="text-sm text-muted">
                  {item.place.cuisine} · {item.city.name}
                </p>
                {item.rating && (
                  <div className="mt-2">
                    <RatingBadge rating={item.rating} />
                  </div>
                )}
                {item.note && <p className="mt-2">{item.note}</p>}
              </div>
              <a
                href={directionsUrl(item.place.lat, item.place.lng)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Directions to ${item.place.name} (opens in a new tab)`}
                className={buttonClasses('secondary', 'shrink-0 px-0')}
              >
                <Icon name="navigation" />
              </a>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

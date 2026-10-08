import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, buttonClasses } from '../components/ui/Button';
import { Chip, ChipLink } from '../components/ui/Chip';
import { Icon } from '../components/ui/Icon';
import { RatingBadge } from '../components/ui/RatingBadge';
import { ToFinishBadge } from '../components/ui/ToFinishBadge';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { useShare } from '../hooks/useShare';
import { directionsUrl } from '../lib/directions';
import { needsFinishing } from '../lib/entry';
import { capitalize, formatDateTime, formatPrice } from '../lib/format';
import { useJournalStore } from '../store/journalStore';

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export default function EntryDetail() {
  const { id = '' } = useParams();
  const repos = useRepositories();
  const navigate = useNavigate();
  const invalidate = useJournalStore((s) => s.invalidate);
  const { data: entry, loading, error } = useAsyncData(() => repos.entries.get(id), [id]);
  const share = useShare();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (loading && !entry) return <p role="status">Loading…</p>;

  if (error || !entry) {
    return (
      <>
        <PageHeader title="Entry not found" subtitle="It may have been deleted." />
        <Link to="/" className={buttonClasses('primary')}>
          Back to Quick Log
        </Link>
      </>
    );
  }

  const [hero, ...morePhotos] = entry.photos;

  async function handleDelete() {
    if (!entry) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await repos.entries.delete(entry.id);
      invalidate();
      navigate(`/cities/${entry.city.id}`, { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this entry.');
      setDeleting(false);
    }
  }

  return (
    <article>
      <Link to={`/cities/${entry.city.id}`} className="mb-3 inline-flex min-h-11 items-center gap-1 text-muted hover:text-fg">
        <Icon name="back" size={18} />
        {entry.city.name}
      </Link>

      {hero ? (
        <img src={hero.url} alt={`${entry.place.name}`} className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover md:aspect-video" />
      ) : (
        <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-dashed border-line text-muted md:aspect-video">
          No photo yet
        </div>
      )}
      {morePhotos.length > 0 && (
        <ul className="mb-3 flex gap-2 overflow-x-auto" aria-label="More photos">
          {morePhotos.map((p, i) => (
            <li key={p.id}>
              <img src={p.url} alt={`${entry.place.name} photo ${i + 2}`} className="size-20 rounded-xl object-cover" />
            </li>
          ))}
        </ul>
      )}

      <PageHeader title={entry.place.name} subtitle={`${entry.place.cuisine} · ${entry.city.name}, ${entry.city.country}`} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <RatingBadge rating={entry.rating} />
        {needsFinishing(entry) && <ToFinishBadge />}
        <Chip>{capitalize(entry.visibility)}</Chip>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link to={`/entry/${entry.id}/edit`} className={buttonClasses(needsFinishing(entry) ? 'primary' : 'secondary')}>
          <Icon name="edit" size={18} />
          {needsFinishing(entry) ? 'Add details' : 'Edit'}
        </Link>
        <Button
          disabled={share.busy}
          onClick={() =>
            void share.shareList(
              { title: entry.place.name, cityId: entry.city.id, items: [{ placeId: entry.placeId, entryId: entry.id }] },
              `${entry.place.name} in ${entry.city.name}, rated ${entry.rating}/5`,
            )
          }
        >
          <Icon name="share" size={18} />
          Share
        </Button>
        <a
          href={directionsUrl(entry.place.lat, entry.place.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary')}
        >
          <Icon name="navigation" size={18} />
          Directions<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          <Icon name="trash" size={18} />
          Delete
        </Button>
      </div>

      {(share.message || share.error) && (
        <p role="status" className={`mb-4 rounded-xl border p-3 ${share.error ? 'border-danger/60 text-danger' : 'border-success/60'}`}>
          {share.error ?? share.message}
          {share.url && !share.error && <span className="mt-1 block break-all text-sm text-muted">{share.url}</span>}
        </p>
      )}

      {confirming && (
        <div role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc" className="mb-6 rounded-2xl border border-danger/60 bg-surface p-4">
          <h2 id="confirm-title" className="font-bold">
            Delete this entry?
          </h2>
          <p id="confirm-desc" className="mt-1 text-muted">
            {entry.place.name} on {formatDateTime(entry.visitedAt)} will be removed. This can't be undone.
          </p>
          {deleteError && (
            <p role="alert" className="mt-2 text-danger">
              {deleteError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
            <Button onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-4">
        <Meta label="Date">{formatDateTime(entry.visitedAt)}</Meta>
        <Meta label="Meal">{capitalize(entry.mealType)}</Meta>
        <Meta label="Price">{entry.price === null ? 'Not added' : formatPrice(entry.price, entry.currency)}</Meta>
        <Meta label="Would return">{entry.wouldReturn === null ? 'Not sure' : entry.wouldReturn ? 'Yes' : 'No'}</Meta>
      </dl>

      <section aria-labelledby="dishes-h" className="mb-6">
        <h2 id="dishes-h" className="mb-2 text-lg font-bold">
          Dishes
        </h2>
        {entry.dishes.length > 0 ? (
          <ul className="list-inside list-disc space-y-1">
            {entry.dishes.map((d) => (
              <li key={d.id}>{d.name}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No dishes added yet.</p>
        )}
      </section>

      <section aria-labelledby="notes-h" className="mb-6">
        <h2 id="notes-h" className="mb-2 text-lg font-bold">
          Notes
        </h2>
        {entry.note ? <p className="whitespace-pre-wrap">{entry.note}</p> : <p className="text-muted">No notes yet.</p>}
      </section>

      <section aria-labelledby="tags-h" className="mb-6">
        <h2 id="tags-h" className="mb-2 text-lg font-bold">
          Tags
        </h2>
        {entry.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {entry.tags.map((t) => (
              <li key={t.id}>
                <ChipLink to={`/search?tag=${encodeURIComponent(t.name)}`}>#{t.name}</ChipLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No tags yet.</p>
        )}
      </section>

      <p className="text-sm text-muted">{entry.place.address}</p>
    </article>
  );
}

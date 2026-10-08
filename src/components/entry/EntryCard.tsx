import { Link } from 'react-router-dom';
import { needsFinishing } from '../../lib/entry';
import { capitalize, formatDate } from '../../lib/format';
import type { EntryView } from '../../types';
import { Icon } from '../ui/Icon';
import { RatingBadge } from '../ui/RatingBadge';
import { ToFinishBadge } from '../ui/ToFinishBadge';

export function EntryCard({ entry }: { entry: EntryView }) {
  const photo = entry.photos[0];
  return (
    <li>
      <Link
        to={`/entry/${entry.id}`}
        className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:bg-surface-2"
      >
        {photo ? (
          <img src={photo.url} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Icon name="pin" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{entry.place.name}</span>
          <span className="block truncate text-sm text-muted">
            {entry.city.name} · {capitalize(entry.mealType)} · {formatDate(entry.visitedAt)}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            <RatingBadge rating={entry.rating} />
            {needsFinishing(entry) && <ToFinishBadge />}
          </span>
        </span>
        <Icon name="chevron" className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}

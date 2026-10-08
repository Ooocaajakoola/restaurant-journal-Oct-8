import { Link } from 'react-router-dom';
import type { CityWithStats } from '../../data/repositories';
import { formatDate, plural } from '../../lib/format';
import { Icon } from '../ui/Icon';

export function CityCard({ city }: { city: CityWithStats }) {
  return (
    <li>
      <Link
        to={`/cities/${city.id}`}
        className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{city.name}</span>
          <span className="block truncate text-sm text-muted">
            {city.country} · {city.airportCodes.join(' · ')}
          </span>
          <span className="mt-1 block text-sm">
            <span className="font-semibold">{plural(city.entryCount, 'entry', 'entries')}</span>
            {city.lastVisitedAt && <span className="text-muted"> · last visit {formatDate(city.lastVisitedAt)}</span>}
          </span>
        </span>
        <Icon name="chevron" className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}

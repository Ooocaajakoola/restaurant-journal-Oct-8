import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EntryCard } from '../components/entry/EntryCard';
import { PageHeader } from '../components/layout/PageHeader';
import { EntryMap } from '../components/map/EntryMap';
import { RatingLegend } from '../components/map/RatingLegend';
import { buttonClasses } from '../components/ui/Button';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { plural } from '../lib/format';
import { buildPins } from '../lib/mapPins';

export default function MapPage() {
  const repos = useRepositories();
  const { data: entries, loading } = useAsyncData(() => repos.entries.list(), []);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const pins = useMemo(() => buildPins(entries ?? []), [entries]);
  const selected = pins.find((p) => p.placeId === selectedPlaceId) ?? null;

  if (loading && !entries) return <p role="status">Loading…</p>;

  if (!entries || entries.length === 0) {
    return (
      <>
        <PageHeader title="Map" subtitle="All your entries, coloured by rating." />
        <p className="mb-4 rounded-2xl border border-dashed border-line p-6 text-center text-muted">
          Nothing to show yet. Log a meal and it will appear here.
        </p>
        <Link to="/" className={buttonClasses('primary')}>
          Log a meal
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Map" subtitle={`${plural(pins.length, 'place')} · ${plural(entries.length, 'entry', 'entries')}`} />
      <div className="mb-3">
        <RatingLegend />
      </div>
      <EntryMap
        entries={entries}
        label="Map of all your entries"
        className="h-[58vh] min-h-72 md:h-[68vh]"
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={setSelectedPlaceId}
      />
      <div aria-live="polite">
        {selected ? (
          <section aria-labelledby="selected-place" className="mt-4">
            <h2 id="selected-place" className="mb-2 text-lg font-bold">
              {selected.name}
              <span className="ml-2 text-sm font-normal text-muted">{plural(selected.visits, 'visit')}</span>
            </h2>
            <ul className="space-y-2">
              {selected.entries.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-3 text-sm text-muted">Tap a pin to see your entries for that place.</p>
        )}
      </div>
    </>
  );
}

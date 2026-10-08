import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CityFilters, type CityFilterValues } from '../components/city/CityFilters';
import { ViewToggle, type CityViewMode } from '../components/city/ViewToggle';
import { EntryCard } from '../components/entry/EntryCard';
import { PageHeader } from '../components/layout/PageHeader';
import { EntryMap } from '../components/map/EntryMap';
import { Button, buttonClasses } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { useShare } from '../hooks/useShare';
import { plural } from '../lib/format';
import type { PriceLevel, Rating } from '../types';

function readFilters(params: URLSearchParams): CityFilterValues {
  const rating = Number(params.get('rating'));
  const price = Number(params.get('price'));
  return {
    cuisine: params.get('cuisine') || undefined,
    tag: params.get('tag') || undefined,
    minRating: rating >= 1 && rating <= 5 ? (rating as Rating) : undefined,
    priceLevel: price >= 1 && price <= 4 ? (price as PriceLevel) : undefined,
  };
}

export default function CityView() {
  const { cityId = '' } = useParams();
  const repos = useRepositories();
  const [params, setParams] = useSearchParams();
  const share = useShare();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const view: CityViewMode = params.get('view') === 'map' ? 'map' : 'list';
  const filters = readFilters(params);
  const activeCount = Object.values(filters).filter((v) => v !== undefined).length;

  const city = useAsyncData(() => repos.cities.get(cityId), [cityId]);
  const all = useAsyncData(() => repos.entries.list({ cityId }), [cityId]);
  const filtered = useAsyncData(
    () => repos.entries.list({ cityId, cuisine: filters.cuisine, minRating: filters.minRating, tag: filters.tag, priceLevel: filters.priceLevel }),
    [cityId, filters.cuisine, filters.minRating, filters.tag, filters.priceLevel],
  );

  const cuisines = useMemo(() => [...new Set((all.data ?? []).map((e) => e.place.cuisine))].sort(), [all.data]);
  const tags = useMemo(() => [...new Set((all.data ?? []).flatMap((e) => e.tags.map((t) => t.name)))].sort(), [all.data]);

  function update(next: Record<string, string | undefined>) {
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(next)) {
          if (v) out.set(k, v);
          else out.delete(k);
        }
        return out;
      },
      { replace: true },
    );
  }

  function setFilters(next: CityFilterValues) {
    update({
      cuisine: next.cuisine,
      tag: next.tag,
      rating: next.minRating ? String(next.minRating) : undefined,
      price: next.priceLevel ? String(next.priceLevel) : undefined,
    });
  }

  if (city.loading && !city.data) return <p role="status">Loading…</p>;
  if (!city.data) {
    return (
      <>
        <PageHeader title="City not found" />
        <Link to="/cities" className={buttonClasses('primary')}>
          All cities
        </Link>
      </>
    );
  }

  const c = city.data;
  const entries = filtered.data ?? [];
  const selectedEntries = entries.filter((e) => e.placeId === selectedPlaceId);

  return (
    <>
      <Link to="/cities" className="mb-3 inline-flex min-h-11 items-center gap-1 text-muted hover:text-fg">
        <Icon name="back" size={18} />
        Cities
      </Link>
      <PageHeader
        title={c.name}
        subtitle={`${c.country} · ${c.airportCodes.join(' · ')} · ${plural(all.data?.length ?? 0, 'entry', 'entries')}`}
        actions={
          <Button
            disabled={share.busy || entries.length === 0}
            onClick={() =>
              void share.shareList(
                {
                  title: `${c.name} favourites`,
                  cityId: c.id,
                  // Best-rated first, so the shared list leads with the highlights.
                  items: [...entries].sort((a, b) => b.rating - a.rating).map((e) => ({ placeId: e.placeId, entryId: e.id })),
                },
                `My ${c.name} food list`,
              )
            }
          >
            <Icon name="share" size={18} />
            Share
          </Button>
        }
      />

      {(share.message || share.error) && (
        <p role="status" className={`mb-4 rounded-xl border p-3 ${share.error ? 'border-danger/60 text-danger' : 'border-success/60'}`}>
          {share.error ?? share.message}
          {share.url && !share.error && <span className="mt-1 block break-all text-sm text-muted">{share.url}</span>}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ViewToggle value={view} onChange={(v) => update({ view: v === 'map' ? 'map' : undefined })} />
        <Button className="md:hidden" aria-expanded={filtersOpen} aria-controls="city-filters" onClick={() => setFiltersOpen((o) => !o)}>
          <Icon name="filter" size={18} />
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
      </div>

      <section id="city-filters" aria-label="Filters" className={`mb-5 rounded-2xl border border-line bg-surface p-4 ${filtersOpen ? '' : 'hidden'} md:block`}>
        <CityFilters values={filters} onChange={setFilters} cuisines={cuisines} tags={tags} />
        {activeCount > 0 && (
          <Button variant="ghost" className="mt-3" onClick={() => setFilters({})}>
            Clear filters
          </Button>
        )}
      </section>

      <p className="mb-3 text-sm text-muted" role="status" aria-live="polite">
        {plural(entries.length, 'entry', 'entries')}
        {activeCount > 0 ? ' match your filters' : ''}
      </p>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
          {activeCount > 0 ? 'No entries match these filters.' : `No entries in ${c.name} yet.`}
        </p>
      ) : view === 'map' ? (
        <div>
          <EntryMap
            entries={entries}
            label={`Map of ${c.name} entries`}
            className="h-[55vh] min-h-72"
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={setSelectedPlaceId}
          />
          {selectedEntries.length > 0 && (
            <ul className="mt-3 space-y-2" aria-label="Selected place">
              {selectedEntries.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" aria-label={`Entries in ${c.name}`}>
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </>
  );
}

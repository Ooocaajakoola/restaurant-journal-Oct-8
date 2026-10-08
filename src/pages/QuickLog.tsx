import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EntryCard } from '../components/entry/EntryCard';
import { PhotoPicker } from '../components/entry/PhotoPicker';
import { PlaceSuggestionList, type PlaceChoice } from '../components/entry/PlaceSuggestionList';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, buttonClasses } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { RatingInput } from '../components/ui/RatingInput';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { useJournalStore } from '../store/journalStore';
import type { Rating } from '../types';

interface SavedInfo {
  entryId: string;
  placeName: string;
  rating: Rating;
}

export default function QuickLog() {
  const repos = useRepositories();
  const invalidate = useJournalStore((s) => s.invalidate);

  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<PlaceChoice | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  const location = useAsyncData(() => repos.location.getCurrentLocation(), []);
  const suggestions = useAsyncData(
    async () => {
      if (!location.data) return [];
      if (trimmed) return repos.places.search(trimmed, { limit: 5 });
      return repos.places.listNearby(location.data.point, { radiusKm: 5, limit: 5 });
    },
    [trimmed, location.data?.point.lat, location.data?.point.lng],
  );
  const recent = useAsyncData(async () => (await repos.entries.list()).slice(0, 3), []);

  const list = suggestions.data ?? [];
  const exactMatch = list.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const newPlaceName = trimmed && !exactMatch ? trimmed : undefined;

  const canSave = choice !== null && rating !== null && !saving;

  function pick(next: PlaceChoice) {
    setChoice(next);
    setSaved(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!choice || !rating || !location.data) return;
    setSaving(true);
    setError(null);
    try {
      let place;
      if (choice.kind === 'existing') {
        place = choice.place;
      } else {
        if (!location.data.cityId) throw new Error('We could not work out which city you are in.');
        place = await repos.places.create({ name: choice.name, cityId: location.data.cityId, ...location.data.point });
      }
      const entry = await repos.entries.create({
        placeId: place.id,
        rating,
        photos: photo ? [{ url: photo }] : [],
      });
      invalidate();
      setSaved({ entryId: entry.id, placeName: place.name, rating });
      setChoice(null);
      setRating(null);
      setPhoto(null);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Log a meal"
        subtitle={location.data ? `You're near ${location.data.label}` : 'Finding where you are…'}
      />

      {saved && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-success/60 bg-surface p-4"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-success text-canvas">
            <Icon name="check" />
          </span>
          <div className="min-w-40 flex-1">
            <p className="font-bold">Saved</p>
            <p className="truncate text-sm text-muted">
              {saved.placeName} · {saved.rating} {saved.rating === 1 ? 'star' : 'stars'}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Link to={`/entry/${saved.entryId}/edit`} className={buttonClasses('secondary')}>
              Add details
            </Link>
            <Link to={`/entry/${saved.entryId}`} className={buttonClasses('ghost')}>
              View
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="place-query" className="mb-2 block text-sm font-semibold text-muted">
            Search or type a place name
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <Icon name="search" />
            </span>
            <input
              id="place-query"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Sunrise Café"
              className="min-h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3 text-base text-fg placeholder:text-muted"
            />
          </div>
        </div>

        <PlaceSuggestionList
          legend={trimmed ? 'Matching places' : 'Nearby places'}
          suggestions={list}
          newPlaceName={newPlaceName}
          newPlaceWhere={location.data ? `at ${location.data.label}` : undefined}
          selected={choice}
          onSelect={pick}
        />

        <RatingInput name="rating" value={rating} onChange={setRating} />

        <PhotoPicker value={photo} onChange={setPhoto} />

        {error && (
          <p role="alert" className="rounded-xl border border-danger/60 p-3 text-danger">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canSave} className="w-full min-h-14 text-lg">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {!canSave && !saving && (
          <p className="-mt-3 text-center text-sm text-muted" aria-live="polite">
            {choice ? 'Pick a rating to save.' : 'Pick a place and a rating to save.'}
          </p>
        )}
      </form>

      {recent.data && recent.data.length > 0 && (
        <section aria-labelledby="recent-heading" className="mt-8">
          <h2 id="recent-heading" className="mb-3 text-lg font-bold">
            Recent
          </h2>
          <ul className="space-y-2">
            {recent.data.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

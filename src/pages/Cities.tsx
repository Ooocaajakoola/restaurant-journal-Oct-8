import { CityCard } from '../components/city/CityCard';
import { PageHeader } from '../components/layout/PageHeader';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';

export default function Cities() {
  const repos = useRepositories();
  const { data: cities, loading } = useAsyncData(() => repos.cities.listVisited(), []);

  return (
    <>
      <PageHeader title="Cities" subtitle={cities ? `${cities.length} cities visited` : 'Where you have eaten'} />
      {loading && !cities && <p role="status">Loading…</p>}
      {cities && cities.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
          No cities yet. Log your first meal and its city will appear here.
        </p>
      )}
      {cities && cities.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2" aria-label="Cities visited">
          {cities.map((c) => (
            <CityCard key={c.id} city={c} />
          ))}
        </ul>
      )}
    </>
  );
}

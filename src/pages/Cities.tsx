import { Link } from 'react-router-dom';
import { CityCard } from '../components/city/CityCard';
import { PageHeader } from '../components/layout/PageHeader';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { plural } from '../lib/format';
import { listSharePath } from '../lib/shareLink';

export default function Cities() {
  const repos = useRepositories();
  const { data: cities, loading } = useAsyncData(() => repos.cities.listVisited(), []);
  const lists = useAsyncData(() => repos.lists.listMine(), []);

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

      {lists.data && lists.data.length > 0 && (
        <section aria-labelledby="lists-h" className="mt-8">
          <h2 id="lists-h" className="mb-3 text-lg font-bold">
            Your lists
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {lists.data.map((l) => (
              <li key={l.id}>
                <Link
                  to={listSharePath(l.id)}
                  className="block min-h-14 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2"
                >
                  <span className="block font-semibold">{l.title}</span>
                  <span className="block text-sm text-muted">
                    {plural(l.items.length, 'place')}
                    {l.shareEnabled ? ' · shared by link' : ' · private'}
                    {l.sourceListId ? ' · saved from a shared list' : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

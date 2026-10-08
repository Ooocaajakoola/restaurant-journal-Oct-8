import { createMemoryStorage } from './storage';
import { createMockRepositories } from './index';
import { DB_KEY } from './db';
import { createTestRepositories, TEST_NOW } from '../../test/mockRepos';
import { runRepositoryContract } from '../contract/repositoryContract';
import { needsFinishing } from '../../lib/entry';

runRepositoryContract('mock (localStorage)', () => ({ repos: createTestRepositories() }));

describe('mock persistence and seed', () => {
  it('seeds 10 cities, ~25 places and ~40 entries', async () => {
    const repos = createTestRepositories();
    expect((await repos.cities.list()).length).toBe(10);
    const entries = (await Promise.all((await repos.cities.list()).map((c) => repos.entries.list({ cityId: c.id })))).flat();
    expect(entries.length).toBe(40);
    const here = await repos.location.getCurrentLocation();
    expect((await repos.places.listNearby(here.point, { radiusKm: 20_000, limit: 100 })).length).toBeGreaterThanOrEqual(25);
  });

  it('seeds a mix of quick and complete entries, some of which need finishing', async () => {
    const entries = await createTestRepositories().entries.list();
    expect(entries.some((e) => needsFinishing(e))).toBe(true);
    expect(entries.some((e) => e.status === 'complete')).toBe(true);
    expect(entries.filter((e) => e.photos.length > 0).length).toBeGreaterThan(5);
  });

  it('persists writes to storage and reloads them in a new instance', async () => {
    const storage = createMemoryStorage();
    const a = createTestRepositories(storage);
    const place = (await a.places.search('bao alley'))[0]!;
    const created = await a.entries.create({ placeId: place.id, rating: 5, note: 'persisted' });
    expect(storage.getItem(DB_KEY)).toContain('persisted');

    const b = createMockRepositories({ storage });
    expect((await b.entries.get(created.id))?.note).toBe('persisted');
  });

  it('does not reseed (or duplicate data) when storage already has data', async () => {
    const storage = createMemoryStorage();
    const first = createTestRepositories(storage);
    const count = (await first.entries.list()).length;
    const second = createMockRepositories({ storage });
    const third = createMockRepositories({ storage });
    expect((await second.entries.list()).length).toBe(count);
    expect((await third.entries.list()).length).toBe(count);
  });

  it('reseeds if stored data is corrupt', async () => {
    const storage = createMemoryStorage();
    storage.setItem(DB_KEY, '{not json');
    const repos = createMockRepositories({ storage });
    expect((await repos.cities.list()).length).toBe(10);
  });

  it('resetSampleData restores the seed', async () => {
    const repos = createTestRepositories();
    const [first] = await repos.entries.list();
    await repos.entries.delete(first!.id);
    repos.resetSampleData();
    expect(await repos.entries.get(first!.id)).not.toBeNull();
  });

  it('bumps updatedAt on every write and keeps createdAt', async () => {
    const repos = createTestRepositories();
    const place = (await repos.places.search('bao alley'))[0]!;
    const e = await repos.entries.create({ placeId: place.id, rating: 3 });
    const u = await repos.entries.update(e.id, { rating: 4 });
    expect(u.createdAt).toBe(e.createdAt);
    expect(u.updatedAt > e.updatedAt).toBe(true);
    expect(new Date(u.updatedAt).getTime()).toBeGreaterThanOrEqual(TEST_NOW.getTime());
  });

  it('gives every new record a client-generated id and timestamps', async () => {
    const repos = createTestRepositories();
    const place = (await repos.places.search('bao alley'))[0]!;
    const e = await repos.entries.create({ placeId: place.id, rating: 3, dishes: [{ name: 'Bao' }], photos: [{ url: 'x' }], tags: ['t'] });
    for (const r of [e, e.dishes[0]!, e.photos[0]!, e.tags[0]!]) {
      expect(r.id).toMatch(/^test-id-/);
      expect(r.createdAt).toBeTruthy();
      expect(r.updatedAt).toBeTruthy();
    }
  });

  it('throws a friendly error when storage is full', async () => {
    const storage = createMemoryStorage();
    const repos = createTestRepositories(storage);
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    const place = (await repos.places.search('bao alley'))[0]!;
    await expect(repos.entries.create({ placeId: place.id, rating: 3 })).rejects.toThrow(/storage is full/i);
  });
});

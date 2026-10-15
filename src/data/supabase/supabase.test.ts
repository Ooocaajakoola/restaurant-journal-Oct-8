import type { SupabaseClient } from '@supabase/supabase-js';
import { boundingBox } from '../../lib/geo';
import { escapeLike } from '../../lib/like';
import { createSessionManager } from './session';
import { toEntryView, toListView, type EntryJoinRow, type ListJoinRow, type CityRow, type PlaceWithCityRow } from './rows';

const stamps = { created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-02T10:00:00Z' };
const city: CityRow = { id: 'c1', name: 'London', country: 'United Kingdom', country_code: 'GB', airport_codes: ['LHR'], lat: 51.5, lng: -0.12, currency_code: 'GBP', ...stamps };
const place: PlaceWithCityRow = { id: 'p1', city_id: 'c1', name: 'Bao Alley', address: '8 Lexington St', lat: 51.51, lng: -0.13, cuisine: 'Taiwanese', price_level: 2, city, ...stamps };

describe('row mappers', () => {
  const row: EntryJoinRow = {
    id: 'e1', user_id: 'u1', place_id: 'p1', visited_at: '2026-10-01T19:00:00Z', rating: 4, would_return: null, note: 'Great',
    price: '12.50', currency: 'GBP', meal_type: 'dinner', status: 'complete', visibility: 'crew', ...stamps, place,
    dishes: [
      { id: 'd2', entry_id: 'e1', name: 'Second', note: '', position: 1, ...stamps },
      { id: 'd1', entry_id: 'e1', name: 'First', note: '', position: 0, ...stamps },
    ],
    photos: [{ id: 'ph1', entry_id: 'e1', url: 'https://x/y.jpg', storage_path: 'u1/ph1.jpg', caption: '', position: 0, ...stamps }],
    entry_tags: [{ tag: { id: 't1', user_id: 'u1', name: 'late-night', ...stamps } }],
  };

  it('maps a joined entry row into an EntryView (camelCase, numeric price, ordered dishes, tag ids)', () => {
    const e = toEntryView(row);
    expect(e).toMatchObject({
      id: 'e1', userId: 'u1', placeId: 'p1', visitedAt: row.visited_at, rating: 4, wouldReturn: null, price: 12.5,
      mealType: 'dinner', visibility: 'crew', tagIds: ['t1'], createdAt: stamps.created_at, updatedAt: stamps.updated_at,
    });
    expect(e.dishes.map((d) => d.name)).toEqual(['First', 'Second']);
    expect(e.place).toMatchObject({ name: 'Bao Alley', cityId: 'c1', priceLevel: 2 });
    expect(e.city).toMatchObject({ name: 'London', airportCodes: ['LHR'], currencyCode: 'GBP' });
    expect(e.photos[0]!.url).toBe('https://x/y.jpg');
    expect(e.tags[0]!.name).toBe('late-night');
  });

  it('keeps a missing price as null', () => {
    expect(toEntryView({ ...row, price: null }).price).toBeNull();
  });

  it('maps a joined list row, ordering items and falling back for a missing owner name', () => {
    const list: ListJoinRow = {
      id: 'l1', owner_id: 'u2', owner_name: '', title: 'Lisbon', description: '', city_id: null, visibility: 'friends',
      share_enabled: true, source_list_id: null, ...stamps,
      items: [
        { id: 'i2', list_id: 'l1', place_id: 'p1', entry_id: null, position: 1, note: 'b', rating: null, ...stamps, place },
        { id: 'i1', list_id: 'l1', place_id: 'p1', entry_id: 'e1', position: 0, note: 'a', rating: 5, ...stamps, place },
      ],
    };
    const v = toListView(list);
    expect(v.owner).toEqual({ id: 'u2', displayName: 'Someone' });
    expect(v.shareEnabled).toBe(true);
    expect(v.items.map((i) => i.note)).toEqual(['a', 'b']);
    expect(v.items[0]).toMatchObject({ rating: 5, entryId: 'e1' });
    expect(v.items[0]!.city.name).toBe('London');
  });
});

describe('query helpers', () => {
  it('escapes LIKE wildcards so user text is matched literally', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
    expect(escapeLike('plain')).toBe('plain');
  });

  it('builds a bounding box that contains the radius', () => {
    const box = boundingBox({ lat: 51.5, lng: -0.12 }, 5);
    expect(box.latMin).toBeLessThan(51.5 - 0.04);
    expect(box.latMax).toBeGreaterThan(51.5 + 0.04);
    expect(box.lngMin).toBeLessThan(-0.12);
    expect(box.lngMax).toBeGreaterThan(-0.12);
  });

  it('drops the longitude limit when the box would cross the date line', () => {
    const box = boundingBox({ lat: -17.7, lng: 179.9 }, 50);
    expect(box.lngMin).toBeNull();
    expect(box.lngMax).toBeNull();
  });
});

describe('session manager', () => {
  function fakeClient(opts: { session?: boolean; anonError?: { message: string; code?: string } }) {
    const signInAnonymously = vi.fn(async () =>
      opts.anonError ? { data: { user: null }, error: opts.anonError } : { data: { user: { id: 'anon-1' } }, error: null },
    );
    const getSession = vi.fn(async () => ({
      data: { session: opts.session ? { user: { id: 'existing-1' } } : null },
      error: null,
    }));
    return { client: { auth: { getSession, signInAnonymously } } as unknown as SupabaseClient, signInAnonymously, getSession };
  }

  it('reuses an existing session instead of signing in again', async () => {
    const { client, signInAnonymously } = fakeClient({ session: true });
    expect(await createSessionManager(client).ready()).toBe('existing-1');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously once and shares the result across concurrent callers', async () => {
    const { client, signInAnonymously } = fakeClient({});
    const s = createSessionManager(client);
    const ids = await Promise.all([s.ready(), s.ready(), s.ready()]);
    expect(ids).toEqual(['anon-1', 'anon-1', 'anon-1']);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('explains how to turn on anonymous sign-ins when they are disabled, and allows retry', async () => {
    const { client, signInAnonymously } = fakeClient({ anonError: { message: 'Anonymous sign-ins are disabled', code: 'anonymous_provider_disabled' } });
    const s = createSessionManager(client);
    await expect(s.ready()).rejects.toThrow(/Allow anonymous sign-ins/);
    await expect(s.ready()).rejects.toThrow(/Allow anonymous sign-ins/);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });
});

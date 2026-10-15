/**
 * Live end-to-end check against the real Supabase project. Skipped by default, because it signs in
 * anonymous users and writes (then deletes) rows. Run it deliberately:
 *
 *   SUPABASE_E2E=1 npm test -- supabase.e2e
 *
 * Needs VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env and "Confirm email" switched OFF in
 * Supabase (Authentication -> Sign In / Providers -> Email), so test accounts can sign in at once.
 * Each run creates two throwaway accounts (e2e-...@example.com); see the README for removing them.
 */
import { createClient } from '@supabase/supabase-js';
import type { Repositories } from '../repositories';
import { createSupabaseRepositories } from './index';

// Vitest exposes .env (VITE_ values) on import.meta.env; the opt-in flag comes from the shell.
declare const process: { env: Record<string, string | undefined> };
const env = import.meta.env;
const enabled = !!process.env.SUPABASE_E2E && !!env.VITE_SUPABASE_URL && !!env.VITE_SUPABASE_ANON_KEY;

// 1x1 transparent PNG
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const runId = Math.random().toString(36).slice(2, 10);

/** A separate in-memory session per call, so each one is a different person. */
function newPerson(): Repositories {
  const store = new Map<string, string>();
  const client = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) },
    },
  });
  return createSupabaseRepositories(client);
}

describe.skipIf(!enabled)('Supabase end-to-end (live project)', () => {
  const ana = newPerson();
  const ben = newPerson();

  async function register(repos: Repositories, name: string) {
    const result = await repos.auth.signUp({ email: `e2e-${runId}-${name.toLowerCase()}@example.com`, password: `Pw-${runId}-123`, displayName: name });
    if (result.status !== 'signed-in') {
      throw new Error('Sign-up needs email confirmation. Turn "Confirm email" off in Supabase to run this test.');
    }
    return result.user;
  }

  const created = { ana: [] as string[], anaLists: [] as string[], benLists: [] as string[] };

  afterAll(async () => {
    for (const id of created.ana) await ana.entries.delete(id).catch(() => undefined);
    for (const id of created.anaLists) await ana.lists.delete(id).catch(() => undefined);
    for (const id of created.benLists) await ben.lists.delete(id).catch(() => undefined);
  });

  it('signs up, signs out and back in, and reads the shared catalogue', async () => {
    const user = await register(ana, 'Ana');
    await register(ben, 'Ben');
    expect(user.displayName).toBe('Ana');
    expect((await ana.auth.getUser())?.id).toBe(user.id);

    await ana.auth.signOut();
    expect(await ana.auth.getUser()).toBeNull();
    await expect(ana.entries.list()).rejects.toThrow(/sign in/i);
    await expect(ana.auth.signIn(user.email!, 'wrong-password')).rejects.toThrow('Incorrect email or password.');
    expect((await ana.auth.signIn(user.email!, `Pw-${runId}-123`)).id).toBe(user.id);

    expect((await ana.cities.list()).length).toBe(10);
    const nearby = await ana.places.listNearby({ lat: 51.5136, lng: -0.1365 }, { radiusKm: 5, limit: 10 });
    expect(nearby.map((p) => p.name)).toContain('Bao Alley');
    expect((await ana.places.search('sushi')).map((p) => p.name)).toContain('Sushi Daiwa-ya');
  });

  it('starts with an empty journal and a default profile', async () => {
    expect(await ana.entries.list()).toEqual([]);
    expect(await ana.cities.listVisited()).toEqual([]);
    const me = await ana.users.getCurrent();
    expect(me.defaultVisibility).toBe('private');
    expect(me.displayName).toBe('Ana'); // the name chosen at sign-up
  });

  it('creates, reads, filters, updates and deletes an entry with dishes, tags and a photo', async () => {
    const place = (await ana.places.search('bao alley'))[0]!;
    const entry = await ana.entries.create({
      placeId: place.id,
      rating: 4,
      note: 'e2e',
      price: 12.5,
      dishes: [{ name: 'Gua bao' }, { name: 'Tea' }],
      tags: ['E2E Tag', 'late-night'],
      photos: [{ url: PNG }],
    });
    created.ana.push(entry.id);

    expect(entry.status).toBe('quick');
    expect(entry.currency).toBe('GBP');
    expect(entry.price).toBe(12.5);
    expect(entry.dishes.map((d) => d.name)).toEqual(['Gua bao', 'Tea']);
    expect(entry.tags.map((t) => t.name).sort()).toEqual(['e2e-tag', 'late-night']);
    expect(entry.photos[0]!.url).toMatch(/\/storage\/v1\/object\/public\/entry-photos\//);
    expect((await fetch(entry.photos[0]!.url)).ok).toBe(true);

    expect((await ana.entries.list({ dish: 'gua' })).map((e) => e.id)).toContain(entry.id);
    expect((await ana.entries.list({ tag: 'late-night' })).map((e) => e.id)).toContain(entry.id);
    expect((await ana.cities.listVisited())[0]).toMatchObject({ name: 'London', entryCount: 1 });
    expect((await ana.tags.list()).map((t) => t.name)).toContain('late-night');

    const keep = entry.dishes[0]!;
    const updated = await ana.entries.update(entry.id, {
      rating: 5,
      status: 'complete',
      dishes: [{ id: keep.id, name: 'Pork bao' }, { name: 'Sesame ball' }],
      tags: ['late-night'],
      photos: [],
    });
    expect(updated.rating).toBe(5);
    expect(updated.dishes.map((d) => d.name)).toEqual(['Pork bao', 'Sesame ball']);
    expect(updated.dishes[0]!.id).toBe(keep.id);
    expect(updated.tags.map((t) => t.name)).toEqual(['late-night']);
    expect(updated.photos).toEqual([]);
    expect(updated.updatedAt > entry.updatedAt).toBe(true);

    await expect(ana.entries.update('00000000-0000-4000-8000-000000000000', { rating: 1 })).rejects.toThrow();

    await ana.entries.delete(entry.id);
    expect(await ana.entries.get(entry.id)).toBeNull();
    created.ana = created.ana.filter((id) => id !== entry.id);
  });

  it('lets someone add a new place, and re-uses it on a repeat', async () => {
    const london = (await ana.cities.list()).find((c) => c.name === 'London')!;
    const a = await ana.places.create({ name: 'E2E Test Bistro', cityId: london.id, lat: london.lat, lng: london.lng });
    const b = await ana.places.create({ name: 'e2e test bistro', cityId: london.id, lat: london.lat, lng: london.lng });
    expect(b.id).toBe(a.id);
    expect(a.city.name).toBe('London');
  });

  it('keeps each person’s journal private and shares lists by link', async () => {
    const place = (await ana.places.search('sunrise'))[0]!;
    const entry = await ana.entries.create({ placeId: place.id, rating: 5, note: 'private note' });
    created.ana.push(entry.id);

    // Ben cannot see Ana's entry, her cities or her tags.
    expect(await ben.entries.get(entry.id)).toBeNull();
    expect(await ben.entries.list()).toEqual([]);
    expect(await ben.cities.listVisited()).toEqual([]);
    await expect(ben.entries.update(entry.id, { rating: 1 })).rejects.toThrow();
    await ben.entries.delete(entry.id); // silently a no-op under RLS
    expect(await ana.entries.get(entry.id)).not.toBeNull();

    // An unshared list is invisible to Ben; a shared one is readable with the rating, not the note.
    const hidden = await ana.lists.create({ title: 'E2E private', items: [{ placeId: place.id, entryId: entry.id }] });
    const shared = await ana.lists.create({ title: 'E2E shared', shareEnabled: true, items: [{ placeId: place.id, entryId: entry.id, note: 'go here' }] });
    created.anaLists.push(hidden.id, shared.id);
    expect(await ben.lists.getShared(hidden.id)).toBeNull();
    const seen = (await ben.lists.getShared(shared.id))!;
    expect(seen.title).toBe('E2E shared');
    expect(seen.items[0]).toMatchObject({ note: 'go here', rating: 5 });
    expect(seen.owner.displayName).toBeTruthy();
    expect(await ben.lists.get(shared.id)).toBeNull(); // not his own list

    // Ben saves a private copy; Ana can't see it.
    const copy = await ben.lists.saveCopyToMyJournal(shared.id);
    created.benLists.push(copy.id);
    expect(copy).toMatchObject({ sourceListId: shared.id, visibility: 'private', shareEnabled: false });
    expect(copy.items.map((i) => i.placeId)).toEqual([place.id]);
    expect(copy.items[0]!.rating).toBeNull();
    expect((await ben.lists.listMine()).map((l) => l.id)).toContain(copy.id);
    expect((await ana.lists.listMine()).map((l) => l.id)).not.toContain(copy.id);
    await expect(ben.lists.saveCopyToMyJournal(hidden.id)).rejects.toThrow();
  });

  it('keeps the entry rating on a shared list but never exposes the entry', async () => {
    const [first] = created.ana;
    expect(first).toBeTruthy();
    expect(await ben.entries.get(first!)).toBeNull();
  });

  it('updates the profile and the name shown on shared lists', async () => {
    const me = await ana.users.updateCurrent({ displayName: 'Ana Updated', homeAirport: 'lhr', defaultVisibility: 'crew' });
    expect(me).toMatchObject({ displayName: 'Ana Updated', homeAirport: 'LHR', defaultVisibility: 'crew' });
    const place = (await ana.places.search('sunrise'))[0]!;
    expect((await ana.entries.create({ placeId: place.id, rating: 3 }).then((e) => (created.ana.push(e.id), e))).visibility).toBe('crew');
    const sharedId = created.anaLists[1]!;
    expect((await ben.lists.getShared(sharedId))!.owner.displayName).toBe('Ana Updated');
  });
});

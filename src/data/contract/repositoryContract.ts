/**
 * Behaviour every Repositories implementation must satisfy. The mock runs it now;
 * run it against the Supabase implementation later (against a seeded test project).
 */
import type { Repositories } from '../repositories';

export interface ContractContext {
  repos: Repositories;
}

export function runRepositoryContract(name: string, make: () => ContractContext | Promise<ContractContext>) {
  describe(`${name}: repository contract`, () => {
    let repos: Repositories;
    beforeEach(async () => {
      repos = (await make()).repos;
    });

    describe('cities', () => {
      it('lists all cities with airport codes and coordinates', async () => {
        const cities = await repos.cities.list();
        expect(cities.length).toBe(10);
        const london = cities.find((c) => c.name === 'London')!;
        expect(london.airportCodes).toContain('LHR');
        expect(typeof london.lat).toBe('number');
        expect(typeof london.lng).toBe('number');
      });

      it('reports entry counts and last visit for visited cities, newest first', async () => {
        const visited = await repos.cities.listVisited();
        expect(visited.length).toBe(10);
        const total = visited.reduce((n, c) => n + c.entryCount, 0);
        expect((await repos.entries.list()).length).toBe(total);
        const dates = visited.map((c) => c.lastVisitedAt!);
        expect(dates).toEqual([...dates].sort().reverse());
      });

      it('returns null for an unknown city', async () => {
        expect(await repos.cities.get('nope')).toBeNull();
      });
    });

    describe('places', () => {
      it('finds nearby places nearest-first within the radius', async () => {
        const here = await repos.location.getCurrentLocation();
        const nearby = await repos.places.listNearby(here.point, { radiusKm: 5, limit: 10 });
        expect(nearby.length).toBeGreaterThan(2);
        expect(nearby.every((p) => p.distanceKm <= 5)).toBe(true);
        const d = nearby.map((p) => p.distanceKm);
        expect(d).toEqual([...d].sort((a, b) => a - b));
        expect(nearby[0]!.city.id).toBe(here.cityId);
      });

      it('searches by name, cuisine and city, case-insensitively', async () => {
        expect((await repos.places.search('copper'))[0]?.name).toBe('The Copper Pot');
        expect((await repos.places.search('SUSHI')).map((p) => p.name)).toContain('Sushi Daiwa-ya');
        expect((await repos.places.search('lisbon')).length).toBeGreaterThanOrEqual(2);
        expect(await repos.places.search('   ')).toEqual([]);
      });

      it('creates a place, and reuses it if the same name is added to the same city', async () => {
        const here = await repos.location.getCurrentLocation();
        const a = await repos.places.create({ name: 'Brand New Bistro', cityId: here.cityId!, ...here.point });
        const b = await repos.places.create({ name: 'brand new bistro', cityId: here.cityId!, ...here.point });
        expect(b.id).toBe(a.id);
        expect((await repos.places.get(a.id))?.city.id).toBe(here.cityId);
      });

      it('rejects an empty place name', async () => {
        await expect(repos.places.create({ name: '  ', cityId: 'x', lat: 0, lng: 0 })).rejects.toThrow();
      });
    });

    describe('entries', () => {
      it('lists newest visit first with place, city, dishes, photos and tags joined', async () => {
        const all = await repos.entries.list();
        expect(all.length).toBeGreaterThanOrEqual(38);
        const dates = all.map((e) => e.visitedAt);
        expect(dates).toEqual([...dates].sort().reverse());
        const rich = all.find((e) => e.dishes.length > 0 && e.photos.length > 0 && e.tags.length > 0)!;
        expect(rich.place.name).toBeTruthy();
        expect(rich.city.name).toBeTruthy();
      });

      it('creates a quick entry with sensible defaults', async () => {
        const place = (await repos.places.search('bao alley'))[0]!;
        const e = await repos.entries.create({ placeId: place.id, rating: 4 });
        expect(e.status).toBe('quick');
        expect(e.currency).toBe('GBP');
        expect(e.dishes).toEqual([]);
        expect(e.price).toBeNull();
        expect(e.wouldReturn).toBeNull();
        expect(e.id).toBeTruthy();
        expect(e.updatedAt).toBe(e.createdAt);
        expect((await repos.entries.get(e.id))?.rating).toBe(4);
      });

      it('uses the user default visibility unless one is given', async () => {
        const user = await repos.users.updateCurrent({ defaultVisibility: 'friends' });
        const place = (await repos.places.search('bao alley'))[0]!;
        expect((await repos.entries.create({ placeId: place.id, rating: 3 })).visibility).toBe(user.defaultVisibility);
        expect((await repos.entries.create({ placeId: place.id, rating: 3, visibility: 'private' })).visibility).toBe('private');
      });

      it('normalises tags and creates them on demand', async () => {
        const place = (await repos.places.search('bao alley'))[0]!;
        const e = await repos.entries.create({ placeId: place.id, rating: 5, tags: ['#Hidden Gem', 'hidden-gem', ' Crew Favourite '] });
        expect(e.tags.map((t) => t.name).sort()).toEqual(['crew-favourite', 'hidden-gem']);
        expect((await repos.tags.list()).map((t) => t.name)).toContain('hidden-gem');
      });

      it('updates fields and replaces dishes while keeping the identity of kept ones', async () => {
        const place = (await repos.places.search('bao alley'))[0]!;
        const created = await repos.entries.create({ placeId: place.id, rating: 3, dishes: [{ name: 'Bao' }, { name: 'Tea' }] });
        const keep = created.dishes[0]!;
        const updated = await repos.entries.update(created.id, {
          rating: 5,
          note: 'Great',
          status: 'complete',
          dishes: [{ id: keep.id, name: 'Pork bao' }, { name: 'Sesame ball' }],
        });
        expect(updated.rating).toBe(5);
        expect(updated.status).toBe('complete');
        expect(updated.dishes.map((d) => d.name)).toEqual(['Pork bao', 'Sesame ball']);
        expect(updated.dishes[0]!.id).toBe(keep.id);
        expect(updated.dishes[1]!.id).not.toBe(keep.id);
        expect(updated.note).toBe('Great');
      });

      it('leaves untouched fields and child sets alone when a patch omits them', async () => {
        const place = (await repos.places.search('bao alley'))[0]!;
        const created = await repos.entries.create({ placeId: place.id, rating: 3, note: 'keep me', dishes: [{ name: 'Bao' }], tags: ['a-tag'] });
        const updated = await repos.entries.update(created.id, { rating: 2 });
        expect(updated.note).toBe('keep me');
        expect(updated.dishes).toHaveLength(1);
        expect(updated.tags).toHaveLength(1);
      });

      it('deletes an entry along with its dishes and photos', async () => {
        const place = (await repos.places.search('bao alley'))[0]!;
        const e = await repos.entries.create({ placeId: place.id, rating: 3, dishes: [{ name: 'Bao' }], photos: [{ url: 'data:image/png;base64,AAAA' }] });
        const before = (await repos.entries.list()).length;
        await repos.entries.delete(e.id);
        expect(await repos.entries.get(e.id)).toBeNull();
        expect((await repos.entries.list()).length).toBe(before - 1);
      });

      it('throws when updating an entry that does not exist', async () => {
        await expect(repos.entries.update('missing', { rating: 1 })).rejects.toThrow();
      });

      it('filters by city, cuisine, rating, price level, tag and status', async () => {
        const london = (await repos.cities.list()).find((c) => c.name === 'London')!;
        const inLondon = await repos.entries.list({ cityId: london.id });
        expect(inLondon.length).toBeGreaterThan(0);
        expect(inLondon.every((e) => e.city.id === london.id)).toBe(true);

        expect((await repos.entries.list({ cuisine: 'Café' })).every((e) => e.place.cuisine === 'Café')).toBe(true);
        expect((await repos.entries.list({ minRating: 5 })).every((e) => e.rating === 5)).toBe(true);
        expect((await repos.entries.list({ priceLevel: 1 })).every((e) => e.place.priceLevel === 1)).toBe(true);
        const crew = await repos.entries.list({ tag: 'crew-favourite' });
        expect(crew.length).toBeGreaterThan(0);
        expect(crew.every((e) => e.tags.some((t) => t.name === 'crew-favourite'))).toBe(true);
        expect((await repos.entries.list({ status: 'quick' })).every((e) => e.status === 'quick')).toBe(true);
      });

      it('searches by dish, city, tag and date', async () => {
        const byDish = await repos.entries.list({ dish: 'croissant' });
        expect(byDish.length).toBeGreaterThan(0);
        expect(byDish.every((e) => e.dishes.some((d) => d.name.toLowerCase().includes('croissant')))).toBe(true);

        expect((await repos.entries.list({ city: 'tokyo' })).every((e) => e.city.name === 'Tokyo')).toBe(true);
        expect((await repos.entries.list({ city: 'NRT' })).every((e) => e.city.name === 'Tokyo')).toBe(true);
        expect((await repos.entries.list({ tagQuery: 'crew' })).length).toBeGreaterThan(0);

        const all = await repos.entries.list();
        const day = all[5]!.visitedAt.slice(0, 10);
        const onDay = await repos.entries.list({ dateFrom: day, dateTo: day });
        expect(onDay.length).toBeGreaterThan(0);
        expect(onDay.every((e) => e.visitedAt.startsWith(day))).toBe(true);

        const text = await repos.entries.list({ text: 'ramen' });
        expect(text.length).toBeGreaterThan(0);
      });

      it('returns copies, so mutating a result does not change stored data', async () => {
        const [first] = await repos.entries.list();
        first!.note = 'mutated';
        first!.place.name = 'mutated';
        const again = await repos.entries.get(first!.id);
        expect(again!.note).not.toBe('mutated');
        expect(again!.place.name).not.toBe('mutated');
      });
    });

    describe('lists', () => {
      it('shows a shared list read-only by id, and hides unshared ones', async () => {
        const shared = await repos.lists.getShared('list-ana-lisbon');
        expect(shared?.owner.displayName).toBe('Ana Costa');
        expect(shared!.items.length).toBeGreaterThan(0);
        expect(shared!.items[0]!.place.name).toBeTruthy();
        expect(await repos.lists.getShared('list-ana-private')).toBeNull();
        expect(await repos.lists.getShared('nope')).toBeNull();
      });

      it('saves a copy of a shared list into my lists, as private', async () => {
        const before = (await repos.lists.listMine()).length;
        const copy = await repos.lists.saveCopyToMyJournal('list-ana-lisbon');
        expect(copy.sourceListId).toBe('list-ana-lisbon');
        expect(copy.visibility).toBe('private');
        expect(copy.shareEnabled).toBe(false);
        expect(copy.items.map((i) => i.place.id)).toEqual((await repos.lists.getShared('list-ana-lisbon'))!.items.map((i) => i.place.id));
        expect((await repos.lists.listMine()).length).toBe(before + 1);
      });

      it('refuses to save a list that is not shared', async () => {
        await expect(repos.lists.saveCopyToMyJournal('list-ana-private')).rejects.toThrow();
      });

      it('creates a shareable list from entries and removes duplicate places', async () => {
        const entries = (await repos.entries.list({ placeId: (await repos.places.search('sunrise'))[0]!.id }));
        const list = await repos.lists.create({
          title: 'My London',
          shareEnabled: true,
          items: entries.map((e) => ({ placeId: e.placeId, entryId: e.id })),
        });
        expect(list.items).toHaveLength(1);
        expect(list.items[0]!.rating).toBe(entries[0]!.rating);
        expect((await repos.lists.getShared(list.id))?.title).toBe('My London');
        await repos.lists.delete(list.id);
        expect(await repos.lists.get(list.id)).toBeNull();
      });
    });

    describe('users', () => {
      it('updates settings', async () => {
        const u = await repos.users.updateCurrent({ defaultVisibility: 'private', homeAirport: ' fra ' });
        expect(u.defaultVisibility).toBe('private');
        expect(u.homeAirport).toBe('FRA');
        expect((await repos.users.getCurrent()).defaultVisibility).toBe('private');
      });
    });
  });
}

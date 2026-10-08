import { distanceKm } from '../../lib/geo';
import type { Place } from '../../types';
import type { PlaceRepository, PlaceWithCity } from '../repositories';
import { clone } from './clone';
import type { MockContext } from './db';

export function createPlaceRepository({ db, now, newId }: MockContext): PlaceRepository {
  function withCity(p: Place): PlaceWithCity {
    const city = db.data.cities.find((c) => c.id === p.cityId);
    if (!city) throw new Error(`Place ${p.id} points at a missing city`);
    return clone({ ...p, city });
  }

  return {
    async get(id) {
      const p = db.data.places.find((x) => x.id === id);
      return p ? withCity(p) : null;
    },

    async listNearby(point, { radiusKm = 5, limit = 6 } = {}) {
      return db.data.places
        .map((p) => ({ ...withCity(p), distanceKm: distanceKm(point, p) }))
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);
    },

    async search(query, { cityId, limit = 8 } = {}) {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return db.data.places
        .filter((p) => !cityId || p.cityId === cityId)
        .map(withCity)
        .filter((p) => [p.name, p.cuisine, p.city.name].some((s) => s.toLowerCase().includes(q)))
        .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name))
        .slice(0, limit);
    },

    async create(input) {
      const name = input.name.trim();
      if (!name) throw new Error('A place needs a name');
      if (!db.data.cities.some((c) => c.id === input.cityId)) throw new Error(`Unknown city ${input.cityId}`);
      const stamp = now().toISOString();
      // Re-use an existing place with the same name in the same city instead of duplicating it.
      const dupe = db.data.places.find((p) => p.cityId === input.cityId && p.name.toLowerCase() === name.toLowerCase());
      if (dupe) return withCity(dupe);
      const place: Place = {
        id: newId(), createdAt: stamp, updatedAt: stamp, name, cityId: input.cityId, lat: input.lat, lng: input.lng,
        cuisine: input.cuisine ?? 'Restaurant', address: input.address ?? '', priceLevel: input.priceLevel ?? null,
      };
      db.data.places.push(place);
      db.commit();
      return withCity(place);
    },
  };
}

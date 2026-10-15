import { boundingBox, distanceKm } from '../../lib/geo';
import { escapeLike } from '../../lib/like';
import type { PlaceRepository, PlaceWithCity } from '../repositories';
import { isUniqueViolation, unwrap, type SupabaseContext } from './context';
import { toCity, toPlace, type PlaceWithCityRow } from './rows';

const PLACE_SELECT = '*, city:cities(*)';

const toPlaceWithCity = (r: PlaceWithCityRow): PlaceWithCity => ({ ...toPlace(r), city: toCity(r.city) });

export function createPlaceRepository(ctx: SupabaseContext): PlaceRepository {
  const { client } = ctx;

  return {
    async get(id) {
      const row = unwrap(await client.from('places').select(PLACE_SELECT).eq('id', id).maybeSingle()) as PlaceWithCityRow | null;
      return row ? toPlaceWithCity(row) : null;
    },

    async listNearby(point, { radiusKm = 5, limit = 6 } = {}) {
      const box = boundingBox(point, radiusKm);
      let query = client.from('places').select(PLACE_SELECT).gte('lat', box.latMin).lte('lat', box.latMax);
      if (box.lngMin !== null && box.lngMax !== null) query = query.gte('lng', box.lngMin).lte('lng', box.lngMax);
      const rows = unwrap(await query) as PlaceWithCityRow[];

      return rows
        .map((r) => ({ ...toPlaceWithCity(r), distanceKm: distanceKm(point, r) }))
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);
    },

    async search(query, { cityId, limit = 8 } = {}) {
      const q = query.trim();
      if (!q) return [];
      const pattern = `%${escapeLike(q)}%`;
      const scoped = <T extends { eq(col: string, v: string): T }>(b: T) => (cityId ? b.eq('city_id', cityId) : b);

      const [byName, byCuisine, cities] = await Promise.all([
        scoped(client.from('places').select(PLACE_SELECT).ilike('name', pattern).limit(50)),
        scoped(client.from('places').select(PLACE_SELECT).ilike('cuisine', pattern).limit(50)),
        client.from('cities').select('id').ilike('name', pattern),
      ]);
      const cityIds = (unwrap(cities) as Array<{ id: string }>).map((c) => c.id).filter((id) => !cityId || id === cityId);
      const byCity = cityIds.length
        ? unwrap(await client.from('places').select(PLACE_SELECT).in('city_id', cityIds).limit(50))
        : [];

      const merged = new Map<string, PlaceWithCityRow>();
      for (const r of [...(unwrap(byName) as PlaceWithCityRow[]), ...(unwrap(byCuisine) as PlaceWithCityRow[]), ...(byCity as PlaceWithCityRow[])]) {
        merged.set(r.id, r);
      }
      const lower = q.toLowerCase();
      return [...merged.values()]
        .map(toPlaceWithCity)
        .sort(
          (a, b) =>
            Number(b.name.toLowerCase().startsWith(lower)) - Number(a.name.toLowerCase().startsWith(lower)) ||
            a.name.localeCompare(b.name),
        )
        .slice(0, limit);
    },

    async create(input) {
      const name = input.name.trim();
      if (!name) throw new Error('A place needs a name');
      await ctx.session.ready();

      // Re-use an existing place with the same name in the same city instead of duplicating it.
      const findExisting = async () =>
        unwrap(
          await client.from('places').select(PLACE_SELECT).eq('city_id', input.cityId).ilike('name', escapeLike(name)).maybeSingle(),
        ) as PlaceWithCityRow | null;
      const dupe = await findExisting();
      if (dupe) return toPlaceWithCity(dupe);

      const ts = ctx.now().toISOString();
      try {
        const row = unwrap(
          await client
            .from('places')
            .insert({
              id: ctx.newId(),
              city_id: input.cityId,
              name,
              lat: input.lat,
              lng: input.lng,
              cuisine: input.cuisine ?? 'Restaurant',
              address: input.address ?? '',
              price_level: input.priceLevel ?? null,
              created_at: ts,
              updated_at: ts,
            })
            .select(PLACE_SELECT)
            .single(),
        ) as PlaceWithCityRow;
        return toPlaceWithCity(row);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        const raced = await findExisting();
        if (raced) return toPlaceWithCity(raced);
        throw err;
      }
    },
  };
}

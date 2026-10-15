import type { CityRepository, CityWithStats } from '../repositories';
import { unwrap, type SupabaseContext } from './context';
import { toCity, type CityRow } from './rows';

export function createCityRepository(ctx: SupabaseContext): CityRepository {
  const { client } = ctx;

  return {
    async list() {
      const rows = unwrap(await client.from('cities').select('*').order('name')) as CityRow[];
      return rows.map(toCity);
    },

    async get(id) {
      const row = unwrap(await client.from('cities').select('*').eq('id', id).maybeSingle()) as CityRow | null;
      return row ? toCity(row) : null;
    },

    async listVisited() {
      const uid = await ctx.session.ready();
      const entries = unwrap(
        await client.from('entries').select('visited_at, place:places(city_id)').eq('user_id', uid),
      ) as unknown as Array<{ visited_at: string; place: { city_id: string } | null }>;

      const stats = new Map<string, { count: number; last: string }>();
      for (const e of entries) {
        const cityId = e.place?.city_id;
        if (!cityId) continue;
        const s = stats.get(cityId) ?? { count: 0, last: '' };
        s.count += 1;
        if (e.visited_at > s.last) s.last = e.visited_at;
        stats.set(cityId, s);
      }
      if (stats.size === 0) return [];

      const rows = unwrap(await client.from('cities').select('*').in('id', [...stats.keys()])) as CityRow[];
      const out: CityWithStats[] = rows.map((r) => {
        const s = stats.get(r.id)!;
        return { ...toCity(r), entryCount: s.count, lastVisitedAt: s.last };
      });
      return out.sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? ''));
    },
  };
}

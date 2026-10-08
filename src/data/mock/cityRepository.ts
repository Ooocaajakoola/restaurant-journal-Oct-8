import type { CityRepository, CityWithStats } from '../repositories';
import { clone } from './clone';
import type { MockContext } from './db';

export function createCityRepository({ db }: MockContext): CityRepository {
  return {
    async list() {
      return clone([...db.data.cities].sort((a, b) => a.name.localeCompare(b.name)));
    },

    async get(id) {
      const c = db.data.cities.find((x) => x.id === id);
      return c ? clone(c) : null;
    },

    async listVisited() {
      const { entries, places, cities, currentUserId } = db.data;
      const stats = new Map<string, { count: number; last: string }>();
      for (const e of entries) {
        if (e.userId !== currentUserId) continue;
        const cityId = places.find((p) => p.id === e.placeId)?.cityId;
        if (!cityId) continue;
        const s = stats.get(cityId) ?? { count: 0, last: '' };
        s.count += 1;
        if (e.visitedAt > s.last) s.last = e.visitedAt;
        stats.set(cityId, s);
      }
      const out: CityWithStats[] = [];
      for (const c of cities) {
        const s = stats.get(c.id);
        if (s) out.push({ ...c, entryCount: s.count, lastVisitedAt: s.last });
      }
      return clone(out.sort((a, b) => (b.lastVisitedAt ?? '').localeCompare(a.lastVisitedAt ?? '')));
    },
  };
}

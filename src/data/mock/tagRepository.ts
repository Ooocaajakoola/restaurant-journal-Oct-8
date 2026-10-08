import type { TagRepository, TagWithCount } from '../repositories';
import { clone } from './clone';
import type { MockContext } from './db';

export function createTagRepository({ db }: MockContext): TagRepository {
  return {
    async list() {
      const counts = new Map<string, number>();
      for (const e of db.data.entries) {
        if (e.userId !== db.data.currentUserId) continue;
        for (const id of e.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const out: TagWithCount[] = db.data.tags
        .filter((t) => counts.has(t.id))
        .map((t) => ({ ...t, entryCount: counts.get(t.id)! }));
      return clone(out.sort((a, b) => b.entryCount - a.entryCount || a.name.localeCompare(b.name)));
    },
  };
}

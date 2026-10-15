import type { TagRepository, TagWithCount } from '../repositories';
import { unwrap, type SupabaseContext } from './context';
import { toTag, type TagRow } from './rows';

export function createTagRepository(ctx: SupabaseContext): TagRepository {
  return {
    async list() {
      const uid = await ctx.session.ready();
      const rows = unwrap(
        await ctx.client.from('tags').select('*, entry_tags(count)').eq('user_id', uid),
      ) as unknown as Array<TagRow & { entry_tags: Array<{ count: number }> }>;

      const out: TagWithCount[] = rows
        .map((r) => ({ ...toTag(r), entryCount: r.entry_tags[0]?.count ?? 0 }))
        .filter((t) => t.entryCount > 0);
      return out.sort((a, b) => b.entryCount - a.entryCount || a.name.localeCompare(b.name));
    },
  };
}

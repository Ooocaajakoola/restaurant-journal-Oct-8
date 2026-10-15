import type { Id, Rating, ListView, Visibility } from '../../types';
import type { ListRepository } from '../repositories';
import { SupabaseDataError, unwrap, type SupabaseContext } from './context';
import { toListView, type ListJoinRow } from './rows';
import { loadProfile } from './userRepository';

const LIST_SELECT = '*, items:list_items(*, place:places(*, city:cities(*)))';

interface NewItem {
  placeId: Id;
  entryId: Id | null;
  note: string;
  rating: Rating | null;
}

interface NewList {
  title: string;
  description: string;
  cityId: Id | null;
  visibility: Visibility;
  shareEnabled: boolean;
  sourceListId: Id | null;
  items: NewItem[];
}

export function createListRepository(ctx: SupabaseContext): ListRepository {
  const { client } = ctx;
  const stamp = () => ctx.now().toISOString();

  async function fetchList(id: Id): Promise<ListView | null> {
    const row = unwrap(await client.from('lists').select(LIST_SELECT).eq('id', id).maybeSingle()) as ListJoinRow | null;
    return row ? toListView(row) : null;
  }

  async function insertList(spec: NewList): Promise<ListView> {
    const uid = await ctx.session.ready();
    const profile = await loadProfile(ctx);
    const ts = stamp();
    const id = ctx.newId();

    unwrap(
      await client.from('lists').insert({
        id,
        owner_id: uid,
        owner_name: profile.display_name,
        title: spec.title.trim() || 'Untitled list',
        description: spec.description,
        city_id: spec.cityId,
        visibility: spec.visibility,
        share_enabled: spec.shareEnabled,
        source_list_id: spec.sourceListId,
        created_at: ts,
        updated_at: ts,
      }),
    );

    const seen = new Set<string>();
    const items = spec.items
      .filter((i) => !seen.has(i.placeId) && !!seen.add(i.placeId))
      .map((i, position) => ({
        id: ctx.newId(),
        list_id: id,
        place_id: i.placeId,
        entry_id: i.entryId,
        position,
        note: i.note,
        rating: i.rating,
        created_at: ts,
        updated_at: ts,
      }));
    if (items.length) {
      const res = await client.from('list_items').insert(items);
      if (res.error) {
        await client.from('lists').delete().eq('id', id); // undo
        throw new SupabaseDataError(res.error.message, res.error.code);
      }
    }
    const created = await fetchList(id);
    if (!created) throw new Error('The list was saved but could not be read back.');
    return created;
  }

  return {
    async listMine() {
      const uid = await ctx.session.ready();
      const rows = unwrap(
        await client.from('lists').select(LIST_SELECT).eq('owner_id', uid).order('created_at', { ascending: false }),
      ) as ListJoinRow[];
      return rows.map(toListView);
    },

    async get(id) {
      const uid = await ctx.session.ready();
      const row = unwrap(await client.from('lists').select(LIST_SELECT).eq('id', id).eq('owner_id', uid).maybeSingle()) as ListJoinRow | null;
      return row ? toListView(row) : null;
    },

    async getShared(id) {
      // Works for anyone with the link: the policy only exposes lists with share_enabled = true.
      const row = unwrap(
        await client.from('lists').select(LIST_SELECT).eq('id', id).eq('share_enabled', true).maybeSingle(),
      ) as ListJoinRow | null;
      return row ? toListView(row) : null;
    },

    async create(input) {
      await ctx.session.ready();
      // Copy each linked entry's rating onto the list item, so viewers never need access to the entry itself.
      const entryIds = [...new Set(input.items.map((i) => i.entryId).filter((x): x is Id => !!x))];
      const ratings = new Map<string, Rating>();
      if (entryIds.length) {
        const rows = unwrap(await client.from('entries').select('id, rating').in('id', entryIds)) as Array<{ id: string; rating: number }>;
        for (const r of rows) ratings.set(r.id, r.rating as Rating);
      }
      return insertList({
        title: input.title,
        description: input.description ?? '',
        cityId: input.cityId ?? null,
        visibility: input.visibility ?? 'private',
        shareEnabled: input.shareEnabled ?? false,
        sourceListId: null,
        items: input.items.map((i) => ({
          placeId: i.placeId,
          entryId: i.entryId ?? null,
          note: i.note ?? '',
          rating: i.entryId ? (ratings.get(i.entryId) ?? null) : null,
        })),
      });
    },

    async saveCopyToMyJournal(id) {
      const source = await this.getShared(id);
      if (!source) throw new Error('That list is not available to save');
      return insertList({
        title: source.title,
        description: source.description,
        cityId: source.cityId,
        visibility: 'private',
        shareEnabled: false,
        sourceListId: source.id,
        // Entries belong to the original author, so the copy keeps only the place and note.
        items: source.items.map((i) => ({ placeId: i.placeId, entryId: null, note: i.note, rating: null })),
      });
    },

    async delete(id) {
      const uid = await ctx.session.ready();
      unwrap(await client.from('lists').delete().eq('id', id).eq('owner_id', uid));
    },
  };
}

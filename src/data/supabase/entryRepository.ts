import { guessMealType } from '../../lib/meal';
import { normalizeTag } from '../../lib/tags';
import type { Id } from '../../types';
import { matchesEntryFilter } from '../entryFilter';
import type { DishInput, EntryInput, EntryRepository, PhotoInput } from '../repositories';
import { SupabaseDataError, unwrap, type SupabaseContext } from './context';
import { isDataUrl, removePhotos, uploadPhoto } from './photoStorage';
import { toEntryView, type DishRow, type EntryJoinRow, type PhotoRow, type PlaceWithCityRow, type TagRow } from './rows';
import { loadProfile } from './userRepository';

const ENTRY_SELECT = '*, place:places(*, city:cities(*)), dishes(*), photos(*), entry_tags(tag:tags(*))';

/** Entries are written in several steps (Postgres rows plus Storage files); a failed step undoes the entry. */
export function createEntryRepository(ctx: SupabaseContext): EntryRepository {
  const { client } = ctx;
  const stamp = () => ctx.now().toISOString();

  async function fetchOne(id: Id, uid: string) {
    const row = unwrap(
      await client.from('entries').select(ENTRY_SELECT).eq('id', id).eq('user_id', uid).maybeSingle(),
    ) as EntryJoinRow | null;
    return row ? toEntryView(row) : null;
  }

  /** Names -> tag ids, creating any tags this user doesn't have yet. */
  async function tagIdsFor(uid: string, rawNames: string[]): Promise<Id[]> {
    const names = [...new Set(rawNames.map(normalizeTag).filter(Boolean))];
    if (names.length === 0) return [];
    const ts = stamp();

    const existing = unwrap(await client.from('tags').select('*').eq('user_id', uid).in('name', names)) as TagRow[];
    const have = new Set(existing.map((t) => t.name));
    const missing = names.filter((n) => !have.has(n));
    if (missing.length) {
      unwrap(
        await client
          .from('tags')
          .upsert(
            missing.map((name) => ({ id: ctx.newId(), user_id: uid, name, created_at: ts, updated_at: ts })),
            { onConflict: 'user_id,name', ignoreDuplicates: true },
          ),
      );
    }
    const all = unwrap(await client.from('tags').select('*').eq('user_id', uid).in('name', names)) as TagRow[];
    const byName = new Map(all.map((t) => [t.name, t.id]));
    return names.map((n) => byName.get(n)!).filter(Boolean);
  }

  async function replaceTags(entryId: Id, uid: string, names: string[]) {
    const tagIds = await tagIdsFor(uid, names);
    unwrap(await client.from('entry_tags').delete().eq('entry_id', entryId));
    if (tagIds.length) unwrap(await client.from('entry_tags').insert(tagIds.map((tag_id) => ({ entry_id: entryId, tag_id }))));
  }

  async function syncDishes(entryId: Id, inputs: DishInput[]) {
    const ts = stamp();
    const existing = unwrap(await client.from('dishes').select('*').eq('entry_id', entryId)) as DishRow[];
    const keep: string[] = [];
    const inserts: Array<Record<string, unknown>> = [];
    let position = 0;
    for (const input of inputs) {
      const name = input.name.trim();
      if (!name) continue;
      const prev = input.id ? existing.find((d) => d.id === input.id) : undefined;
      if (prev) {
        keep.push(prev.id);
        unwrap(await client.from('dishes').update({ name, note: input.note ?? prev.note, position, updated_at: ts }).eq('id', prev.id));
      } else {
        inserts.push({ id: ctx.newId(), entry_id: entryId, name, note: input.note ?? '', position, created_at: ts, updated_at: ts });
      }
      position += 1;
    }
    const drop = existing.filter((d) => !keep.includes(d.id)).map((d) => d.id);
    if (drop.length) unwrap(await client.from('dishes').delete().in('id', drop));
    if (inserts.length) unwrap(await client.from('dishes').insert(inserts));
  }

  async function syncPhotos(entryId: Id, uid: string, inputs: PhotoInput[]) {
    const ts = stamp();
    const existing = unwrap(await client.from('photos').select('*').eq('entry_id', entryId)) as PhotoRow[];
    const keep: string[] = [];
    const obsoletePaths: Array<string | null> = [];
    const inserts: Array<Record<string, unknown>> = [];
    let position = 0;

    for (const input of inputs) {
      const prev = input.id ? existing.find((p) => p.id === input.id) : undefined;
      if (prev) {
        keep.push(prev.id);
        const patch: Record<string, unknown> = { caption: input.caption ?? prev.caption, position, updated_at: ts };
        if (input.url !== prev.url) {
          // A replaced image: upload the new file, then retire the old one.
          if (isDataUrl(input.url)) {
            const up = await uploadPhoto(client, uid, prev.id, input.url);
            Object.assign(patch, { url: up.url, storage_path: up.path });
          } else {
            Object.assign(patch, { url: input.url, storage_path: null });
          }
          obsoletePaths.push(prev.storage_path);
        }
        unwrap(await client.from('photos').update(patch).eq('id', prev.id));
      } else {
        const id = ctx.newId();
        const up = isDataUrl(input.url) ? await uploadPhoto(client, uid, id, input.url) : { url: input.url, path: null };
        inserts.push({
          id, entry_id: entryId, url: up.url, storage_path: up.path, caption: input.caption ?? '',
          position, created_at: ts, updated_at: ts,
        });
      }
      position += 1;
    }
    const drop = existing.filter((p) => !keep.includes(p.id));
    if (drop.length) {
      unwrap(await client.from('photos').delete().in('id', drop.map((p) => p.id)));
      obsoletePaths.push(...drop.map((p) => p.storage_path));
    }
    if (inserts.length) unwrap(await client.from('photos').insert(inserts));
    await removePhotos(client, obsoletePaths);
  }

  return {
    async list(filter = {}) {
      const uid = await ctx.session.ready();
      const rows = unwrap(
        await client.from('entries').select(ENTRY_SELECT).eq('user_id', uid).order('visited_at', { ascending: false }),
      ) as EntryJoinRow[];
      return rows
        .map(toEntryView)
        .filter((e) => matchesEntryFilter(e, filter))
        .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    },

    async get(id) {
      const uid = await ctx.session.ready();
      return fetchOne(id, uid);
    },

    async create(input) {
      const uid = await ctx.session.ready();
      const [place, profile] = await Promise.all([
        client.from('places').select('*, city:cities(*)').eq('id', input.placeId).maybeSingle(),
        loadProfile(ctx),
      ]);
      const placeRow = unwrap(place) as PlaceWithCityRow | null;
      if (!placeRow) throw new Error(`Unknown place ${input.placeId}`);

      const ts = stamp();
      const id = ctx.newId();
      const visitedAt = input.visitedAt ?? ts;
      unwrap(
        await client.from('entries').insert({
          id,
          user_id: uid,
          place_id: input.placeId,
          visited_at: visitedAt,
          rating: input.rating,
          would_return: input.wouldReturn ?? null,
          note: input.note ?? '',
          price: input.price ?? null,
          currency: input.currency ?? placeRow.city.currency_code,
          meal_type: input.mealType ?? guessMealType(new Date(visitedAt)),
          status: input.status ?? 'quick',
          visibility: input.visibility ?? profile.default_visibility,
          created_at: ts,
          updated_at: ts,
        }),
      );

      try {
        if (input.tags?.length) await replaceTags(id, uid, input.tags);
        if (input.dishes?.length) await syncDishes(id, input.dishes);
        if (input.photos?.length) await syncPhotos(id, uid, input.photos);
      } catch (err) {
        await client.from('entries').delete().eq('id', id); // undo: children cascade
        throw err;
      }
      const created = await fetchOne(id, uid);
      if (!created) throw new Error('The entry was saved but could not be read back.');
      return created;
    },

    async update(id, patch: Partial<EntryInput>) {
      const uid = await ctx.session.ready();
      const { tags, dishes, photos } = patch;

      const columns: Record<string, unknown> = {};
      const set = (column: string, value: unknown) => value !== undefined && (columns[column] = value);
      set('place_id', patch.placeId);
      set('visited_at', patch.visitedAt);
      set('rating', patch.rating);
      set('would_return', patch.wouldReturn);
      set('note', patch.note);
      set('price', patch.price);
      set('currency', patch.currency);
      set('meal_type', patch.mealType);
      set('status', patch.status);
      set('visibility', patch.visibility);
      columns.updated_at = stamp();

      const updated = unwrap(
        await client.from('entries').update(columns).eq('id', id).eq('user_id', uid).select('id').maybeSingle(),
      ) as { id: string } | null;
      if (!updated) throw new SupabaseDataError(`Entry ${id} not found`);

      if (tags) await replaceTags(id, uid, tags);
      if (dishes) await syncDishes(id, dishes);
      if (photos) await syncPhotos(id, uid, photos);

      const entry = await fetchOne(id, uid);
      if (!entry) throw new Error('The entry was saved but could not be read back.');
      return entry;
    },

    async delete(id) {
      const uid = await ctx.session.ready();
      const photos = unwrap(await client.from('photos').select('storage_path').eq('entry_id', id)) as Array<{ storage_path: string | null }>;
      // Rows cascade (dishes, photos, tag links); list items just forget the entry (on delete set null).
      unwrap(await client.from('entries').delete().eq('id', id).eq('user_id', uid));
      await removePhotos(client, photos.map((p) => p.storage_path));
    },
  };
}

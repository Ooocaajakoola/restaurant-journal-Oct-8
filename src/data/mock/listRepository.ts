import type { List, ListItem, ListItemView, ListView } from '../../types';
import type { ListInput, ListRepository } from '../repositories';
import { clone } from './clone';
import type { MockContext } from './db';

export function createListRepository({ db, now, newId }: MockContext): ListRepository {
  const stamp = () => now().toISOString();
  /** One timestamp per write so createdAt === updatedAt on new records. */
  let ts = stamp();

  function hydrate(l: List): ListView {
    const d = db.data;
    const owner = d.users.find((u) => u.id === l.ownerId);
    const items: ListItemView[] = d.listItems
      .filter((i) => i.listId === l.id)
      .sort((a, b) => a.position - b.position)
      .map((i) => {
        const place = d.places.find((p) => p.id === i.placeId);
        const city = place && d.cities.find((c) => c.id === place.cityId);
        if (!place || !city) throw new Error(`List item ${i.id} points at a missing place`);
        const rating = (i.entryId && d.entries.find((e) => e.id === i.entryId)?.rating) || null;
        return { ...i, place, city, rating };
      });
    return clone({ ...l, owner: { id: l.ownerId, displayName: owner?.displayName ?? 'Someone' }, items });
  }

  function insertList(ownerId: string, input: ListInput, sourceListId: string | null): List {
    ts = stamp();
    const id = newId();
    const list: List = {
      id, createdAt: ts, updatedAt: ts, ownerId,
      title: input.title.trim() || 'Untitled list',
      description: input.description ?? '',
      cityId: input.cityId ?? null,
      visibility: input.visibility ?? 'private',
      shareEnabled: input.shareEnabled ?? false,
      sourceListId,
    };
    const seen = new Set<string>();
    const items: ListItem[] = [];
    for (const it of input.items) {
      if (seen.has(it.placeId)) continue;
      seen.add(it.placeId);
      items.push({
        id: newId(), createdAt: ts, updatedAt: ts, listId: id, placeId: it.placeId,
        entryId: it.entryId ?? null, position: items.length, note: it.note ?? '',
      });
    }
    db.data.lists.push(list);
    db.data.listItems.push(...items);
    return list;
  }

  return {
    async listMine() {
      return db.data.lists
        .filter((l) => l.ownerId === db.data.currentUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(hydrate);
    },

    async get(id) {
      const l = db.data.lists.find((x) => x.id === id && x.ownerId === db.data.currentUserId);
      return l ? hydrate(l) : null;
    },

    async getShared(id) {
      const l = db.data.lists.find((x) => x.id === id && x.shareEnabled);
      return l ? hydrate(l) : null;
    },

    async create(input) {
      const list = insertList(db.data.currentUserId, input, null);
      db.commit();
      return hydrate(list);
    },

    async saveCopyToMyJournal(id) {
      const source = db.data.lists.find((x) => x.id === id && x.shareEnabled);
      if (!source) throw new Error('That list is not available to save');
      const items = db.data.listItems
        .filter((i) => i.listId === id)
        .sort((a, b) => a.position - b.position)
        // Entries belong to the original author, so the copy only keeps the place and note.
        .map((i) => ({ placeId: i.placeId, note: i.note }));
      const copy = insertList(
        db.data.currentUserId,
        { title: source.title, description: source.description, cityId: source.cityId, visibility: 'private', shareEnabled: false, items },
        source.id,
      );
      db.commit();
      return hydrate(copy);
    },

    async delete(id) {
      const l = db.data.lists.find((x) => x.id === id && x.ownerId === db.data.currentUserId);
      if (!l) return;
      db.data.lists = db.data.lists.filter((x) => x.id !== id);
      db.data.listItems = db.data.listItems.filter((x) => x.listId !== id);
      db.commit();
    },
  };
}

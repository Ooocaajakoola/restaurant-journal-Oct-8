import { normalizeTag } from '../../lib/tags';
import { matchesEntryFilter } from '../entryFilter';
import { guessMealType } from '../../lib/meal';
import type { Dish, Entry, EntryView, Id, Photo, Tag } from '../../types';
import type { DishInput, EntryRepository, PhotoInput } from '../repositories';
import { clone } from './clone';
import type { MockContext } from './db';

export function createEntryRepository({ db, now, newId }: MockContext): EntryRepository {
  const stamp = () => now().toISOString();
  /** One timestamp per write so createdAt === updatedAt on new records. */
  let ts = stamp();
  const begin = () => (ts = stamp());

  function hydrate(e: Entry): EntryView {
    const d = db.data;
    const place = d.places.find((p) => p.id === e.placeId);
    const city = place && d.cities.find((c) => c.id === place.cityId);
    if (!place || !city) throw new Error(`Entry ${e.id} points at a missing place or city`);
    return clone({
      ...e,
      place,
      city,
      dishes: d.dishes.filter((x) => x.entryId === e.id),
      photos: d.photos.filter((x) => x.entryId === e.id),
      tags: e.tagIds.map((id) => d.tags.find((t) => t.id === id)).filter((t): t is Tag => !!t),
    });
  }

  function mine(): Entry[] {
    return db.data.entries.filter((e) => e.userId === db.data.currentUserId);
  }

  function tagIdsFor(names: string[]): Id[] {
    const ids: Id[] = [];
    for (const raw of names) {
      const name = normalizeTag(raw);
      if (!name) continue;
      let tag = db.data.tags.find((t) => t.name === name);
      if (!tag) {
        tag = { id: newId(), createdAt: ts, updatedAt: ts, name };
        db.data.tags.push(tag);
      }
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
    return ids;
  }

  /** Replace a child set while keeping the identity of rows whose id was passed in. */
  function syncDishes(entryId: Id, inputs: DishInput[]) {
    const existing = db.data.dishes.filter((x) => x.entryId === entryId);
    const next: Dish[] = [];
    for (const input of inputs) {
      const name = input.name.trim();
      if (!name) continue;
      const prev = input.id ? existing.find((x) => x.id === input.id) : undefined;
      next.push(
        prev
          ? { ...prev, name, note: input.note ?? prev.note, updatedAt: ts }
          : { id: newId(), createdAt: ts, updatedAt: ts, entryId, name, note: input.note ?? '' },
      );
    }
    db.data.dishes = [...db.data.dishes.filter((x) => x.entryId !== entryId), ...next];
  }

  function syncPhotos(entryId: Id, inputs: PhotoInput[]) {
    const existing = db.data.photos.filter((x) => x.entryId === entryId);
    const next: Photo[] = inputs.map((input) => {
      const prev = input.id ? existing.find((x) => x.id === input.id) : undefined;
      return prev
        ? { ...prev, url: input.url, caption: input.caption ?? prev.caption, updatedAt: ts }
        : { id: newId(), createdAt: ts, updatedAt: ts, entryId, url: input.url, caption: input.caption ?? '' };
    });
    db.data.photos = [...db.data.photos.filter((x) => x.entryId !== entryId), ...next];
  }

  return {
    async list(filter = {}) {
      return mine()
        .map(hydrate)
        .filter((e) => matchesEntryFilter(e, filter))
        .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
    },

    async get(id) {
      const e = mine().find((x) => x.id === id);
      return e ? hydrate(e) : null;
    },

    async create(input) {
      begin();
      const d = db.data;
      const place = d.places.find((p) => p.id === input.placeId);
      const city = place && d.cities.find((c) => c.id === place.cityId);
      if (!place || !city) throw new Error(`Unknown place ${input.placeId}`);
      const user = d.users.find((u) => u.id === d.currentUserId)!;
      const visitedAt = input.visitedAt ?? ts;
      const id = newId();
      const entry: Entry = {
        id,
        createdAt: ts,
        updatedAt: ts,
        userId: user.id,
        placeId: place.id,
        visitedAt,
        rating: input.rating,
        wouldReturn: input.wouldReturn ?? null,
        note: input.note ?? '',
        price: input.price ?? null,
        currency: input.currency ?? city.currencyCode,
        mealType: input.mealType ?? guessMealType(new Date(visitedAt)),
        status: input.status ?? 'quick',
        visibility: input.visibility ?? user.defaultVisibility,
        tagIds: tagIdsFor(input.tags ?? []),
      };
      d.entries.push(entry);
      syncDishes(id, input.dishes ?? []);
      syncPhotos(id, input.photos ?? []);
      db.commit();
      return hydrate(entry);
    },

    async update(id, patch) {
      begin();
      const entry = mine().find((x) => x.id === id);
      if (!entry) throw new Error(`Entry ${id} not found`);
      const { tags, dishes, photos, ...scalars } = patch;
      for (const [key, value] of Object.entries(scalars)) {
        if (value !== undefined) (entry as unknown as Record<string, unknown>)[key] = value;
      }
      if (tags) entry.tagIds = tagIdsFor(tags);
      if (dishes) syncDishes(id, dishes);
      if (photos) syncPhotos(id, photos);
      entry.updatedAt = ts;
      db.commit();
      return hydrate(entry);
    },

    async delete(id) {
      begin();
      const d = db.data;
      if (!mine().some((x) => x.id === id)) return;
      d.entries = d.entries.filter((x) => x.id !== id);
      d.dishes = d.dishes.filter((x) => x.entryId !== id);
      d.photos = d.photos.filter((x) => x.entryId !== id);
      // Keep list items, but forget the link to the removed entry.
      for (const li of d.listItems) if (li.entryId === id) { li.entryId = null; li.updatedAt = ts; }
      db.commit();
    },
  };
}

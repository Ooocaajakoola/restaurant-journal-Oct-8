import type { City, Dish, Entry, List, ListItem, Photo, Place, Tag, User } from '../../types';
import { StorageFullError, type KeyValueStore } from './storage';

export const DB_KEY = 'food-tower:db';
export const DB_VERSION = 1;

export interface MockData {
  version: number;
  currentUserId: string;
  users: User[];
  cities: City[];
  places: Place[];
  entries: Entry[];
  dishes: Dish[];
  photos: Photo[];
  tags: Tag[];
  lists: List[];
  listItems: ListItem[];
}

/** In-memory copy of the whole database, persisted as one JSON blob. */
export class MockDb {
  data: MockData;

  constructor(
    private readonly storage: KeyValueStore,
    private readonly seed: () => MockData,
  ) {
    this.data = this.load();
  }

  private load(): MockData {
    try {
      const raw = this.storage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockData;
        if (parsed.version === DB_VERSION) return parsed;
      }
    } catch {
      // corrupt data: fall through and reseed
    }
    const fresh = this.seed();
    this.data = fresh;
    this.commit();
    return fresh;
  }

  /** Persist after every write. */
  commit(): void {
    try {
      this.storage.setItem(DB_KEY, JSON.stringify(this.data));
    } catch (err) {
      if (err instanceof DOMException) throw new StorageFullError();
      throw err;
    }
  }

  /** Wipe and reseed (used by "reset sample data" and tests). */
  reset(): void {
    this.data = this.seed();
    this.commit();
  }
}

export interface MockContext {
  db: MockDb;
  now: () => Date;
  newId: () => string;
}

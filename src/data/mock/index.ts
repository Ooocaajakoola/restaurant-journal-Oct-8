import { newId } from '../../lib/id';
import type { Repositories } from '../repositories';
import { createCityRepository } from './cityRepository';
import { MockDb, type MockContext } from './db';
import { createEntryRepository } from './entryRepository';
import { createListRepository } from './listRepository';
import { createLocationRepository } from './locationRepository';
import { createPlaceRepository } from './placeRepository';
import { createSeedData } from './seed';
import { createBrowserStorage, type KeyValueStore } from './storage';
import { createTagRepository } from './tagRepository';
import { createUserRepository } from './userRepository';

export interface MockOptions {
  /** Defaults to localStorage (or memory if it is blocked). */
  storage?: KeyValueStore;
  /** Defaults to the real clock; tests pass a fixed one. */
  now?: () => Date;
  newId?: () => string;
}

export interface MockRepositories extends Repositories {
  /** Wipe and reseed the sample data. Mock-only, not part of the Repositories contract. */
  resetSampleData(): void;
}

export function createMockRepositories(options: MockOptions = {}): MockRepositories {
  const now = options.now ?? (() => new Date());
  const storage = options.storage ?? createBrowserStorage();
  const db = new MockDb(storage, () => createSeedData(now()));
  const ctx: MockContext = { db, now, newId: options.newId ?? newId };

  return {
    ready: async () => {},
    users: createUserRepository(ctx),
    cities: createCityRepository(ctx),
    places: createPlaceRepository(ctx),
    entries: createEntryRepository(ctx),
    tags: createTagRepository(ctx),
    lists: createListRepository(ctx),
    location: createLocationRepository(),
    resetSampleData: () => db.reset(),
  };
}

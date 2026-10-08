import { createMockRepositories, type MockRepositories } from '../data/mock';
import { createMemoryStorage, type KeyValueStore } from '../data/mock/storage';

/** Fixed "now" so seeded dates are stable across test runs. */
export const TEST_NOW = new Date('2026-10-08T12:00:00.000Z');

let counter = 0;

/** Fresh, isolated, seeded repositories backed by in-memory storage and a ticking clock. */
export function createTestRepositories(storage: KeyValueStore = createMemoryStorage()): MockRepositories & { storage: KeyValueStore } {
  let tick = 0;
  const repos = createMockRepositories({
    storage,
    now: () => new Date(TEST_NOW.getTime() + tick++ * 1000),
    newId: () => `test-id-${++counter}`,
  });
  return Object.assign(repos, { storage });
}

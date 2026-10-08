/**
 * The ONLY place in the app that touches localStorage.
 * Wrapped in a tiny interface so tests (and private-mode browsers) can use memory.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export function createBrowserStorage(): KeyValueStore {
  try {
    const ls = window.localStorage;
    ls.getItem('__probe__');
    return ls;
  } catch {
    // Blocked storage (e.g. some private modes): keep working, just don't persist.
    return createMemoryStorage();
  }
}

export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full. Remove some photos or entries and try again.');
    this.name = 'StorageFullError';
  }
}

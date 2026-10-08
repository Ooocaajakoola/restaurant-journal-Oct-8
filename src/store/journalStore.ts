import { create } from 'zustand';

interface JournalState {
  /** Bumped after every write. Data hooks include it in their cache key, so they refetch. */
  version: number;
  invalidate(): void;
}

/**
 * The single invalidation path for journal data. Reads and writes themselves go through
 * the repositories; this just tells mounted screens "something changed, refetch".
 */
export const useJournalStore = create<JournalState>((set) => ({
  version: 0,
  invalidate: () => set((s) => ({ version: s.version + 1 })),
}));

import { useEffect, useRef, useState } from 'react';
import { useJournalStore } from '../store/journalStore';

interface Result<T> {
  data: T | undefined;
  /** True until the first result for the current deps arrives (stale data stays visible meanwhile). */
  loading: boolean;
  error: Error | undefined;
}

interface State<T> {
  key: string;
  data?: T;
  error?: Error;
}

/**
 * Run an async fetch (normally a repository call) and refetch when `deps` change
 * or when any journal write happens. `deps` must be JSON-serialisable.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []): Result<T> {
  const version = useJournalStore((s) => s.version);
  const key = `${version}:${JSON.stringify(deps)}`;
  const [state, setState] = useState<State<T>>({ key: '' });

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setState({ key, data });
      },
      (err: unknown) => {
        if (!cancelled) setState((s) => ({ ...s, key, error: err instanceof Error ? err : new Error(String(err)) }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { data: state.data, loading: state.key !== key, error: state.error };
}

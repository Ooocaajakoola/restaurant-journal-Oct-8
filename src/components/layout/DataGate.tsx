import { useEffect, useState, type ReactNode } from 'react';
import { useRepositories } from '../../hooks/useRepositories';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

type GateState = { attempt: number; status: 'ready' } | { attempt: number; status: 'error'; message: string };

/**
 * Holds the app back until the data layer is ready (for Supabase: an anonymous session exists),
 * and explains what went wrong if it can't connect.
 */
export function DataGate({ children }: { children: ReactNode }) {
  const repos = useRepositories();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<GateState | null>(null);

  useEffect(() => {
    let cancelled = false;
    repos.ready().then(
      () => !cancelled && setState({ attempt, status: 'ready' }),
      (err: unknown) =>
        !cancelled && setState({ attempt, status: 'error', message: err instanceof Error ? err.message : 'Could not connect.' }),
    );
    return () => {
      cancelled = true;
    };
  }, [repos, attempt]);

  const current = state && state.attempt === attempt ? state : null;

  if (current?.status === 'ready') return <>{children}</>;

  if (current?.status === 'error') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 bg-canvas p-6 text-fg">
        <span className="text-danger">
          <Icon name="alert" size={32} />
        </span>
        <h1 className="text-2xl font-bold">Can't connect to your journal</h1>
        <p role="alert" className="text-muted">
          {current.message}
        </p>
        <Button variant="primary" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas text-muted">
      <p role="status">Connecting to your journal…</p>
    </main>
  );
}

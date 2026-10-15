import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useRepositories } from '../../hooks/useRepositories';
import type { AuthUser } from '../../data/repositories';
import { AuthScreen } from '../auth/AuthScreen';

/**
 * Shows the app only while someone is signed in, otherwise the sign-in / sign-up screen.
 * Reacts to sign-in and sign-out (including from another tab). In demo mode there is always a user.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { auth } = useRepositories();
  // undefined = still checking, null = signed out
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    auth.getUser().then(
      (u) => !cancelled && setUser(u),
      () => !cancelled && setUser(null),
    );
    const unsubscribe = auth.onChange((u) => !cancelled && setUser(u));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth]);

  if (user === undefined) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas text-muted">
        <p role="status">Connecting to your journal…</p>
      </main>
    );
  }

  if (user === null) return <AuthScreen auth={auth} onSignedIn={setUser} />;

  // Keyed by user id, so signing in as someone else starts from a clean slate.
  return <Fragment key={user.id}>{children}</Fragment>;
}

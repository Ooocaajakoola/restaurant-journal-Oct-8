import { vi } from 'vitest';
import type { AuthRepository, AuthUser, SignUpResult } from '../data/repositories';

export const SAM: AuthUser = { id: 'user-1', email: 'sam@example.com', displayName: 'Sam' };

/** A controllable stand-in for the auth repository, for testing the login screen and gate. */
export function createFakeAuth(initial: AuthUser | null = null) {
  let user = initial;
  const listeners = new Set<(u: AuthUser | null) => void>();
  const emit = () => listeners.forEach((l) => l(user));

  const fake = {
    accounts: true as const,
    getUser: vi.fn(async () => user),
    signUp: vi.fn(async ({ email, displayName }: { email: string; password: string; displayName: string }): Promise<SignUpResult> => {
      user = { id: 'new-user', email, displayName };
      emit();
      return { status: 'signed-in', user };
    }),
    signIn: vi.fn(async (email: string) => {
      user = { ...SAM, email };
      emit();
      return user;
    }),
    signOut: vi.fn(async () => {
      user = null;
      emit();
    }),
    resendConfirmation: vi.fn(async () => undefined),
    onChange: vi.fn((l: (u: AuthUser | null) => void) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    }),
  } satisfies AuthRepository;
  return fake;
}

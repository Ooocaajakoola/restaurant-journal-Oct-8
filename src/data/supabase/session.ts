import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AuthUser } from '../repositories';

export class NotSignedInError extends Error {
  constructor() {
    super('Please sign in to continue.');
    this.name = 'NotSignedInError';
  }
}

export interface SessionManager {
  /** The signed-in user's id. Throws NotSignedInError when there is no session. */
  ready(): Promise<string>;
  current(): Promise<AuthUser | null>;
}

/** Anonymous sessions (from an earlier version of the app) are not accounts: treat them as signed out. */
export const isAccount = (user: User) => !user.is_anonymous;

export function toAuthUser(user: User): AuthUser {
  const name = user.user_metadata?.display_name;
  return { id: user.id, email: user.email ?? null, displayName: typeof name === 'string' ? name : null };
}

/**
 * Reads the signed-in user from the Supabase client, which keeps the session in this browser and
 * refreshes it. Signing in and out is handled by the auth repository and the login screen.
 */
export function createSessionManager(client: SupabaseClient): SessionManager {
  async function current(): Promise<AuthUser | null> {
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session && isAccount(data.session.user) ? toAuthUser(data.session.user) : null;
  }

  return {
    current,
    async ready() {
      const user = await current();
      if (!user) throw new NotSignedInError();
      return user.id;
    },
  };
}

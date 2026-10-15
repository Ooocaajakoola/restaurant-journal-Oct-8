import type { SupabaseClient } from '@supabase/supabase-js';

export interface SessionManager {
  /** Resolves to the current user's id, signing in anonymously the first time. */
  ready(): Promise<string>;
}

const ANON_DISABLED =
  'Anonymous sign-ins are switched off for this Supabase project. In the Supabase dashboard open ' +
  'Authentication → Sign In / Providers and turn on "Allow anonymous sign-ins", then reload.';

/**
 * Each browser gets its own private identity without a login screen (Supabase anonymous sign-in).
 * The session is stored by the Supabase client, so the same browser keeps the same identity.
 */
export function createSessionManager(client: SupabaseClient): SessionManager {
  let pending: Promise<string> | null = null;

  async function start(): Promise<string> {
    const existing = await client.auth.getSession();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data.session) return existing.data.session.user.id;

    const { data, error } = await client.auth.signInAnonymously();
    if (error || !data.user) {
      const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
      if (text.includes('anonymous')) throw new Error(ANON_DISABLED);
      throw new Error(error?.message ?? 'Could not start a session.');
    }
    return data.user.id;
  }

  return {
    ready() {
      pending ??= start().catch((err: unknown) => {
        pending = null; // let the user retry
        throw err;
      });
      return pending;
    },
  };
}

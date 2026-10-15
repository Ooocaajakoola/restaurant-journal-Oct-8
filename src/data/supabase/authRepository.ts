import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import type { AuthRepository } from '../repositories';
import { isAccount, toAuthUser, type SessionManager } from './session';

/** Turn a Supabase auth error into something a person can act on. */
export function explainAuthError(error: Pick<AuthError, 'message'> & { code?: string }): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'email_not_confirmed':
      return 'Please confirm your email first: open the link we sent you, then sign in.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email already exists. Try signing in instead.';
    case 'weak_password':
      return 'That password is too weak. Use at least 8 characters.';
    case 'over_email_send_rate_limit':
      return 'Too many emails were sent recently. Wait a little and try again.';
    case 'over_request_rate_limit':
      return 'Too many attempts. Wait a minute and try again.';
    case 'signup_disabled':
      return 'New sign-ups are turned off for this project.';
    case 'validation_failed':
    case 'email_address_invalid':
      return 'That email address doesn\'t look right.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

export function createAuthRepository(client: SupabaseClient, session: SessionManager): AuthRepository {
  const redirectTo = () => (typeof window === 'undefined' ? undefined : window.location.origin);

  return {
    accounts: true,

    getUser: () => session.current(),

    async signUp({ email, password, displayName }) {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() }, emailRedirectTo: redirectTo() },
      });
      if (error) throw new Error(explainAuthError(error));
      // Supabase hides whether an address is registered: an existing account comes back with no identities.
      if (data.user && data.user.identities?.length === 0) {
        throw new Error(explainAuthError({ code: 'user_already_exists', message: '' }));
      }
      if (data.session && data.user) return { status: 'signed-in', user: toAuthUser(data.user) };
      return { status: 'confirm-email', email: email.trim() };
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) throw new Error(explainAuthError(error ?? { message: '' }));
      return toAuthUser(data.user);
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw new Error(explainAuthError(error));
    },

    async resendConfirmation(email) {
      const { error } = await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo() } });
      if (error) throw new Error(explainAuthError(error));
    },

    onChange(listener) {
      // Keep this callback synchronous: Supabase can deadlock if it awaits other auth calls.
      const { data } = client.auth.onAuthStateChange((_event, s) => listener(s && isAccount(s.user) ? toAuthUser(s.user) : null));
      return () => data.subscription.unsubscribe();
    },
  };
}

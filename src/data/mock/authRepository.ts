import type { AuthRepository } from '../repositories';
import type { MockContext } from './db';

/** Demo mode has one built-in user and no accounts, so there is nothing to sign in to. */
export function createAuthRepository({ db }: MockContext): AuthRepository {
  const unavailable = () => Promise.reject(new Error('Accounts are not available in demo mode.'));
  return {
    accounts: false,
    async getUser() {
      const u = db.data.users.find((x) => x.id === db.data.currentUserId);
      return u ? { id: u.id, email: null, displayName: u.displayName } : null;
    },
    signUp: unavailable,
    signIn: unavailable,
    signOut: unavailable,
    resendConfirmation: unavailable,
    onChange: () => () => undefined,
  };
}

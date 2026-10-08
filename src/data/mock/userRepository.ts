import type { UserRepository } from '../repositories';
import { clone } from './clone';
import type { MockContext } from './db';

export function createUserRepository({ db, now }: MockContext): UserRepository {
  const current = () => {
    const u = db.data.users.find((x) => x.id === db.data.currentUserId);
    if (!u) throw new Error('Current user missing');
    return u;
  };

  return {
    async getCurrent() {
      return clone(current());
    },

    async updateCurrent(patch) {
      const u = current();
      if (patch.displayName !== undefined) u.displayName = patch.displayName.trim() || u.displayName;
      if (patch.homeAirport !== undefined) u.homeAirport = patch.homeAirport?.trim().toUpperCase() || null;
      if (patch.defaultVisibility !== undefined) u.defaultVisibility = patch.defaultVisibility;
      u.updatedAt = now().toISOString();
      db.commit();
      return clone(u);
    },
  };
}

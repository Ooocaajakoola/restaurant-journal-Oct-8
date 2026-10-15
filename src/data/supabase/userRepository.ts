import type { UserRepository } from '../repositories';
import { isUniqueViolation, SupabaseDataError, unwrap, type SupabaseContext } from './context';
import { toUser, type ProfileRow } from './rows';

/** Fetch (or lazily create) the signed-in user's profile row. */
export async function loadProfile(ctx: SupabaseContext): Promise<ProfileRow> {
  const uid = await ctx.session.ready();
  const select = () => ctx.client.from('profiles').select('*').eq('id', uid).maybeSingle();

  const existing = unwrap(await select()) as ProfileRow | null;
  if (existing) return existing;

  const ts = ctx.now().toISOString();
  try {
    return unwrap(await ctx.client.from('profiles').insert({ id: uid, created_at: ts, updated_at: ts }).select('*').single()) as ProfileRow;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    return unwrap(await select()) as ProfileRow; // another tab created it first
  }
}

export function createUserRepository(ctx: SupabaseContext): UserRepository {
  return {
    async getCurrent() {
      return toUser(await loadProfile(ctx));
    },

    async updateCurrent(patch) {
      const current = await loadProfile(ctx);
      const update: Record<string, unknown> = { updated_at: ctx.now().toISOString() };
      if (patch.displayName !== undefined && patch.displayName.trim()) update.display_name = patch.displayName.trim();
      if (patch.homeAirport !== undefined) update.home_airport = patch.homeAirport?.trim().toUpperCase() || null;
      if (patch.defaultVisibility !== undefined) update.default_visibility = patch.defaultVisibility;

      const row = unwrap(await ctx.client.from('profiles').update(update).eq('id', current.id).select('*').single()) as ProfileRow;

      // Shared lists show a snapshot of the owner's name; keep it current.
      if (update.display_name && update.display_name !== current.display_name) {
        const res = await ctx.client.from('lists').update({ owner_name: row.display_name }).eq('owner_id', current.id);
        if (res.error) throw new SupabaseDataError(res.error.message, res.error.code);
      }
      return toUser(row);
    },
  };
}

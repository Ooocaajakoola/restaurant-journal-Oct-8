import type { SupabaseClient } from '@supabase/supabase-js';
import { newId } from '../../lib/id';
import type { Repositories } from '../repositories';
import { createAuthRepository } from './authRepository';
import { createCityRepository } from './cityRepository';
import type { SupabaseContext } from './context';
import { createEntryRepository } from './entryRepository';
import { createListRepository } from './listRepository';
import { createLocationRepository } from './locationRepository';
import { createPlaceRepository } from './placeRepository';
import { createSessionManager } from './session';
import { createTagRepository } from './tagRepository';
import { createUserRepository } from './userRepository';

export { createSupabaseClient } from './client';

export interface SupabaseOptions {
  now?: () => Date;
  newId?: () => string;
}

/** Supabase-backed implementation of every repository interface in ../repositories.ts. */
export function createSupabaseRepositories(client: SupabaseClient, options: SupabaseOptions = {}): Repositories {
  const ctx: SupabaseContext = {
    client,
    session: createSessionManager(client),
    now: options.now ?? (() => new Date()),
    newId: options.newId ?? newId,
  };

  return {
    auth: createAuthRepository(client, ctx.session),
    users: createUserRepository(ctx),
    cities: createCityRepository(ctx),
    places: createPlaceRepository(ctx),
    entries: createEntryRepository(ctx),
    tags: createTagRepository(ctx),
    lists: createListRepository(ctx),
    location: createLocationRepository(ctx),
  };
}

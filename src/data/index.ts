/**
 * ★ THE ONE FILE that decides which data layer the app uses. ★
 *
 * To move to Supabase: implement the interfaces from ./repositories in
 * ./supabase/ and change the `repositories` export below. Nothing else changes.
 */
import type { Repositories } from './repositories';
import { createMockRepositories } from './mock';

export const repositories: Repositories = createMockRepositories();

export type { Repositories } from './repositories';
export * from './repositories';

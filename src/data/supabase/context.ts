import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionManager } from './session';

export interface SupabaseContext {
  client: SupabaseClient;
  session: SessionManager;
  now: () => Date;
  newId: () => string;
}

interface Result<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export class SupabaseDataError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'SupabaseDataError';
    this.code = code;
  }
}

/** Return the data from a Supabase response, or throw a readable error. */
export function unwrap<T>(res: Result<T>): T {
  if (res.error) throw new SupabaseDataError(res.error.message, res.error.code);
  return res.data as T;
}

/** Postgres unique-violation: two writers raced to create the same row. */
export const isUniqueViolation = (err: unknown) => err instanceof SupabaseDataError && err.code === '23505';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** The only place the Supabase client is constructed. */
export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

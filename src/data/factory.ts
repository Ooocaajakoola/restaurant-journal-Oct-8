import type { Repositories } from './repositories';
import { createMockRepositories } from './mock';
import { createSupabaseClient, createSupabaseRepositories } from './supabase';

export interface DataEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  /** Set to "mock" to ignore Supabase and use the localStorage demo data. */
  VITE_DATA_SOURCE?: string;
}

export type DataSource = 'supabase' | 'mock';

const isPlaceholder = (v: string) => /your-project|your-anon-key/i.test(v);

export function chooseDataSource(env: DataEnv): DataSource {
  if (env.VITE_DATA_SOURCE === 'mock') return 'mock';
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && key && !isPlaceholder(url) && !isPlaceholder(key) ? 'supabase' : 'mock';
}

export function createRepositoriesFromEnv(env: DataEnv): { source: DataSource; repositories: Repositories } {
  if (chooseDataSource(env) === 'supabase') {
    const client = createSupabaseClient(env.VITE_SUPABASE_URL!.trim(), env.VITE_SUPABASE_ANON_KEY!.trim());
    return { source: 'supabase', repositories: createSupabaseRepositories(client) };
  }
  return { source: 'mock', repositories: createMockRepositories() };
}

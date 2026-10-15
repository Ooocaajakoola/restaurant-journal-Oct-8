/**
 * ★ THE ONE FILE that decides which data layer the app uses. ★
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set (see .env.example) the app talks to Supabase.
 * Without them, or with VITE_DATA_SOURCE=mock, it uses the localStorage demo data.
 * Nothing outside src/data knows or cares which one it got.
 */
import { createRepositoriesFromEnv } from './factory';

const { source, repositories } = createRepositoriesFromEnv(import.meta.env);

export { source as dataSource, repositories };
export type { Repositories } from './repositories';
export * from './repositories';

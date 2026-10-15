import { chooseDataSource, createRepositoriesFromEnv } from './factory';

describe('chooseDataSource', () => {
  it('uses Supabase when a real URL and key are set', () => {
    expect(chooseDataSource({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' })).toBe('supabase');
  });

  it('falls back to the mock when values are missing or still the .env.example placeholders', () => {
    expect(chooseDataSource({})).toBe('mock');
    expect(chooseDataSource({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })).toBe('mock');
    expect(chooseDataSource({ VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co', VITE_SUPABASE_ANON_KEY: 'your-anon-key' })).toBe('mock');
    expect(chooseDataSource({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: '  ' })).toBe('mock');
  });

  it('lets VITE_DATA_SOURCE=mock override a configured Supabase', () => {
    expect(
      chooseDataSource({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'k', VITE_DATA_SOURCE: 'mock' }),
    ).toBe('mock');
  });

  it('builds a complete Repositories object either way', () => {
    for (const env of [{}, { VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }]) {
      const { repositories } = createRepositoriesFromEnv(env);
      for (const key of ['ready', 'users', 'cities', 'places', 'entries', 'tags', 'lists', 'location'] as const) {
        expect(repositories[key]).toBeDefined();
      }
    }
  });
});

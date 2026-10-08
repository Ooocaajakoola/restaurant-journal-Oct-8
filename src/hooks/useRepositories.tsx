import { createContext, useContext, type ReactNode } from 'react';
import type { Repositories } from '../data/repositories';

const RepositoryContext = createContext<Repositories | null>(null);

/** The only way components get data access. main.tsx passes in `repositories` from src/data. */
export function RepositoryProvider({ repositories, children }: { repositories: Repositories; children: ReactNode }) {
  return <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>;
}

export function useRepositories(): Repositories {
  const repos = useContext(RepositoryContext);
  if (!repos) throw new Error('useRepositories must be used inside <RepositoryProvider>');
  return repos;
}

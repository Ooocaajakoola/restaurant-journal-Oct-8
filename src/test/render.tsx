import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Repositories } from '../data/repositories';
import { RepositoryProvider } from '../hooks/useRepositories';
import { createTestRepositories } from './mockRepos';

interface Options {
  route?: string;
  repositories?: Repositories;
}

/** Render with a router and an isolated, seeded in-memory repository set. */
export function renderApp(ui: ReactElement, { route = '/', repositories = createTestRepositories() }: Options = {}) {
  return {
    repositories,
    ...render(
      <RepositoryProvider repositories={repositories}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </RepositoryProvider>,
    ),
  };
}

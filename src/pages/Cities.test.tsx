import { screen, within } from '@testing-library/react';
import App from '../App';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

describe('Cities', () => {
  it('lists visited cities with entry counts and last visit, most recent first', async () => {
    const repos = createTestRepositories();
    renderApp(<App />, { repositories: repos, route: '/cities' });
    const list = await screen.findByRole('list', { name: 'Cities visited' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(10);

    const expected = await repos.cities.listVisited();
    items.forEach((li, i) => {
      expect(li).toHaveTextContent(expected[i]!.name);
      expect(li).toHaveTextContent(expected[i]!.entryCount === 1 ? '1 entry' : `${expected[i]!.entryCount} entries`);
      expect(li).toHaveTextContent('last visit');
    });

    const london = within(list).getByRole('link', { name: /London/ });
    expect(london).toHaveAttribute('href', '/cities/city-london');
    expect(london).toHaveTextContent('LHR');
  });
});

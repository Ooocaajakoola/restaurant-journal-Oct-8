import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

async function open(route: string) {
  const repos = createTestRepositories();
  renderApp(<App />, { repositories: repos, route });
  return { repos, user: userEvent.setup() };
}

describe('Shared list', () => {
  it('shows a friend’s list read-only, with places, notes and directions', async () => {
    await open('/l/list-ana-lisbon');
    expect(await screen.findByRole('heading', { level: 1, name: "Ana's Lisbon essentials" })).toBeInTheDocument();
    expect(screen.getByText('Shared by Ana Costa')).toBeInTheDocument();
    expect(screen.getByText(/Read-only/)).toBeInTheDocument();

    const places = within(screen.getByRole('list', { name: 'Places in this list' })).getAllByRole('listitem');
    expect(places).toHaveLength(2);
    expect(places[0]).toHaveTextContent('Pastéis do Largo');
    expect(places[0]).toHaveTextContent('Eat them warm.');

    const directions = screen.getByRole('link', { name: /Directions to Pastéis do Largo/ });
    expect(directions).toHaveAttribute('target', '_blank');
    // No editing controls on a shared list.
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  it('saves a copy to my journal, then shows it as saved and links to the copy', async () => {
    const { repos, user } = await open('/l/list-ana-lisbon');
    const before = (await repos.lists.listMine()).length;
    await user.click(await screen.findByRole('button', { name: 'Save to my journal' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Saved to your journal');
    expect(screen.queryByRole('button', { name: 'Save to my journal' })).not.toBeInTheDocument();

    const mine = await repos.lists.listMine();
    expect(mine).toHaveLength(before + 1);
    const copy = mine.find((l) => l.sourceListId === 'list-ana-lisbon')!;
    expect(copy.items).toHaveLength(2);
    expect(within(status).getByRole('link', { name: 'View my copy' })).toHaveAttribute('href', `/l/${copy.id}`);
  });

  it('does not offer to save a list that is already in my journal', async () => {
    const repos = createTestRepositories();
    await repos.lists.saveCopyToMyJournal('list-ana-lisbon');
    renderApp(<App />, { repositories: repos, route: '/l/list-ana-lisbon' });
    expect(await screen.findByText('Already in your journal')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save to my journal' })).not.toBeInTheDocument();
  });

  it('lets me open my own copy (private) but offers no save button on my own list', async () => {
    const repos = createTestRepositories();
    const copy = await repos.lists.saveCopyToMyJournal('list-ana-lisbon');
    renderApp(<App />, { repositories: repos, route: `/l/${copy.id}` });
    expect(await screen.findByText('Your list')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save to my journal' })).not.toBeInTheDocument();
  });

  it('shows a friendly page for private or unknown lists', async () => {
    await open('/l/list-ana-private');
    expect(await screen.findByRole('heading', { name: 'List not available' })).toBeInTheDocument();
  });

  it('shows the error if saving fails and keeps the button', async () => {
    const repos = createTestRepositories();
    renderApp(<App />, { repositories: repos, route: '/l/list-ana-lisbon' });
    const user = userEvent.setup();
    const spy = vi.spyOn(repos.lists, 'saveCopyToMyJournal').mockRejectedValueOnce(new Error('Storage is full'));
    await user.click(await screen.findByRole('button', { name: 'Save to my journal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is full');
    expect(screen.getByRole('button', { name: 'Save to my journal' })).toBeEnabled();
    spy.mockRestore();
  });
});

describe('Your lists on the Cities page', () => {
  it('lists my lists and links to them', async () => {
    const { repos } = await open('/cities');
    await repos.lists.saveCopyToMyJournal('list-ana-lisbon');
    const section = await screen.findByRole('region', { name: 'Your lists' });
    await waitFor(() => expect(within(section).getByRole('link', { name: /London layover favourites/ })).toHaveAttribute('href', '/l/list-my-london'));
    expect(within(section).getByText(/shared by link/)).toBeInTheDocument();
  });
});

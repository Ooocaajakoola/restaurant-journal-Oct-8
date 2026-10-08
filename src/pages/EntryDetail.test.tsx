import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

async function open(finder: (e: Awaited<ReturnType<ReturnType<typeof createTestRepositories>['entries']['list']>>[number]) => boolean, suffix = '') {
  const repos = createTestRepositories();
  const entry = (await repos.entries.list()).find(finder)!;
  expect(entry).toBeTruthy();
  const utils = renderApp(<App />, { repositories: repos, route: `/entry/${entry.id}${suffix}` });
  return { repos, entry, user: userEvent.setup(), ...utils };
}

describe('Entry detail', () => {
  it('shows place, rating, dishes, notes, tags, price and date', async () => {
    const { entry } = await open((e) => e.place.name === 'The Copper Pot' && e.dishes.length === 3);
    expect(await screen.findByRole('heading', { level: 1, name: 'The Copper Pot' })).toBeInTheDocument();
    expect(screen.getByLabelText('Rated 5 out of 5')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'The Copper Pot' })).toBeInTheDocument();
    for (const d of entry.dishes) expect(screen.getByText(d.name)).toBeInTheDocument();
    expect(screen.getByText(/gravy is unreal/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#crew-favourite' })).toHaveAttribute('href', '/search?tag=crew-favourite');
    expect(screen.getByText(/£62\.00/)).toBeInTheDocument();
  });

  it('links to edit and to directions in a new tab', async () => {
    const { entry } = await open((e) => e.status === 'complete');
    const edit = await screen.findByRole('link', { name: 'Edit' });
    expect(edit).toHaveAttribute('href', `/entry/${entry.id}/edit`);
    const directions = screen.getByRole('link', { name: /Directions/ });
    expect(directions).toHaveAttribute('href', expect.stringContaining(`destination=${entry.place.lat},${entry.place.lng}`));
    expect(directions).toHaveAttribute('target', '_blank');
    expect(directions).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('flags a quick entry as "To finish" and offers "Add details"', async () => {
    await open((e) => e.status === 'quick' && e.dishes.length === 0 && !e.note && e.price === null);
    expect(await screen.findByText('To finish')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add details' })).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, then removes the entry', async () => {
    const { user, repos, entry } = await open((e) => e.status === 'complete');
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this entry?' });
    expect(await repos.entries.get(entry.id)).not.toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await repos.entries.get(entry.id)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Yes, delete' }));
    await waitFor(async () => expect(await repos.entries.get(entry.id)).toBeNull());
  });

  it('copies a shareable link and the link resolves to a read-only list', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const { user, repos, entry } = await open((e) => e.status === 'complete');
    await user.click(await screen.findByRole('button', { name: 'Share' }));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    // user-event installs a clipboard stub on setup(); read back what the app copied.
    const url = await navigator.clipboard.readText();
    expect(url).toMatch(/\/l\/.+/);
    const shared = await repos.lists.getShared(url.split('/l/')[1]!);
    expect(shared?.items[0]?.place.id).toBe(entry.placeId);
  });

  it('shows a friendly message for an entry that does not exist', async () => {
    renderApp(<App />, { route: '/entry/nope' });
    expect(await screen.findByRole('heading', { name: 'Entry not found' })).toBeInTheDocument();
  });
});

describe('Entry edit', () => {
  it('finishes a quick entry: adding details flips it to complete and returns to the detail page', async () => {
    const { user, repos, entry } = await open((e) => e.status === 'quick' && e.dishes.length === 0 && !e.note && e.price === null, '/edit');
    expect(await screen.findByRole('heading', { name: 'Finish this entry' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add a dish' }));
    await user.type(screen.getByLabelText('Dish 1'), 'Pad thai');
    await user.type(screen.getByLabelText('Notes'), 'Really good');
    await user.type(screen.getByLabelText('Price'), '12.5');
    await user.type(screen.getByLabelText('Tags'), 'Hidden Gem{Enter}');
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { level: 1, name: entry.place.name })).toBeInTheDocument();
    const saved = (await repos.entries.get(entry.id))!;
    expect(saved.status).toBe('complete');
    expect(saved.rating).toBe(4);
    expect(saved.dishes.map((d) => d.name)).toEqual(['Pad thai']);
    expect(saved.note).toBe('Really good');
    expect(saved.price).toBe(12.5);
    expect(saved.tags.map((t) => t.name)).toEqual(['hidden-gem']);
    expect(screen.queryByText('To finish')).not.toBeInTheDocument();
  });

  it('keeps a quick entry as quick if nothing was added', async () => {
    const { user, repos, entry } = await open((e) => e.status === 'quick' && e.dishes.length === 0 && !e.note && e.price === null, '/edit');
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { level: 1, name: entry.place.name });
    expect((await repos.entries.get(entry.id))!.status).toBe('quick');
  });

  it('cancel leaves the entry untouched', async () => {
    const { user, repos, entry } = await open((e) => e.status === 'complete', '/edit');
    await user.type(await screen.findByLabelText('Notes'), ' EXTRA');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByRole('heading', { level: 1, name: entry.place.name });
    expect((await repos.entries.get(entry.id))!.note).toBe(entry.note);
  });

  it('does not submit the form when pressing Enter in the tag box', async () => {
    const { user, repos, entry } = await open((e) => e.status === 'complete', '/edit');
    await user.type(await screen.findByLabelText('Tags'), 'brand-new{Enter}');
    expect(screen.getByRole('button', { name: 'Remove tag brand-new' })).toBeInTheDocument();
    expect((await repos.entries.get(entry.id))!.tags.map((t) => t.name)).not.toContain('brand-new');
  });
});

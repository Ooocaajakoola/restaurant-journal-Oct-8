import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

async function open(route = '/cities/city-london') {
  const repos = createTestRepositories();
  const utils = renderApp(<App />, { repositories: repos, route });
  await screen.findByRole('heading', { level: 1, name: 'London' });
  return { repos, user: userEvent.setup(), ...utils };
}

const entryList = () => screen.getByRole('list', { name: 'Entries in London' });
const count = () => within(entryList()).getAllByRole('listitem').length;

describe('City view', () => {
  it('lists the city’s entries, newest first, with country and airports', async () => {
    const { repos } = await open();
    const expected = await repos.entries.list({ cityId: 'city-london' });
    await waitFor(() => expect(count()).toBe(expected.length));
    expect(screen.getByText(/United Kingdom · LHR · LGW/)).toBeInTheDocument();
    expect(within(entryList()).getAllByRole('listitem')[0]).toHaveTextContent(expected[0]!.place.name);
  });

  it('filters by cuisine, rating, tag and price, and can clear them', async () => {
    const { repos, user } = await open();
    const all = await repos.entries.list({ cityId: 'city-london' });
    await waitFor(() => expect(count()).toBe(all.length));

    await user.selectOptions(screen.getByLabelText('Cuisine'), 'Café');
    await waitFor(() => expect(count()).toBe(all.filter((e) => e.place.cuisine === 'Café').length));
    expect(screen.getByText(/match your filters/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Rating'), '5');
    await waitFor(() => expect(count()).toBe(all.filter((e) => e.place.cuisine === 'Café' && e.rating >= 5).length));

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(count()).toBe(all.length));

    await user.selectOptions(screen.getByLabelText('Tag'), 'crew-favourite');
    await waitFor(() => expect(count()).toBe(all.filter((e) => e.tags.some((t) => t.name === 'crew-favourite')).length));
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await user.selectOptions(screen.getByLabelText('Price'), '3');
    await waitFor(() => expect(count()).toBe(all.filter((e) => e.place.priceLevel === 3).length));
  });

  it('only offers cuisines and tags that exist in this city', async () => {
    await open();
    const cuisine = screen.getByLabelText('Cuisine');
    await waitFor(() => expect(within(cuisine).getAllByRole('option').length).toBeGreaterThan(2));
    const options = within(cuisine).getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('British');
    expect(options).not.toContain('Sushi');
  });

  it('shows an empty state when filters match nothing', async () => {
    const { user } = await open();
    await user.selectOptions(await screen.findByLabelText('Price'), '4');
    expect(await screen.findByText('No entries match these filters.')).toBeInTheDocument();
  });

  it('remembers filters in the URL', async () => {
    const { repos } = await open('/cities/city-london?cuisine=Caf%C3%A9&rating=5');
    const expected = (await repos.entries.list({ cityId: 'city-london', cuisine: 'Café', minRating: 5 })).length;
    await waitFor(() => expect(count()).toBe(expected));
    expect(screen.getByLabelText('Cuisine')).toHaveValue('Café');
    expect(screen.getByLabelText('Rating')).toHaveValue('5');
  });

  it('toggles between list and map views', async () => {
    const { user, repos } = await open();
    const list = screen.getByRole('button', { name: 'List' });
    const map = screen.getByRole('button', { name: 'Map' });
    expect(list).toHaveAttribute('aria-pressed', 'true');

    await user.click(map);
    expect(await screen.findByRole('region', { name: 'Map of London entries' })).toBeInTheDocument();
    expect(map).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('list', { name: 'Entries in London' })).not.toBeInTheDocument();
    const places = new Set((await repos.entries.list({ cityId: 'city-london' })).map((e) => e.placeId));
    await waitFor(() => expect(document.querySelectorAll('.leaflet-marker-icon').length).toBe(places.size));

    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(await screen.findByRole('list', { name: 'Entries in London' })).toBeInTheDocument();
  });

  it('shares the (filtered) city as a read-only list link', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const { user, repos } = await open();
    await user.selectOptions(screen.getByLabelText('Rating'), '5');
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();

    const url = await navigator.clipboard.readText();
    const shared = await repos.lists.getShared(url.split('/l/')[1]!);
    expect(shared?.title).toBe('London favourites');
    expect(shared!.items.length).toBeGreaterThan(0);
    expect(shared!.items.every((i) => i.rating === 5)).toBe(true);
  });

  it('says so when the city does not exist', async () => {
    renderApp(<App />, { route: '/cities/nowhere' });
    expect(await screen.findByRole('heading', { name: 'City not found' })).toBeInTheDocument();
  });
});

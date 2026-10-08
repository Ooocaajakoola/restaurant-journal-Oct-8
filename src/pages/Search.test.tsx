import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

async function open(route = '/search') {
  const repos = createTestRepositories();
  renderApp(<App />, { repositories: repos, route });
  await screen.findByRole('heading', { level: 1, name: 'Search' });
  return { repos, user: userEvent.setup() };
}

const results = () => screen.queryByRole('list', { name: 'Search results' });
const resultCount = () => within(results()!).getAllByRole('listitem').length;

describe('Search', () => {
  it('starts with no results and suggests tags to try', async () => {
    await open();
    expect(results()).not.toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /#crew-favourite/ });
    expect(link).toHaveAttribute('href', '/search?by=tag&q=crew-favourite');
  });

  it('searches everything by default (place, dish, city, note)', async () => {
    const { repos, user } = await open();
    await user.type(screen.getByLabelText('Search everything'), 'ramen');
    const expected = (await repos.entries.list({ text: 'ramen' })).length;
    expect(expected).toBeGreaterThan(0);
    await waitFor(() => expect(resultCount()).toBe(expected));
    expect(screen.getByText(`${expected} ${expected === 1 ? 'result' : 'results'}`)).toBeInTheDocument();
  });

  it('searches by dish', async () => {
    const { repos, user } = await open();
    await user.click(screen.getByRole('radio', { name: 'Dish' }));
    await user.type(screen.getByLabelText('Search by dish'), 'croissant');
    const expected = await repos.entries.list({ dish: 'croissant' });
    await waitFor(() => expect(resultCount()).toBe(expected.length));
    expect(within(results()!).getAllByRole('listitem')[0]).toHaveTextContent(/Boulangerie Margaux|Pastéis|Sunrise|Flat White/i);
  });

  it('searches by city name or airport code', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('radio', { name: 'City' }));
    await user.type(screen.getByLabelText('Search by city'), 'NRT');
    await waitFor(() => expect(resultCount()).toBeGreaterThan(0));
    for (const li of within(results()!).getAllByRole('listitem')) expect(li).toHaveTextContent('Tokyo');
  });

  it('searches by tag, including the /search?tag= shorthand used by tag chips', async () => {
    const { repos } = await open('/search?tag=late-night');
    const expected = (await repos.entries.list({ tagQuery: 'late-night' })).length;
    await waitFor(() => expect(results()).toBeInTheDocument());
    await waitFor(() => expect(resultCount()).toBe(expected));
    expect(screen.getByRole('radio', { name: 'Tag' })).toBeChecked();
    expect(screen.getByLabelText('Search by tag')).toHaveValue('late-night');
  });

  it('searches by date range', async () => {
    const { repos, user } = await open();
    const all = await repos.entries.list();
    const day = all[3]!.visitedAt.slice(0, 10);
    await user.click(screen.getByRole('radio', { name: 'Date' }));
    await user.type(screen.getByLabelText('From'), day);
    await user.type(screen.getByLabelText('To'), day);
    const expected = (await repos.entries.list({ dateFrom: day, dateTo: day })).length;
    await waitFor(() => expect(resultCount()).toBe(expected));
  });

  it('says so when nothing matches, and lets you clear the search', async () => {
    const { user } = await open();
    await user.type(screen.getByLabelText('Search everything'), 'zzzzqx');
    expect(await screen.findByText(/Nothing found/)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Clear search' }));
    await waitFor(() => expect(screen.getByLabelText('Search everything')).toHaveValue(''));
  });

  it('is a labelled search landmark', async () => {
    await open();
    expect(screen.getByRole('search', { name: 'Search your journal' })).toBeInTheDocument();
  });
});

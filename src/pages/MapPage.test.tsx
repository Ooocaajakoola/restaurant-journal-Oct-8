import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { buildPins } from '../lib/mapPins';
import { RATING_COLORS } from '../lib/ratingColors';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

describe('Map page', () => {
  it('shows one pin per place with the rating colour, and a legend', async () => {
    const repos = createTestRepositories();
    renderApp(<App />, { repositories: repos, route: '/map' });
    expect(await screen.findByRole('region', { name: 'Map of all your entries' })).toBeInTheDocument();

    const entries = await repos.entries.list();
    const pins = buildPins(entries);
    await waitFor(() => expect(document.querySelectorAll('.leaflet-marker-icon').length).toBe(pins.length));

    const first = pins[0]!;
    const marker = screen.getByTitle(new RegExp(`^${first.name}, rated ${first.rating} out of 5`));
    expect(marker.querySelector('span')).toHaveStyle({ backgroundColor: RATING_COLORS[first.rating] });
    expect(screen.getByRole('list', { name: 'Pin colours by rating' })).toBeInTheDocument();
    expect(screen.getByText(`${pins.length} places · ${entries.length} entries`)).toBeInTheDocument();
  });

  it('shows the entries for a place when its pin is tapped', async () => {
    const repos = createTestRepositories();
    renderApp(<App />, { repositories: repos, route: '/map' });
    await waitFor(() => expect(document.querySelectorAll('.leaflet-marker-icon').length).toBeGreaterThan(0));
    expect(screen.getByText(/Tap a pin/)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/^Sunrise Café, rated/));
    const section = await screen.findByRole('region', { name: /Sunrise Café/ });
    const expected = (await repos.entries.list()).filter((e) => e.place.name === 'Sunrise Café');
    expect(within(section).getAllByRole('listitem')).toHaveLength(expected.length);
    expect(within(section).getAllByRole('link')[0]).toHaveAttribute('href', `/entry/${expected[0]!.id}`);
  });

  it('shows an empty state when there are no entries', async () => {
    const repos = createTestRepositories();
    for (const e of await repos.entries.list()) await repos.entries.delete(e.id);
    renderApp(<App />, { repositories: repos, route: '/map' });
    expect(await screen.findByText(/Nothing to show yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log a meal' })).toHaveAttribute('href', '/');
  });
});

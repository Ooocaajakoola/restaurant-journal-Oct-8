import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useUiStore } from '../store/uiStore';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

async function open() {
  const repos = createTestRepositories();
  useUiStore.getState().setTheme('dark');
  renderApp(<App />, { repositories: repos, route: '/settings' });
  await screen.findByLabelText('Display name');
  return { repos, user: userEvent.setup() };
}

describe('Settings', () => {
  it('shows the saved profile and defaults', async () => {
    await open();
    expect(screen.getByLabelText('Display name')).toHaveValue('Sam Carter');
    expect(screen.getByLabelText('Home airport')).toHaveValue('LHR');
    expect(screen.getByRole('radio', { name: /Crew/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Dark/ })).toBeChecked();
  });

  it('switches theme immediately', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('radio', { name: /Light/ }));
    expect(document.documentElement).not.toHaveClass('dark');
    await user.click(screen.getByRole('radio', { name: /Dark/ }));
    expect(document.documentElement).toHaveClass('dark');
  });

  it('saves display name, home airport and default visibility', async () => {
    const { user, repos } = await open();
    await user.clear(screen.getByLabelText('Display name'));
    await user.type(screen.getByLabelText('Display name'), 'Sam C.');
    await user.clear(screen.getByLabelText('Home airport'));
    await user.type(screen.getByLabelText('Home airport'), 'fra');
    await user.click(screen.getByRole('radio', { name: /Private/ }));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(await screen.findByText('Settings saved')).toBeInTheDocument();
    const saved = await repos.users.getCurrent();
    expect(saved.displayName).toBe('Sam C.');
    expect(saved.homeAirport).toBe('FRA');
    expect(saved.defaultVisibility).toBe('private');
  });

  it('uses the new default visibility for the next quick entry', async () => {
    const { user, repos } = await open();
    await user.click(screen.getByRole('radio', { name: /Friends/ }));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    await screen.findByText('Settings saved');
    const place = (await repos.places.search('bao alley'))[0]!;
    expect((await repos.entries.create({ placeId: place.id, rating: 4 })).visibility).toBe('friends');
  });

  it('validates the airport code and name', async () => {
    const { user, repos } = await open();
    await user.clear(screen.getByLabelText('Home airport'));
    await user.type(screen.getByLabelText('Home airport'), 'LH');
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/3-letter code/);
    expect((await repos.users.getCurrent()).homeAirport).toBe('LHR');

    await user.clear(screen.getByLabelText('Display name'));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/display name/i);
  });

  it('shows a placeholder sync status', async () => {
    await open();
    const sync = screen.getByRole('region', { name: 'Sync' });
    expect(sync).toHaveTextContent('Local only');
    expect(sync).toHaveTextContent(/coming later/i);
    expect(sync).toHaveTextContent('Entries on this device');
  });
});

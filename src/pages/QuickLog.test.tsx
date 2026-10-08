import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import QuickLog from './QuickLog';
import { createTestRepositories } from '../test/mockRepos';
import { renderApp } from '../test/render';

vi.mock('../lib/image', () => ({
  photoToDataUrl: vi.fn(async () => 'data:image/jpeg;base64,TEST'),
}));

async function setup() {
  const repos = createTestRepositories();
  const utils = renderApp(<QuickLog />, { repositories: repos });
  // Wait for the mocked location and nearby suggestions to load.
  await screen.findByRole('radio', { name: /Sunrise Café/ });
  return { repos, user: userEvent.setup(), ...utils };
}

const saveButton = () => screen.getByRole('button', { name: /^save$/i });

describe('Quick Log', () => {
  it('suggests nearby places from the mocked current location, nearest first', async () => {
    await setup();
    expect(screen.getByText(/near Soho, London/i)).toBeInTheDocument();
    const radios = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).name === 'place');
    expect(radios.length).toBeGreaterThanOrEqual(3);
    // Places in other cities are not suggested.
    expect(screen.queryByRole('radio', { name: /Sushi Daiwa-ya/ })).not.toBeInTheDocument();
  });

  it('cannot be saved until a place and a rating are chosen', async () => {
    const { user } = await setup();
    expect(saveButton()).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Sunrise Café/ }));
    expect(saveButton()).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(saveButton()).toBeEnabled();
  });

  it('logs a meal in three taps and shows a visible Saved state', async () => {
    const { user, repos } = await setup();
    const before = (await repos.entries.list()).length;

    await user.click(screen.getByRole('radio', { name: /Sunrise Café/ })); // tap 1: place
    await user.click(screen.getByRole('radio', { name: '5 stars' })); // tap 2: rating
    await user.click(saveButton()); // tap 3: save

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Saved');
    expect(status).toHaveTextContent('Sunrise Café');
    expect(within(status).getByRole('link', { name: 'Add details' })).toBeInTheDocument();

    const entries = await repos.entries.list();
    expect(entries.length).toBe(before + 1);
    const created = entries.find((e) => e.place.name === 'Sunrise Café' && e.rating === 5 && e.status === 'quick' && e.note === '')!;
    expect(created).toBeTruthy();
    expect(created.dishes).toEqual([]);
    expect(created.city.name).toBe('London');
  });

  it('resets the form after saving so the next meal can be logged straight away', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Sunrise Café/ }));
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(saveButton());
    await screen.findByRole('status');
    await waitFor(() => expect(screen.getByRole('radio', { name: '3 stars' })).not.toBeChecked());
    expect(saveButton()).toBeDisabled();
  });

  it('shows the new quick entry in Recent with a "To finish" badge', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Bao Alley/ }));
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(saveButton());

    const recent = await screen.findByRole('region', { name: 'Recent' });
    await waitFor(() => expect(within(recent).getAllByRole('listitem')[0]).toHaveTextContent('Bao Alley'));
    expect(within(recent).getAllByRole('listitem')[0]).toHaveTextContent('To finish');
  });

  it('filters suggestions as you type', async () => {
    const { user } = await setup();
    await user.type(screen.getByLabelText(/search or type a place name/i), 'tandoor');
    expect(await screen.findByRole('radio', { name: /Tandoor Lane/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('radio', { name: /Sunrise Café/ })).not.toBeInTheDocument());
  });

  it('lets you add a place that does not exist yet, at the current location', async () => {
    const { user, repos } = await setup();
    await user.type(screen.getByLabelText(/search or type a place name/i), 'Midnight Noodle Cart');
    await user.click(await screen.findByRole('radio', { name: /Add “Midnight Noodle Cart” as a new place/ }));
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(saveButton());

    await screen.findByRole('status');
    const [latest] = await repos.entries.list();
    expect(latest!.place.name).toBe('Midnight Noodle Cart');
    expect(latest!.city.name).toBe('London');
    expect(latest!.rating).toBe(4);
  });

  it('does not offer to add a place that matches an existing one exactly', async () => {
    const { user } = await setup();
    await user.type(screen.getByLabelText(/search or type a place name/i), 'Bao Alley');
    await screen.findByRole('radio', { name: /^Bao Alley/ });
    expect(screen.queryByRole('radio', { name: /as a new place/ })).not.toBeInTheDocument();
  });

  it('attaches an optional photo', async () => {
    const { user, repos } = await setup();
    await user.click(screen.getByRole('radio', { name: /Sunrise Café/ }));
    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    await user.upload(screen.getByLabelText(/add a photo/i), new File(['x'], 'meal.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByAltText('Selected meal')).toBeInTheDocument();
    await user.click(saveButton());
    await screen.findByRole('status');
    const [latest] = await repos.entries.list();
    expect(latest!.photos).toHaveLength(1);
    expect(latest!.photos[0]!.url).toBe('data:image/jpeg;base64,TEST');
  });

  it('shows an error and keeps the form when saving fails', async () => {
    const { user, repos } = await setup();
    vi.spyOn(repos.entries, 'create').mockRejectedValueOnce(new Error('Browser storage is full.'));
    await user.click(screen.getByRole('radio', { name: /Sunrise Café/ }));
    await user.click(screen.getByRole('radio', { name: '2 stars' }));
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('storage is full');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '2 stars' })).toBeChecked();
    expect(saveButton()).toBeEnabled();
  });
});

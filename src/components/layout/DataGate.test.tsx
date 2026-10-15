import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RepositoryProvider } from '../../hooks/useRepositories';
import { createTestRepositories } from '../../test/mockRepos';
import { DataGate } from './DataGate';

function renderGate(ready: () => Promise<void>) {
  const repos = Object.assign(createTestRepositories(), { ready });
  return render(
    <RepositoryProvider repositories={repos}>
      <DataGate>
        <p>The app</p>
      </DataGate>
    </RepositoryProvider>,
  );
}

describe('DataGate', () => {
  it('shows a connecting message, then the app once the data layer is ready', async () => {
    renderGate(() => Promise.resolve());
    expect(screen.getByRole('status')).toHaveTextContent('Connecting');
    expect(await screen.findByText('The app')).toBeInTheDocument();
  });

  it('explains the problem and lets you retry when it cannot connect', async () => {
    const ready = vi.fn().mockRejectedValueOnce(new Error('Anonymous sign-ins are switched off')).mockResolvedValueOnce(undefined);
    renderGate(ready);
    expect(await screen.findByRole('alert')).toHaveTextContent('Anonymous sign-ins are switched off');
    expect(screen.queryByText('The app')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('The app')).toBeInTheDocument();
    expect(ready).toHaveBeenCalledTimes(2);
  });
});

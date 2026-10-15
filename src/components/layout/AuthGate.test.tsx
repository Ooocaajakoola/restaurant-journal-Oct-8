import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RepositoryProvider } from '../../hooks/useRepositories';
import { createFakeAuth, SAM } from '../../test/fakeAuth';
import { createTestRepositories } from '../../test/mockRepos';
import { AuthGate } from './AuthGate';

function renderGate(auth: ReturnType<typeof createFakeAuth>) {
  const repos = Object.assign(createTestRepositories(), { auth });
  return render(
    <RepositoryProvider repositories={repos}>
      <AuthGate>
        <p>The app</p>
      </AuthGate>
    </RepositoryProvider>,
  );
}

describe('AuthGate', () => {
  it('shows a connecting message, then the app when someone is signed in', async () => {
    renderGate(createFakeAuth(SAM));
    expect(screen.getByRole('status')).toHaveTextContent('Connecting');
    expect(await screen.findByText('The app')).toBeInTheDocument();
  });

  it('shows the sign-in screen, not the app, when signed out', async () => {
    renderGate(createFakeAuth(null));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('The app')).not.toBeInTheDocument();
  });

  it('lets you in after signing in', async () => {
    const auth = createFakeAuth(null);
    renderGate(auth);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1)!); // the submit button, not the tab
    expect(await screen.findByText('The app')).toBeInTheDocument();
    expect(auth.signIn).toHaveBeenCalledWith('sam@example.com', 'password1');
  });

  it('returns to the sign-in screen when the user signs out elsewhere', async () => {
    const auth = createFakeAuth(SAM);
    renderGate(auth);
    await screen.findByText('The app');
    await act(async () => auth.signOut());
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('The app')).not.toBeInTheDocument();
  });

  it('falls back to the sign-in screen if the session check fails', async () => {
    const auth = createFakeAuth(null);
    auth.getUser.mockRejectedValueOnce(new Error('offline'));
    renderGate(auth);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('stops listening for auth changes when it unmounts', async () => {
    const auth = createFakeAuth(SAM);
    const unsubscribe = vi.fn();
    auth.onChange.mockImplementationOnce(() => unsubscribe);
    const { unmount } = renderGate(auth);
    await screen.findByText('The app');
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

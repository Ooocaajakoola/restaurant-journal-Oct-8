import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeAuth } from '../../test/fakeAuth';
import { AuthScreen } from './AuthScreen';

function setup(auth = createFakeAuth(null)) {
  const onSignedIn = vi.fn();
  render(<AuthScreen auth={auth} onSignedIn={onSignedIn} />);
  return { auth, onSignedIn, user: userEvent.setup() };
}

const submit = (name: string) => screen.getAllByRole('button', { name }).at(-1)!;

describe('AuthScreen', () => {
  it('signs in with email and password', async () => {
    const { auth, onSignedIn, user } = setup();
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(submit('Sign in'));
    expect(auth.signIn).toHaveBeenCalledWith('sam@example.com', 'password1');
    expect(onSignedIn).toHaveBeenCalledWith(expect.objectContaining({ email: 'sam@example.com' }));
  });

  it('creates an account with a name, email and password', async () => {
    const { auth, onSignedIn, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create account', pressed: false }));
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.click(submit('Create account'));
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'sam@example.com', password: 'longenough1', displayName: 'Sam' });
    expect(onSignedIn).toHaveBeenCalled();
  });

  it('checks the form before calling the server', async () => {
    const { auth, user } = setup();
    await user.click(submit('Sign in'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(submit('Sign in'));
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i);

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.click(submit('Sign in'));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your password/i);

    await user.click(screen.getByRole('button', { name: 'Create account', pressed: false }));
    await user.click(submit('Create account'));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your name/i);
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(submit('Create account'));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('shows the server’s message when sign-in fails and keeps the form', async () => {
    const auth = createFakeAuth(null);
    auth.signIn.mockRejectedValueOnce(new Error('Incorrect email or password.'));
    const { user } = setup(auth);
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(submit('Sign in'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.getByLabelText('Email')).toHaveValue('sam@example.com');
  });

  it('tells you to check your inbox when email confirmation is required, and can resend', async () => {
    const auth = createFakeAuth(null);
    auth.signUp.mockResolvedValueOnce({ status: 'confirm-email', email: 'sam@example.com' });
    const { user, onSignedIn } = setup(auth);
    await user.click(screen.getByRole('button', { name: 'Create account', pressed: false }));
    await user.type(screen.getByLabelText('Your name'), 'Sam');
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.click(submit('Create account'));

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(onSignedIn).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Resend email' }));
    expect(auth.resendConfirmation).toHaveBeenCalledWith('sam@example.com');
    expect(await screen.findByText('Email sent again.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to sign in' }));
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('can reveal the password, and uses the right autocomplete hints', async () => {
    const { user } = setup();
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    await user.click(screen.getByLabelText('Show password'));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Create account', pressed: false }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
  });
});

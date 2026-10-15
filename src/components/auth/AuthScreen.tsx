import { useState, type FormEvent } from 'react';
import type { AuthRepository, AuthUser } from '../../data/repositories';
import { Button } from '../ui/Button';
import { Field, inputClass } from '../ui/Field';
import { Icon } from '../ui/Icon';

type Mode = 'signin' | 'signup';

const MIN_PASSWORD = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AuthScreenProps {
  auth: AuthRepository;
  onSignedIn(user: AuthUser): void;
}

export function AuthScreen({ auth, onSignedIn }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmEmail(null);
  }

  function validate(): string | null {
    if (mode === 'signup' && !displayName.trim()) return 'Enter your name.';
    if (!EMAIL.test(email.trim())) return 'Enter a valid email address.';
    if (mode === 'signup' && password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
    if (mode === 'signin' && !password) return 'Enter your password.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const result = await auth.signUp({ email, password, displayName });
        if (result.status === 'signed-in') onSignedIn(result.user);
        else setConfirmEmail(result.email);
      } else {
        onSignedIn(await auth.signIn(email, password));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (!confirmEmail) return;
    setError(null);
    setResent(false);
    try {
      await auth.resendConfirmation(confirmEmail);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the email.');
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 bg-canvas px-4 py-8 text-fg">
      <div className="flex items-center gap-2 text-2xl font-bold">
        <span className="text-accent">
          <Icon name="tower" size={32} />
        </span>
        Food Tower
      </div>

      {confirmEmail ? (
        <section aria-labelledby="confirm-h" className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h1 id="confirm-h" className="text-xl font-bold">
            Check your inbox
          </h1>
          <p role="status">
            We sent a confirmation link to <strong>{confirmEmail}</strong>. Open it, then come back and sign in.
          </p>
          {resent && <p role="status" className="text-success">Email sent again.</p>}
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleResend()}>Resend email</Button>
            <Button variant="primary" onClick={() => switchMode('signin')}>
              Go to sign in
            </Button>
          </div>
        </section>
      ) : (
        <>
          <div role="group" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => switchMode(m)}
                className={`min-h-11 rounded-lg px-4 font-semibold ${mode === m ? 'bg-accent text-on-accent' : 'text-fg hover:bg-line/40'}`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4 rounded-2xl border border-line bg-surface p-5">
            <h1 className="text-xl font-bold">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>

            {mode === 'signup' && (
              <Field label="Your name">
                {(id) => (
                  <input id={id} className={inputClass} value={displayName} autoComplete="name" onChange={(e) => setDisplayName(e.target.value)} />
                )}
              </Field>
            )}
            <Field label="Email">
              {(id) => (
                <input
                  id={id}
                  type="email"
                  inputMode="email"
                  className={inputClass}
                  value={email}
                  autoComplete="email"
                  autoCapitalize="none"
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label="Password" hint={mode === 'signup' ? `At least ${MIN_PASSWORD} characters` : undefined}>
              {(id, described) => (
                <input
                  id={id}
                  aria-describedby={described}
                  type={showPassword ? 'text' : 'password'}
                  className={inputClass}
                  value={password}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show password
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-danger/60 p-3 text-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full min-h-12" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}

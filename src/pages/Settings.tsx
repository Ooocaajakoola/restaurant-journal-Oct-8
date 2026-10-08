import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import { capitalize, formatDateTime } from '../lib/format';
import { useJournalStore } from '../store/journalStore';
import { useUiStore, type Theme } from '../store/uiStore';
import { VISIBILITIES, type User, type Visibility } from '../types';

const VISIBILITY_HELP: Record<Visibility, string> = {
  private: 'Only you',
  friends: 'People you share with',
  crew: 'Your crew',
};

const IATA = /^[A-Za-z]{3}$/;

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: Array<{ value: T; label: string; help?: string }>;
  onChange(v: T): void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-muted">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
            <span className="flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border border-line bg-surface px-4 py-2 peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]">
              <span className="font-semibold">{o.label}</span>
              {o.help && <span className="text-sm text-muted">{o.help}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Loads the saved user, then mounts the form with that data as its starting state. */
export default function Settings() {
  const repos = useRepositories();
  const user = useAsyncData(() => repos.users.getCurrent(), []);
  if (!user.data) return <p role="status">Loading…</p>;
  return <SettingsForm user={user.data} />;
}

function SettingsForm({ user }: { user: User }) {
  const repos = useRepositories();
  const invalidate = useJournalStore((s) => s.invalidate);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  const entries = useAsyncData(() => repos.entries.list(), []);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [homeAirport, setHomeAirport] = useState(user.homeAirport ?? '');
  const [visibility, setVisibility] = useState<Visibility>(user.defaultVisibility);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastChange = (entries.data ?? []).reduce<string | null>((latest, e) => (!latest || e.updatedAt > latest ? e.updatedAt : latest), null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (!displayName.trim()) return setError('Enter a display name.');
    if (homeAirport.trim() && !IATA.test(homeAirport.trim())) return setError('Home airport should be a 3-letter code, like LHR.');
    setSaving(true);
    setError(null);
    try {
      await repos.users.updateCurrent({ displayName, homeAirport: homeAirport.trim() || null, defaultVisibility: visibility });
      invalidate();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, privacy defaults and appearance." />

      <div className="space-y-8">
        <section aria-labelledby="appearance-h">
          <h2 id="appearance-h" className="mb-3 text-lg font-bold">
            Appearance
          </h2>
          <ChoiceGroup<Theme>
            legend="Theme"
            name="theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: 'Dark', help: 'Easy on the eyes in the crew room' },
              { value: 'light', label: 'Light', help: 'Better in bright sun' },
            ]}
          />
        </section>

        <form onSubmit={(e) => void handleSubmit(e)} aria-labelledby="profile-h" className="space-y-5">
          <h2 id="profile-h" className="text-lg font-bold">
            Profile
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              {(id) => <input id={id} className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />}
            </Field>
            <Field label="Home airport" hint="3-letter code, e.g. LHR">
              {(id, described) => (
                <input
                  id={id}
                  aria-describedby={described}
                  className={`${inputClass} uppercase`}
                  value={homeAirport}
                  maxLength={3}
                  onChange={(e) => setHomeAirport(e.target.value)}
                />
              )}
            </Field>
          </div>

          <ChoiceGroup<Visibility>
            legend="Default visibility for new entries"
            name="default-visibility"
            value={visibility}
            onChange={setVisibility}
            options={VISIBILITIES.map((v) => ({ value: v, label: capitalize(v), help: VISIBILITY_HELP[v] }))}
          />

          {error && (
            <p role="alert" className="rounded-xl border border-danger/60 p-3 text-danger">
              {error}
            </p>
          )}
          {saved && !error && (
            <p role="status" className="rounded-xl border border-success/60 p-3">
              Settings saved
            </p>
          )}
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </form>

        <section aria-labelledby="sync-h">
          <h2 id="sync-h" className="mb-3 text-lg font-bold">
            Sync
          </h2>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <span className="text-muted">
                <Icon name="sync" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Status: <span className="text-accent">Local only</span>
                </p>
                <p className="text-sm text-muted">Everything is saved on this device. Cloud sync across devices is coming later.</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
              <div>
                <dt className="text-muted">Entries on this device</dt>
                <dd className="font-semibold">{entries.data?.length ?? '…'}</dd>
              </div>
              <div>
                <dt className="text-muted">Last change</dt>
                <dd className="font-semibold">{lastChange ? formatDateTime(lastChange) : 'None yet'}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EntryForm } from '../components/entry/EntryForm';
import { PageHeader } from '../components/layout/PageHeader';
import { buttonClasses } from '../components/ui/Button';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRepositories } from '../hooks/useRepositories';
import type { EntryInput } from '../data/repositories';
import { useJournalStore } from '../store/journalStore';

export default function EntryEdit() {
  const { id = '' } = useParams();
  const repos = useRepositories();
  const navigate = useNavigate();
  const invalidate = useJournalStore((s) => s.invalidate);
  const entry = useAsyncData(() => repos.entries.get(id), [id]);
  const tags = useAsyncData(() => repos.tags.list(), []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (entry.loading && !entry.data) return <p role="status">Loading…</p>;

  if (!entry.data) {
    return (
      <>
        <PageHeader title="Entry not found" subtitle="It may have been deleted." />
        <Link to="/" className={buttonClasses('primary')}>
          Back to Quick Log
        </Link>
      </>
    );
  }

  const current = entry.data;

  async function handleSubmit(patch: Partial<EntryInput>) {
    setSaving(true);
    setError(null);
    try {
      await repos.entries.update(current.id, patch);
      invalidate();
      navigate(`/entry/${current.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes.');
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title={current.status === 'quick' ? 'Finish this entry' : 'Edit entry'} subtitle={`${current.place.name} · ${current.city.name}`} />
      <EntryForm
        entry={current}
        knownTags={(tags.data ?? []).map((t) => t.name)}
        saving={saving}
        error={error}
        onSubmit={(patch) => void handleSubmit(patch)}
        onCancel={() => navigate(`/entry/${current.id}`)}
      />
    </>
  );
}

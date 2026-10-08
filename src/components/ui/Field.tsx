import { useId, type ReactNode } from 'react';

export const inputClass =
  'min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg placeholder:text-muted disabled:opacity-60';

interface FieldProps {
  label: string;
  hint?: string;
  /** Receives the id to put on the control, so the label is properly associated. */
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-muted">
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

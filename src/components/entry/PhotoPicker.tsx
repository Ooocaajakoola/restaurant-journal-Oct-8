import { useId, useState } from 'react';
import { photoToDataUrl } from '../../lib/image';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface PhotoPickerProps {
  /** Current photo as a data URL, or null. */
  value: string | null;
  onChange(dataUrl: string | null): void;
}

export function PhotoPicker({ value, onChange }: PhotoPickerProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      onChange(await photoToDataUrl(file));
    } catch {
      setError('That photo could not be read. Try another one.');
    }
  }

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="Selected meal" className="size-20 rounded-xl object-cover" />
          <Button variant="ghost" onClick={() => onChange(null)}>
            Remove photo
          </Button>
        </div>
      ) : (
        <>
          <label
            htmlFor={id}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 text-base font-medium text-muted hover:bg-surface-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]"
          >
            <Icon name="camera" />
            Add a photo (optional)
            <input
              id={id}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

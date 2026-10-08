import { Icon } from '../ui/Icon';

export type CityViewMode = 'list' | 'map';

interface ViewToggleProps {
  value: CityViewMode;
  onChange(value: CityViewMode): void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const options: Array<{ mode: CityViewMode; label: string; icon: 'list' | 'map' }> = [
    { mode: 'list', label: 'List', icon: 'list' },
    { mode: 'map', label: 'Map', icon: 'map' },
  ];
  return (
    <div role="group" aria-label="View" className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.mode}
          type="button"
          aria-pressed={value === o.mode}
          onClick={() => onChange(o.mode)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-semibold ${
            value === o.mode ? 'bg-accent text-on-accent' : 'text-fg hover:bg-line/40'
          }`}
        >
          <Icon name={o.icon} size={18} />
          {o.label}
        </button>
      ))}
    </div>
  );
}

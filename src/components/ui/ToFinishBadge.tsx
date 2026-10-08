import { Icon } from './Icon';

/** Marks quick entries that still lack dishes, notes or a price. */
export function ToFinishBadge() {
  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-accent/70 px-2.5 text-xs font-semibold text-accent">
      <Icon name="alert" size={14} />
      To finish
    </span>
  );
}

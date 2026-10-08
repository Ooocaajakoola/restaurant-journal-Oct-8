import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const CHIP = 'inline-flex min-h-8 items-center rounded-full border border-line bg-surface-2 px-3 text-sm font-medium text-fg';

export function Chip({ children }: { children: ReactNode }) {
  return <span className={CHIP}>{children}</span>;
}

/** A chip that navigates. Padded to a 44px tap target with an invisible hit area. */
export function ChipLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={`${CHIP} relative hover:bg-line/40 after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']`}>
      {children}
    </Link>
  );
}

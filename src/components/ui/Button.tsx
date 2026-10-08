import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110 active:brightness-95',
  secondary: 'border border-line bg-surface-2 text-fg hover:bg-line/40',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'border border-danger/60 bg-transparent text-danger hover:bg-danger/10',
};

/** Shared with <Link> so links that look like buttons keep the 44px touch target. */
export function buttonClasses(variant: ButtonVariant = 'secondary', extra = '') {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim();
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'secondary', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  variant?: ButtonVariant;
}

export function IconButton({ label, variant = 'ghost', className = '', type = 'button', children, ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} title={label} className={buttonClasses(variant, `px-0 ${className}`)} {...rest}>
      {children}
    </button>
  );
}

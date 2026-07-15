import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & { className?: string };

/* Text field, r-tile radius, gold focus ring (matches the app's global
   focus-visible convention). Matches Tile's bg/border. */
export const TextInput = ({ className = '', ...rest }: Props) => (
  <input
    className={`w-full rounded-[var(--r-tile)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] ${className}`}
    {...rest}
  />
);

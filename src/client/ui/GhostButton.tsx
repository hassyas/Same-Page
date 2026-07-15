import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { assertNoEmoji } from './assertNoEmoji';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  fluid?: boolean;
  className?: string;
  children: ReactNode;
};

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-[3px]';

/* Outline "clay" pill — white surface, ink border, offset drop shadow that
   compresses on press, per styles.css's .btn-outline. Rounded-full outline
   is the app's default secondary/back/tab-inactive style; PrimaryButton is
   the exception, not the norm. */
export const GhostButton = ({ fluid = false, className = '', children, ...rest }: Props) => {
  assertNoEmoji('GhostButton', children);
  return (
    <button
      type="button"
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-pill)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--tile)] px-6 font-bold text-[var(--ink)] shadow-[0_6px_0_var(--ink),0_9px_14px_rgba(0,0,0,0.3)] hover:-translate-y-[3px] hover:shadow-[0_9px_0_var(--ink),0_14px_18px_rgba(0,0,0,0.35)] active:translate-y-[5px] active:shadow-[0_1px_0_var(--ink),0_2px_4px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-150 motion-reduce:transition-none disabled:opacity-60 disabled:active:translate-y-0 disabled:hover:translate-y-0 ${FOCUS_RING} ${fluid ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

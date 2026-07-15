import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { assertNoEmoji } from './assertNoEmoji';

type Variant = 'aqua' | 'terracotta' | 'gold';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  variant?: Variant;
  fluid?: boolean;
  className?: string;
  children: ReactNode;
};

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-[3px]';

// "Clay" pill — layered inset highlight/shadow + an offset drop shadow that
// compresses on press, per styles.css's .btn-clay-* (3 color variants, same
// shape language). Text is ink on every variant (a real AA fix over the
// prototype's literal white-on-terracotta, which measures 3.69:1 and fails
// normal-text AA at this weight/size — see Phase 0 contrast audit).
const VARIANT_STYLE: Record<Variant, { bg: string; boxShadow: string; hoverShadow: string; activeShadow: string }> = {
  aqua: {
    bg: 'var(--aqua)',
    boxShadow:
      'inset 0 4px 0 rgba(255,255,255,0.45), inset 0 -8px 14px rgba(0,0,0,0.15), 0 7px 0 var(--aqua-deep), 0 11px 16px rgba(0,0,0,0.35)',
    hoverShadow:
      'inset 0 4px 0 rgba(255,255,255,0.45), inset 0 -8px 14px rgba(0,0,0,0.15), 0 10px 0 var(--aqua-deep), 0 16px 20px rgba(0,0,0,0.4)',
    activeShadow:
      'inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -4px 8px rgba(0,0,0,0.2), 0 2px 0 var(--aqua-deep), 0 3px 6px rgba(0,0,0,0.3)',
  },
  terracotta: {
    bg: 'var(--terracotta)',
    boxShadow:
      'inset 0 4px 0 rgba(255,255,255,0.35), inset 0 -8px 14px rgba(0,0,0,0.2), 0 7px 0 var(--terracotta-deep), 0 11px 16px rgba(0,0,0,0.35)',
    hoverShadow:
      'inset 0 4px 0 rgba(255,255,255,0.35), inset 0 -8px 14px rgba(0,0,0,0.2), 0 10px 0 var(--terracotta-deep), 0 16px 20px rgba(0,0,0,0.4)',
    activeShadow:
      'inset 0 4px 0 rgba(255,255,255,0.25), inset 0 -4px 8px rgba(0,0,0,0.25), 0 2px 0 var(--terracotta-deep), 0 3px 6px rgba(0,0,0,0.3)',
  },
  gold: {
    bg: 'var(--gold)',
    boxShadow:
      'inset 0 4px 0 rgba(255,255,255,0.5), inset 0 -8px 14px rgba(0,0,0,0.15), 0 7px 0 var(--gold-deep), 0 11px 16px rgba(0,0,0,0.35)',
    hoverShadow:
      'inset 0 4px 0 rgba(255,255,255,0.5), inset 0 -8px 14px rgba(0,0,0,0.15), 0 10px 0 var(--gold-deep), 0 16px 20px rgba(0,0,0,0.4)',
    activeShadow:
      'inset 0 4px 0 rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.2), 0 2px 0 var(--gold-deep), 0 3px 6px rgba(0,0,0,0.3)',
  },
};

export const PrimaryButton = ({ variant = 'aqua', fluid = false, className = '', children, style, ...rest }: Props) => {
  assertNoEmoji('PrimaryButton', children);
  const v = VARIANT_STYLE[variant];
  return (
    <button
      type="button"
      className={`btn-clay inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-pill)] border-[var(--border-w)] border-[var(--ink)] px-6 font-bold text-[var(--ink)] active:translate-y-[5px] hover:-translate-y-[3px] transition-[transform,box-shadow] duration-150 motion-reduce:transition-none disabled:opacity-60 disabled:active:translate-y-0 disabled:hover:translate-y-0 ${FOCUS_RING} ${fluid ? 'w-full' : ''} ${className}`}
      style={
        {
          background: v.bg,
          boxShadow: v.boxShadow,
          '--hover-shadow': v.hoverShadow,
          '--active-shadow': v.activeShadow,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {children}
    </button>
  );
};

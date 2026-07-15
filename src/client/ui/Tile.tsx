import type { CSSProperties, ReactNode } from 'react';
import { TILE_PRESS } from '../motion';

export type TileState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';
export type TileSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<TileSize, string> = {
  sm: 'px-3 py-2 text-sm gap-1',
  md: 'px-4 py-3 text-base gap-1.5',
  lg: 'px-5 py-4 text-lg gap-2',
};

// "Clay card" — hard border + a flat offset drop shadow per state, per
// styles.css's .card-choice. correct/wrong repoint the old --synced/--off
// tint-and-border treatment onto aqua/terracotta (the duel pair).
const STATE_CLASS: Record<TileState, string> = {
  idle: 'bg-[var(--tile)] border-[var(--ink)] text-[var(--ink)] shadow-[0_5px_0_rgba(0,0,0,0.2)]',
  selected: 'bg-[var(--tile)] border-[var(--ink)] text-[var(--ink)] shadow-[0_5px_0_rgba(0,0,0,0.2)]',
  correct:
    'bg-[var(--aqua-tint)] border-[var(--aqua-deep)] text-[var(--ink)] shadow-[0_5px_0_var(--aqua-deep)]',
  wrong:
    'bg-[var(--terracotta-tint)] border-[var(--terracotta-deep)] text-[var(--ink)] opacity-90 shadow-[0_5px_0_var(--terracotta-deep)]',
  dim: 'bg-[var(--tile)] border-[var(--ink)] text-[var(--ink-soft)] opacity-60 shadow-[0_5px_0_rgba(0,0,0,0.1)]',
};

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-[3px]';

/* "Clay card" — hard border + drop shadow, --r-tile rounded. Interactive
   tiles are always a real <button> (native keyboard activation, no
   hand-rolled onKeyDown), non-interactive ones a <div> (e.g. a leaderboard
   row). Hover/active translate is a genuine addition on top of the locked
   TILE_PRESS scale feedback, not a replacement of it. */
export const Tile = ({
  state = 'idle',
  size = 'md',
  onClick,
  disabled = false,
  children,
  className = '',
  ariaLabel,
  style,
}: {
  state?: TileState;
  size?: TileSize;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}) => {
  const base = `flex min-h-11 w-full flex-col justify-center rounded-[var(--r-tile)] border-[var(--border-w)] text-left transition-[color,background-color,border-color,box-shadow,transform] ${STATE_CLASS[state]} ${SIZE_CLASS[size]} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        style={style}
        className={`${base} cursor-pointer disabled:cursor-default hover:-translate-y-0.5 active:translate-y-0.5 disabled:hover:translate-y-0 disabled:active:translate-y-0 ${TILE_PRESS} ${FOCUS_RING}`}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={base} style={style}>
      {children}
    </div>
  );
};

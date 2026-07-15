// SWARM SIGNAL Section 3 — the dot is the app's entire icon language. The
// crowd is always many small things; the player is one distinct ember dot,
// slightly larger, visibly joining or diverging from the swarm. Every reveal
// state pairs a hue with a SHAPE (filled / half / hollow) so meaning never
// rides on color alone (colorblind safety), and glyph-rendering quirks in
// test browsers can't scramble it the way a unicode ◐ would.

export type DotState = 'synced' | 'close' | 'offhive' | 'player';
export type DotSize = 'sm' | 'md' | 'lg';

// Real relative units (rem, driven by tokens.css's --size-dot-* custom
// properties) rather than a hardcoded px number, so a size like "lg" can be
// tuned in one place (tokens.css) and actually scales with root font-size
// instead of being pinned. --size-dot-lg was previously a bare `16` (px)
// here; this session's -30% ask is applied at the token, not here.
const SIZE_VAR: Record<DotSize, string> = {
  sm: 'var(--size-dot-sm)',
  md: 'var(--size-dot-md)',
  lg: 'var(--size-dot-lg)',
};

type Props = {
  state: DotState;
  size?: DotSize;
  className?: string;
};

export const Dot = ({ state, size = 'md', className }: Props) => {
  const base = SIZE_VAR[size];
  // The player dot is 1.4× the swarm dots so it separates as "one of us,
  // louder" rather than just another dot in the field.
  const length = state === 'player' ? `calc(${base} * 1.4)` : base;

  return (
    <svg
      style={{ width: length, height: length, display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
      viewBox="0 0 20 20"
      className={className}
      aria-hidden="true"
    >
      {/* P4 (UI/UX overhaul) — retargeted from the old --color-* dark-theme
          tokens to the new light-canvas tokens (--synced/--close/--off/
          --accent); the old --color-close specifically read as near-invisible
          on the new --canvas background (both pale warm tones). */}
      {state === 'synced' && <circle cx="10" cy="10" r="9" fill="var(--synced)" />}

      {state === 'close' && (
        <>
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--close)" strokeWidth="2" />
          {/* Left half filled — an SVG semicircle (radius matched to the
              outline), not the ◐ unicode glyph, which renders inconsistently
              in this project's test browsers. */}
          <path d="M10 2 A8 8 0 0 0 10 18 Z" fill="var(--close)" />
        </>
      )}

      {state === 'offhive' && (
        <circle cx="10" cy="10" r="8" fill="none" stroke="var(--off)" strokeWidth="2" />
      )}

      {state === 'player' && (
        // Gold — the one marker that's "you," same role as the spectrum
        // handle/heat-strip pin — with a thin tile-white ring so it
        // separates from any background.
        <circle cx="10" cy="10" r="8" fill="var(--gold)" stroke="var(--tile)" strokeWidth="1.4" />
      )}
    </svg>
  );
};

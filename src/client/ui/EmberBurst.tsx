import type { CSSProperties } from 'react';
import { hexPoints } from '../hexPoints';
import { EMBER_BURST, prefersReducedMotion } from '../motion';

const CHIP_COUNT = 8;
const DISTANCE = 40;
const CHIP_POINTS = hexPoints(5, 5, 5);

/* Tier-up only, one-shot: 8 hex chips fly out from the badge and fade.
   Reduced-motion renders a static accent dot instead of mounting the
   burst at all — never a frozen mid-animation frame. */
export const EmberBurst = ({ className = '' }: { className?: string }) => {
  if (prefersReducedMotion()) {
    return (
      <span
        className={`inline-block h-3 w-3 rounded-full bg-[var(--gold)] ${className}`}
        aria-hidden="true"
      />
    );
  }
  const chips = Array.from({ length: CHIP_COUNT }, (_, i) => {
    const angle = ((2 * Math.PI) / CHIP_COUNT) * i;
    return {
      key: i,
      dx: Math.cos(angle) * DISTANCE,
      dy: Math.sin(angle) * DISTANCE,
    };
  });
  return (
    <span
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      {chips.map((chip) => (
        <svg
          key={chip.key}
          width={10}
          height={10}
          viewBox="0 0 10 10"
          className={`absolute ${EMBER_BURST}`}
          style={{ '--dx': `${chip.dx}px`, '--dy': `${chip.dy}px` } as CSSProperties}
        >
          <polygon points={CHIP_POINTS} fill="var(--gold)" />
        </svg>
      ))}
    </span>
  );
};

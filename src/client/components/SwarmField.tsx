import type { CSSProperties } from 'react';

// SWARM SIGNAL Section 4 — the ambient identity texture: a field of small
// dots in the dark (the swarm), with a couple of ember points among them (the
// signal starting to concentrate). Deterministically scattered from the date
// string so the field is stable for a given day but shifts day to day. No
// animation by default (so it needs no reduced-motion pairing); on the splash
// only, a few dots get a slow opacity pulse. Purely decorative: pointer-events
// none, aria-hidden. Never placed behind round-play UI — focus beats texture
// during decisions.
//
// Rendered as absolutely-positioned round spans rather than SVG <circle>s so
// the dots stay perfectly round regardless of the (non-square) container
// aspect ratio — an SVG stretched to fill would render ellipses.

// Same LCG the project's seededRandom util uses, inlined here so the client
// bundle doesn't reach across into server/core for it.
const makeRng = (seed: string) => {
  let state = 0;
  for (let i = 0; i < seed.length; i++) state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  state = state || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

const DOT_COUNT = 55; // within the specced 40–70 band
const EMBER_COUNT = 3; // 2–3 ember signal dots

type SwarmDot = {
  left: number;
  top: number;
  size: number;
  ember: boolean;
  pulse: boolean;
};

const buildDots = (seed: string, pulse: boolean): SwarmDot[] => {
  const rng = makeRng(seed);
  const dots: SwarmDot[] = [];
  for (let i = 0; i < DOT_COUNT; i++) {
    dots.push({
      left: rng() * 100,
      top: rng() * 100,
      size: 3 + Math.round(rng() * 3), // 3–6px
      ember: i < EMBER_COUNT,
      // Splash only: 4–6 dots slow-pulse. Deterministic slice so it's stable.
      pulse: pulse && i >= EMBER_COUNT && i < EMBER_COUNT + 5,
    });
  }
  return dots;
};

type Props = {
  seed: string;
  pulse?: boolean;
  className?: string;
};

export const SwarmField = ({ seed, pulse = false, className }: Props) => {
  const dots = buildDots(seed, pulse);
  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`}>
      {dots.map((d, i) => {
        const style: CSSProperties = {
          left: `${d.left}%`,
          top: `${d.top}%`,
          width: `${d.size}px`,
          height: `${d.size}px`,
          // Always rendered on the dark canvas — ink-soft (a mid-dark gray
          // meant for white surfaces) would be near-invisible here.
          backgroundColor: d.ember ? 'var(--gold)' : 'var(--on-canvas-soft)',
          opacity: d.ember ? 0.25 : 0.15,
        };
        return (
          <span
            key={i}
            className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 ${
              d.pulse ? 'animate-swarm-pulse motion-reduce:animate-none' : ''
            }`}
            style={style}
          />
        );
      })}
    </div>
  );
};

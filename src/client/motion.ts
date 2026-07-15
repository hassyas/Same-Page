// Addendum B4 — centralized so "every tap responds" and "every screen
// enters consistently" are structural, not something to remember to apply
// screen by screen (that's exactly how the app ended up inconsistent).
// LOCKED (P2 UI/UX overhaul) — these 3 plus every `animate-*` keyframe in
// index.css that predates this pass carry live-confirmed reveal/withhold
// timing; do not change their values, only add alongside them.
export const TAP = 'active:scale-95 transition-transform duration-150';
export const ENTER = 'animate-reveal-in motion-reduce:animate-none';
export const CARD_IN = 'animate-card-in motion-reduce:animate-none';

// P2 additions — new primitives' motion, additive only.
export const REVEAL_FLIP = 'animate-reveal-flip motion-reduce:animate-none';
export const COUNT_POP = 'animate-count-pop motion-reduce:animate-none';
export const TILE_PRESS = 'active:scale-[0.97] transition-transform duration-[90ms] motion-reduce:transition-none';
export const EMBER_BURST = 'animate-ember-burst motion-reduce:animate-none';

/** 60ms/child stagger for RevealRow-style mount sequences. */
export function staggerDelay(index: number): { animationDelay: string } {
  return { animationDelay: `${index * 60}ms` };
}

/** Non-hook reduced-motion check for use outside React (audio/haptics). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

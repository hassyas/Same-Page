import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Addendum B1/B4 — numbers should count up, not just appear, so the reveal
// reads as motion/life rather than a static swap. Respects reduced-motion
// (B7) by snapping straight to the target instead of animating.
export const useCountUp = (target: number, durationMs = 700, delayMs = 0): number => {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame: number;
    let start: number | null = null;
    const from = 0;

    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // Ease-out cubic — fast start, gentle settle, reads as "counting down
      // to a stop" rather than a linear tick that feels mechanical.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (targetRef.current - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    const timeout = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, delayMs]);

  return value;
};

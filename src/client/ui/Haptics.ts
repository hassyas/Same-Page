// P2 — navigator.vibrate wrapper. Off by default; persisted separately from
// sound (localStorage.samepage.haptics) since a player may want one without
// the other. Silent no-op if vibrate is unsupported (most desktop browsers,
// and possibly Devvit's webview — see PROGRESS.md for the exact gap) or
// under prefers-reduced-motion.
import { prefersReducedMotion } from '../motion';

const STORAGE_KEY = 'samepage.haptics';

export function isHapticsEnabled(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'on';
}

export function setHapticsEnabled(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
}

function vibrate(pattern: number | number[]): void {
  if (!isHapticsEnabled()) return;
  if (prefersReducedMotion()) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

export const Haptics = {
  tap: (): void => vibrate(8),
  reveal: (correct: boolean): void => vibrate(correct ? [12] : [20, 40, 20]),
  tierUp: (): void => vibrate([10, 60, 10, 60, 20]),
};

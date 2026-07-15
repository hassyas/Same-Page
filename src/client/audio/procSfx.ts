// P2 — 6 short WebAudio-generated SFX, no binary assets. Off by default
// (first-time muted); persisted to localStorage so the toggle survives a
// reload. play() is a deliberate no-op when muted, when the tab is hidden,
// or under prefers-reduced-motion (sound is part of the same "motion" the
// user asked to reduce).
import { prefersReducedMotion } from '../motion';

export type SoundName = 'tap' | 'select' | 'reveal-correct' | 'reveal-wrong' | 'tier-up' | 'share';

const STORAGE_KEY = 'samepage.sound';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  return ctx;
}

function tone(
  audioCtx: AudioContext,
  freq: number,
  offsetSec: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  peakGain = 0.15
): void {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audioCtx.currentTime + offsetSec;
  const end = start + durationSec;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

const SOUNDS: Record<SoundName, (audioCtx: AudioContext) => void> = {
  tap: (audioCtx) => tone(audioCtx, 880, 0, 0.04),
  select: (audioCtx) => tone(audioCtx, 1046, 0, 0.06),
  'reveal-correct': (audioCtx) => {
    tone(audioCtx, 523, 0, 0.09);
    tone(audioCtx, 784, 0.09, 0.09);
  },
  'reveal-wrong': (audioCtx) => tone(audioCtx, 196, 0, 0.18, 'triangle'),
  'tier-up': (audioCtx) => {
    tone(audioCtx, 523.25, 0, 0.1);
    tone(audioCtx, 659.25, 0.1, 0.1);
    tone(audioCtx, 783.99, 0.2, 0.1);
  },
  share: (audioCtx) => tone(audioCtx, 1318, 0, 0.08),
};

export function isSoundEnabled(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'on';
}

export function setSoundEnabled(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
}

export function playSound(name: SoundName): void {
  if (!isSoundEnabled()) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (prefersReducedMotion()) return;
  const audioCtx = getContext();
  if (!audioCtx) return; // WebAudio unavailable in this runtime — silent no-op, not faked.
  try {
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    SOUNDS[name](audioCtx);
  } catch {
    // Same runtime-unavailable case surfacing at call time instead of construction time.
  }
}

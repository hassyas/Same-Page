import type { ReactNode } from 'react';
import { ENTER } from '../motion';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Tile } from '../ui/Tile';

type Props = {
  onDismiss: () => void;
  ctaLabel?: string;
};

// Small geometric flame mark (no emoji — the prototype's own mockup uses a
// 🔥 glyph here, which is exactly the anti-pattern this identity claims to
// avoid; built as an SVG instead, same treatment as HiveMark's geometric
// marks elsewhere in the app).
const FlameIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 1c1 4-3 5-3 9a3 3 0 0 0 6 0c1.5 1 2 3 2 4.5A5.5 5.5 0 0 1 6 14C6 8 12 6 12 1Z"
      fill="currentColor"
    />
  </svg>
);

const BarsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
    <rect x="2" y="14" width="4" height="10" rx="1.5" fill="currentColor" />
    <rect x="8" y="8" width="4" height="16" rx="1.5" fill="currentColor" />
    <rect x="14" y="2" width="4" height="22" rx="1.5" fill="currentColor" />
    <rect x="20" y="10" width="4" height="14" rx="1.5" fill="currentColor" />
  </svg>
);

// New pre-game explainer, gated on `user.totalPlayed === 0` in App.tsx so it
// only shows a first-time player once, before Round 1 — the not-yet-played
// splash's existing one-liner ("How well do you know this sub's mind?...")
// stays exactly as-is and still does its job (a <5s hook to tap Play in the
// tiny inline card). This screen precedes/supplements that line rather than
// replacing or repeating it: it's the fuller "how it actually works" pass,
// shown once the player has already committed to playing and has real room
// (the expanded view, not the fixed-height inline card) to read it in.
const sections: { title: string; body: string; iconBg: string; iconFg: string; icon: ReactNode }[] = [
  {
    title: 'Showdown',
    body: 'Pick which of two posts scored higher. Then bet how sure you are. Lock it in for bigger points, or Hedge to play it safe.',
    iconBg: 'var(--aqua-tint)',
    iconFg: 'var(--aqua-deep)',
    icon: <span className="font-mono font-bold text-sm">VS</span>,
  },
  {
    title: 'Pulse',
    body: "Don't share your own take. Bet on where the whole crowd lands.",
    iconBg: 'var(--terracotta-tint)',
    iconFg: 'var(--terracotta-deep)',
    icon: <BarsIcon />,
  },
  {
    title: 'Streaks',
    body: 'Come back daily. Your streak and rating climb the more you play.',
    iconBg: 'var(--gold-tint)',
    iconFg: 'var(--gold-deep)',
    icon: <FlameIcon />,
  },
  {
    title: 'The Decider',
    body: 'Round 5 always pays double. Make it count.',
    iconBg: 'var(--gold-tint)',
    iconFg: 'var(--gold-deep)',
    icon: <span className="font-mono font-bold text-sm">×2</span>,
  },
];

export const HowToPlay = ({ onDismiss, ctaLabel = "Let's play" }: Props) => {
  return (
    <div
      className={`flex flex-col gap-4 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4 text-center ${ENTER}`}
      style={{ color: 'var(--on-canvas)' }}
    >
      <div>
        {/* Same bare-var()-compiles-to-color bug as DailyResult's hero this
            session — no companion color class here either, so it was
            silently rendering unsized (inherits ~16px), not the intended
            28-40px. Fixed with the proven syntax. */}
        <h1 className="font-display font-bold text-(length:--size-h1)">How it works</h1>
        <p className="text-sm text-[var(--on-canvas-soft)] mt-1">Guess with the crowd, not against it.</p>
      </div>

      <div className="flex flex-col gap-2">
        {/* Icon moved from a small top-left badge to a full-height strip
            on the card's left edge (this session). `!p-0 overflow-hidden`
            cancels Tile's own default padding/rounded-corner clipping so
            the strip's background can run truly edge-to-edge instead of
            sitting inset inside Tile's normal content padding. */}
        {sections.map((s) => (
          <Tile key={s.title} size="md" className="!p-0 overflow-hidden text-left">
            <div className="flex items-stretch gap-3 min-h-16">
              <span
                className="flex w-14 shrink-0 items-center justify-center"
                style={{ background: s.iconBg, color: s.iconFg }}
              >
                {s.icon}
              </span>
              <div className="flex flex-col justify-center gap-0.5 py-3 pr-4">
                <p className="text-sm font-display font-bold text-[var(--ink)]">{s.title}</p>
                <p className="text-sm text-[var(--ink-soft)]">{s.body}</p>
              </div>
            </div>
          </Tile>
        ))}
      </div>

      <PrimaryButton variant="aqua" onClick={onDismiss} className="self-center">
        {ctaLabel}
      </PrimaryButton>
    </div>
  );
};

import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SwarmField } from './components/SwarmField';
import { useSlate } from './hooks/useSlate';
import { useUnlockCountdown } from './hooks/useUnlockCountdown';
import { ENTER } from './motion';
import { Lockup } from './brand/Lockup';
import { PrimaryButton } from './ui/PrimaryButton';
import { Countdown } from './ui/Countdown';
import { StreakRing } from './ui/StreakRing';
import { isRoundSynced } from '../shared/types';

// SWARM SIGNAL Section 5a — the judge's first impression, and the one surface
// bound by Devvit's real fixed-height inline card (documented clipping bug:
// content taller than the reserved slot is silently cut from the bottom, no
// scroll, no error — Blocker #6/#18). Keep this whole card deliberately
// compact: this is why `Lockup variant="stacked"` (the Global Rules' stated
// default for Splash) and the StatChip/StreakRing primitives are
// DELIBERATELY NOT used here — `inline` Lockup + a plain stat text row cost
// far less vertical budget, and this screen has already broken the core loop
// once from exactly this kind of growth. See PROGRESS.md for the full note.
// Item 4 (this session) — loading state should feel like part of the game,
// not a generic spinner. Cycled beneath the pulsing wordmark; kept as plain
// text swap (not a CSS animation) so it needs no reduced-motion gate of its
// own — only the wordmark's glow does.
const LOADING_PHRASES = ['Reading the room…', 'Counting votes…', 'Syncing with the crowd…'];

export const Splash = () => {
  const { loading, user, dayResult, subredditName } = useSlate();
  const [loadingPhrase, setLoadingPhrase] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => setLoadingPhrase((i) => (i + 1) % LOADING_PHRASES.length), 1200);
    return () => window.clearInterval(id);
  }, [loading]);
  const unlockCountdown = useUnlockCountdown();
  const subLabel = subredditName ? `r/${subredditName}` : 'this place';
  const seed = dayResult?.date ?? new Date().toISOString().slice(0, 10);

  const dayNumber = (user?.totalPlayed ?? 0) + (dayResult ? 0 : 1);

  // P5 retention — comeback ribbon: a streak that reset to 1 for a returning
  // player (not a first-ever day) gets one dismissible line instead of the
  // usual pitch line, so it costs zero extra height on this card. Dismiss is
  // client-only/session-scoped, matching this file's existing `introSeen`-
  // style convention elsewhere in the app (a reload showing it again is
  // correct, not a bug — same reasoning as App.tsx's intro gate).
  const isComeback = !dayResult && (user?.totalPlayed ?? 0) > 0 && (user?.streak ?? 0) === 1;
  const [comebackDismissed, setComebackDismissed] = useState(false);
  const showComeback = isComeback && !comebackDismissed;

  return (
    <div
      className="flex relative flex-col justify-center items-center gap-2 bg-[var(--canvas)] px-4 py-3 text-center h-full min-h-full overflow-hidden"
      style={{ color: 'var(--on-canvas)' }}
    >
      <SwarmField seed={seed} pulse />

      {loading ? (
        <div className="relative flex flex-col items-center gap-2" aria-label="Loading">
          {/* Reuses the existing ambient swarm-pulse utility (already tuned
              for a subtle idle glow, see its own comment in index.css)
              rather than adding a new keyframe. */}
          <Lockup variant="inline" size="sm" className="animate-swarm-pulse motion-reduce:animate-none" />
          <p className="text-xs text-[var(--on-canvas-soft)]">{LOADING_PHRASES[loadingPhrase]}</p>
        </div>
      ) : (
        <div className={`relative flex flex-col items-center gap-2 w-full ${ENTER}`}>
          {/* gap-2 (was gap-3) below trims 4px to offset the bigger
              wordmark's added height (Lockup.tsx WORDMARK_SIZE.sm 16→24,
              see comment there) — a Jackbox-style front-screen title needs
              real size, and this screen's fixed-height budget (Blocker
              #6/#18) can't just absorb it uncompensated. */}
          <Lockup variant="inline" size="sm" />

          {dayResult ? (
            // Fuller "already played" layout per the new bold identity's
            // prototype (index (1).html #splash-played) — a real, accepted
            // risk against Devvit's inline-card fixed-height clipping bug
            // (Blocker #6/#18); needs a live devvit playtest check before
            // this is considered safe. Nothing added beyond what the
            // prototype itself contains.
            <div className="flex flex-col items-center gap-2 w-full max-w-[300px] rounded-[var(--r-card)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--tile)] px-5 py-4 text-center shadow-[0_6px_0_rgba(0,0,0,0.25)]">
              <p className="text-xs font-mono font-bold uppercase tracking-wide text-[var(--ink-soft)]">
                Today's Result
              </p>
              <p className="font-display font-normal text-(length:--size-poster) leading-none text-[var(--ink)]">
                {dayResult.syncScore}
              </p>
              <p className="text-sm text-[var(--ink-soft)]">
                You read {dayResult.results.filter(isRoundSynced).length} of {dayResult.results.length} rounds the
                way the crowd did.
              </p>
              <StreakRing streak={user?.streak ?? 0} size={110} />
              {/* The escape hatch to full Daily Result — must stay visible
                  within the inline card's real bound. */}
              <PrimaryButton
                variant="terracotta"
                fluid
                onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
              >
                View today's report
              </PrimaryButton>
              <Countdown label={`Next slate in ${unlockCountdown}`} />
            </div>
          ) : (
            // Restored bold hero-card treatment per the mockup's #splash
            // (index (1).html) — aqua card holding the eyebrow/headline/
            // description/stat-chips, previously deliberately avoided here
            // (see this file's top comment) for height-budget safety.
            // REAL RISK, measured not guessed: this card alone adds an
            // estimated +102-126px versus the plain-text version it
            // replaces (headline ~50px for its likely 2-line wrap +
            // description 16px + 3 compact chips 20-44px depending on
            // whether they wrap to a 2nd row, + 32px card padding + 24px
            // internal gaps — chip-row wrap width couldn't be confirmed
            // without a real browser). Compensating cuts already made:
            // chips are a custom compact style (~20px tall), NOT the
            // heavier StatChip primitive (~30px tall) used elsewhere;
            // description reuses the existing pitch copy's short first
            // clause instead of a new line. This is still a large, real
            // net growth versus the old layout — see PROGRESS.md for the
            // full before/after numbers. **Check this screen live first.**
            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex flex-col items-center gap-2 w-full max-w-[300px] rounded-[var(--r-card)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--aqua)] px-5 py-4 text-center shadow-[0_6px_0_rgba(0,0,0,0.25)]">
                <p className="text-xs font-mono font-bold uppercase tracking-wide text-[var(--ink)]">{subLabel}</p>
                {showComeback ? (
                  <button
                    type="button"
                    onClick={() => setComebackDismissed(true)}
                    className="flex min-h-11 items-center rounded-[var(--r-pill)] border border-[var(--ink)] bg-[rgba(255,255,255,0.4)] px-3 text-xs font-bold text-[var(--ink)] active:scale-95 transition-transform duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-[3px]"
                  >
                    Welcome back. New streak: Day 1.
                  </button>
                ) : (
                  <>
                    <p className="font-display text-(length:--size-h2) leading-tight text-[var(--ink)]">
                      How well do you actually read {subLabel}?
                    </p>
                    <p className="text-xs text-[var(--ink)]">Five rounds. One question.</p>
                  </>
                )}
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="rounded-[var(--r-pill)] border border-[var(--ink)] bg-[rgba(255,255,255,0.4)] px-2.5 py-1 text-[10px] font-bold tabular-nums text-[var(--ink)]">
                    Day {dayNumber}
                  </span>
                  <span className="rounded-[var(--r-pill)] border border-[var(--ink)] bg-[rgba(255,255,255,0.4)] px-2.5 py-1 text-[10px] font-bold tabular-nums text-[var(--ink)]">
                    {user?.streak ?? 0}-day streak
                  </span>
                  <span className="rounded-[var(--r-pill)] border border-[var(--ink)] bg-[rgba(255,255,255,0.4)] px-2.5 py-1 text-[10px] font-bold tabular-nums text-[var(--ink)]">
                    Crowd Score {user?.rating ?? 1000}
                  </span>
                </div>
              </div>
              <PrimaryButton variant="terracotta" onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
                Play today's slate
              </PrimaryButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);

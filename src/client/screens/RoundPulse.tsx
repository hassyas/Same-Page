import { useEffect, useState } from 'react';
import type { RoundPulse as RoundPulseType, PulseResult } from '../../shared/types';
import { PULSE_SYNCED_THRESHOLD } from '../../shared/types';
import { useCountUp } from '../hooks/useCountUp';
import { useSound } from '../audio/useSound';
import { ENTER } from '../motion';
import { Tile } from '../ui/Tile';
import { PrimaryButton } from '../ui/PrimaryButton';

type Props = {
  round: RoundPulseType;
  index: number;
  total: number;
  combo: number;
  onAnswer: (value: number) => Promise<PulseResult>;
  onNext: () => void;
};

// Addendum B1 — same withheld beat as Showdown, so the distribution never
// appears before the player has committed. LOCKED (P4 UI/UX overhaul).
const WITHHOLD_MS = 380;

const BUCKET_COUNT = 10;

// Bold-clay identity — a density gradient (darker = more of the hive landed
// there) layered over the aqua→terracotta duel track, replacing the old
// per-bucket dot-swarm. Stops placed at BUCKET_COUNT evenly-spaced points
// (matching styles.css's own hand-authored example), alpha scaled to each
// bucket's share of the peak bucket.
const computeHeatGradient = (distribution: number[]): string => {
  const total = distribution.reduce((a, b) => a + b, 0) || 1;
  const shares = distribution.map((c) => c / total);
  const maxShare = Math.max(...shares) || 1;
  const stops = shares.map((s, i) => {
    const alpha = 0.05 + (s / maxShare) * 0.35;
    const pct = (i / (BUCKET_COUNT - 1)) * 100;
    return `rgba(20,21,26,${alpha.toFixed(2)}) ${pct.toFixed(1)}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
};

export const RoundPulse = ({ round, index, total, combo, onAnswer, onNext }: Props) => {
  const [value, setValue] = useState(50);
  const [result, setResult] = useState<PulseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const { play } = useSound();

  const isDecider = index === total - 1;

  const alignment = useCountUp(result?.alignment ?? 0, 600);
  const points = useCountUp(result?.points ?? 0, 600);

  useEffect(() => {
    if (revealed && result) play(result.alignment >= PULSE_SYNCED_THRESHOLD ? 'reveal-correct' : 'reveal-wrong');
  }, [revealed, result, play]);

  const submit = async () => {
    if (result || busy) return;
    setBusy(true);
    setAnswerError(false);
    play('tap');
    try {
      const r = await onAnswer(value);
      setResult(r);
      window.setTimeout(() => setRevealed(true), WITHHOLD_MS);
    } catch (err) {
      console.error('Failed to submit answer', err);
      setAnswerError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4"
      style={{ color: 'var(--on-canvas)' }}
    >
      <p className="text-xs text-center text-[var(--on-canvas-soft)] font-mono font-nums">
        Round {index + 1} of {total} · Pulse
      </p>
      {isDecider && (
        <p className="flex justify-center">
          {/* Ink-on-gold — reward/special-moment treatment, same as the
              tier-up pill. */}
          <span className="inline-flex items-center rounded-[var(--r-pill)] bg-[var(--gold)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--ink)]">
            The Decider, double stakes
          </span>
        </p>
      )}
      {combo >= 2 && (
        <p className="text-center text-xs font-semibold text-[var(--on-canvas-soft)] font-mono tabular-nums">
          {combo} in a row
        </p>
      )}
      <Tile size="lg">
        <p className="font-medium">{round.post.title}</p>
      </Tile>

      {/* Fun Patch item 4 — reframed as a bet on the hive, not the player's
          own opinion: the score rewards closeness to the crowd, so the
          question has to say that's what's being asked. */}
      <p className="text-xs text-center uppercase tracking-wide text-[var(--on-canvas-soft)]">
        Where does the crowd land on this?
      </p>
      <h2 className="font-display font-semibold text-center text-[var(--size-h2)]">{round.prompt}</h2>

      <div className="flex justify-between text-xs px-1">
        <span className="text-[var(--aqua)] font-bold">{round.leftLabel}</span>
        <span className="text-[var(--terracotta)] font-bold">{round.rightLabel}</span>
      </div>

      {!result ? (
        <>
          <p className="text-center font-display font-semibold tabular-nums">
            {value === 50 ? (
              <>Betting: right in the middle</>
            ) : (
              <>
                Betting: leaning{' '}
                <span className="text-[var(--on-canvas)] underline decoration-2 decoration-[var(--gold)] underline-offset-2">
                  {value < 50 ? round.leftLabel : round.rightLabel}
                </span>
                {' · '}
                {Math.round(Math.abs(value - 50) * 2)}%
              </>
            )}
          </p>
          <div className="relative">
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="pulse-slider w-full h-9"
            />
            {/* Neutral-center tick — anchors the 50% midpoint so dragging
                feels quantified, not arbitrary. */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-[var(--ink)]/50 pointer-events-none" />
          </div>
          <p className="text-xs text-center text-[var(--on-canvas-soft)] -mt-1">
            Drag toward how strongly you think the crowd leans. The middle is neutral
          </p>
          <PrimaryButton variant="aqua" onClick={submit} disabled={busy} className="mt-2 self-center">
            Lock it in
          </PrimaryButton>
          {answerError && (
            <p className="text-xs text-[var(--on-canvas-soft)] text-center">Couldn't submit. Try again.</p>
          )}
        </>
      ) : (
        <>
          {(() => {
            const modeBucket = result.distribution.indexOf(Math.max(...result.distribution));
            const modeLeftPercent = (modeBucket + 0.5) * (100 / BUCKET_COUNT);
            const playerLeftPercent = result.value;
            return (
              <div className="relative pt-8">
                {/* mode marker — where the crowd peaked */}
                {revealed && (
                  <div
                    className="absolute top-8 bottom-0 w-[3px] bg-[var(--ink)] opacity-50"
                    style={{ left: `${modeLeftPercent}%` }}
                  />
                )}
                <div className="h-14 rounded-[var(--r-pill)] border-[var(--border-w)] border-[var(--ink)] overflow-hidden relative">
                  <div
                    className="w-full h-full transition-opacity duration-300"
                    style={{
                      opacity: revealed ? 1 : 0,
                      background: `${computeHeatGradient(result.distribution)}, linear-gradient(90deg, var(--aqua) 0%, var(--surface-2) 50%, var(--terracotta) 100%)`,
                    }}
                  />
                </div>
                {/* your bet — vertically centered ON the bar (bar spans the
                    pt-8 offset to pt-8+h-14; center = pt-8 + (h-14 - h-7)/2),
                    mirroring how .pulse-slider's own thumb centers on its
                    track via a negative margin-top offset, not floating
                    above it. */}
                {revealed && (
                  <div
                    className="absolute top-[46px] w-7 h-7 -translate-x-1/2 rounded-full bg-[var(--gold)] border-[var(--border-w)] border-[var(--ink)] shadow-[0_3px_0_var(--gold-deep)] animate-marker-drop motion-reduce:animate-none"
                    style={{ left: `${playerLeftPercent}%` }}
                    title="Your bet"
                  />
                )}
                <p className="mt-2 text-center text-xs font-semibold text-[var(--on-canvas-soft)]">
                  Darker = more people picked here
                </p>
              </div>
            );
          })()}

          {!revealed && (
            <p className="text-sm text-center text-[var(--on-canvas-soft)] animate-pulse">Revealing…</p>
          )}

          {revealed && (
            <>
              {/* Addendum B1 — surprise stat is the headline of the reveal. */}
              <p
                className={`${ENTER} font-display font-semibold text-center text-[var(--size-h2)]`}
                style={{ animationDelay: '80ms' }}
              >
                {result.surpriseStat}
              </p>
              {/* Was a flat RevealPanel/RevealRow market-row (fine for
                  Showdown's 2 upvote counts, but reads as too small/flat
                  for Pulse's single headline stat). Now a real card, same
                  language as SharePoster's stat card (light --tile bg,
                  --ink border, rounded, drop shadow) rather than bare text
                  on the dark canvas — the app-wide "bare result stat"
                  sweep this session. */}
              <div className={ENTER} style={{ animationDelay: '200ms' }}>
                <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-1 rounded-[var(--r-card)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--tile)] px-5 py-4 shadow-[0_6px_0_rgba(0,0,0,0.2)] text-center">
                  <p className="text-xs font-bold text-[var(--ink-soft)]">Your guess</p>
                  {/* Was color-coded by alignment tier (--aqua-deep/--close/
                      --terracotta-deep) — the mid tier, --close (#8a9490,
                      a muted gray-green), is exactly the "lighter/gray
                      tone" reported this session. Per direct instruction,
                      switched to a flat pure --ink for max readability on
                      the cream --tile card, regardless of tier; the "Your
                      guess" label above and the reveal color-coding
                      elsewhere on this screen (heat-strip, mode marker) are
                      untouched. */}
                  <p className="font-display font-bold tabular-nums text-(length:--size-h1) text-[var(--ink)]">
                    {alignment}%
                  </p>
                  <p className="text-xs text-[var(--ink-soft)]">+{points} points</p>
                </div>
              </div>
              <PrimaryButton
                variant="aqua"
                onClick={onNext}
                className={`${ENTER} self-center`}
                style={{ animationDelay: '320ms' }}
              >
                Next round
              </PrimaryButton>
            </>
          )}
        </>
      )}
    </div>
  );
};

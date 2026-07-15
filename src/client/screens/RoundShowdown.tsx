import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { RoundShowdown as RoundShowdownType, ShowdownResult, ShowdownWager } from '../../shared/types';
import { Dot } from '../components/Dot';
import { useCountUp } from '../hooks/useCountUp';
import { useSound } from '../audio/useSound';
import { ENTER } from '../motion';
import { Tile, type TileState } from '../ui/Tile';
import { PrimaryButton } from '../ui/PrimaryButton';
import { RevealPanel } from '../ui/RevealPanel';
import { RevealRow } from '../ui/RevealRow';
import { SplitBar } from '../ui/SplitBar';

// Step 4.0 signature reveal visual, extended to Showdown — Pulse already has
// the hive-swarm dot reveal (a crowd settling into the distribution); until
// now Showdown's reveal was just a color/badge swap, the single most generic
// reveal pattern in the app (every trivia app has this). A small fixed swarm
// converges onto the winning card instead, same visual language, same
// animate-swarm-in keyframe, zero timing changes to the withhold beat/
// stagger this reuses. Positions are fixed (not randomized) so this stays
// deterministic and screenshot-stable. 4 dots (not more) — the winning card
// is compact, and Pulse's own dot swarm caps much higher per-bucket; this is
// a light accent converging onto a single winner, not a crowd visualization.
const SWARM_DOTS: Array<{ top: string; left: string; dx: number; dy: number; delay: number }> = [
  { top: '12%', left: '85%', dx: 22, dy: -18, delay: 0 },
  { top: '50%', left: '92%', dx: 28, dy: 4, delay: 40 },
  { top: '85%', left: '82%', dx: 20, dy: 20, delay: 80 },
  { top: '30%', left: '90%', dx: 26, dy: -8, delay: 120 },
];

type Props = {
  round: RoundShowdownType;
  index: number;
  total: number;
  combo: number;
  onAnswer: (pick: 'A' | 'B', wager: ShowdownWager) => Promise<ShowdownResult>;
  onNext: () => void;
};

// Addendum B1 — the withheld beat before colors/numbers land is the
// dopamine setup; don't skip it even though the network round-trip already
// adds some delay of its own (that delay is inconsistent, this is not).
// 450ms + an explicit "Revealing…" cue below, not just a border-color
// change — a subtle static change reads as a stall, not a deliberate pause.
// LOCKED (P4 UI/UX overhaul) — do not change this value.
const WITHHOLD_MS = 450;

export const RoundShowdown = ({ round, index, total, combo, onAnswer, onNext }: Props) => {
  // Fun Patch item 1 — confidence wager. Tapping a card no longer submits
  // immediately: it only stages a pick, then the wager choice is what
  // actually fires the (single) answer request, so pick+wager travel
  // together in one submission.
  //
  // FIX (bug report: once a card is picked, the other card can't be
  // selected instead — you're forced straight into Lock/Hedge). The card
  // tap handler and the Tiles' `disabled` prop were both gated on
  // `pendingPick`, which becomes truthy the instant ANY card is picked —
  // so a second tap on the other card was always blocked, even though no
  // wager (the actually-committing action) had happened yet. Both are now
  // gated on `wager` instead: a pick only locks once Lock/Hedge is pressed,
  // matching `selectWager`'s own existing commit-guard below.
  const [pendingPick, setPendingPick] = useState<'A' | 'B' | null>(null);
  const [wager, setWager] = useState<ShowdownWager | null>(null);
  const [result, setResult] = useState<ShowdownResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const { play } = useSound();

  const isDecider = index === total - 1;

  const scoreA = useCountUp(result?.postA.score ?? 0, 700);
  const scoreB = useCountUp(result?.postB.score ?? 0, 700);

  // Sound is opt-in/off-by-default and no-ops under reduced-motion — this
  // just fires at the same moment the visual reveal already does.
  useEffect(() => {
    if (revealed && result) play(result.correct ? 'reveal-correct' : 'reveal-wrong');
  }, [revealed, result, play]);

  const selectCard = (choice: 'A' | 'B') => {
    if (result || wager || busy) return;
    setPendingPick(choice);
  };

  // Guards against a rapid double-tap the same way `pick` used to: `wager`
  // is set synchronously before the `await`, so a second tap in the same
  // render frame sees it already set and bails — the round can't be
  // resubmitted with a different wager.
  const selectWager = async (choice: ShowdownWager) => {
    if (!pendingPick || wager || busy) return;
    setWager(choice);
    setBusy(true);
    setAnswerError(false);
    play('tap');
    try {
      const r = await onAnswer(pendingPick, choice);
      setResult(r);
      window.setTimeout(() => setRevealed(true), WITHHOLD_MS);
    } catch (err) {
      console.error('Failed to submit answer', err);
      // Reset wager (not pendingPick) so the same Lock/Hedge buttons work as
      // the retry — the player's card pick survives, only the wager tap
      // needs repeating.
      setWager(null);
      setAnswerError(true);
    } finally {
      setBusy(false);
    }
  };

  const isWinnerSide = (side: 'A' | 'B'): boolean =>
    !!result &&
    ((side === 'A' && result.postA.score >= result.postB.score) ||
      (side === 'B' && result.postB.score > result.postA.score));

  // Same visual state machine as the pre-overhaul `cardClass`, mapped onto
  // Tile's 5-state enum: a picked-but-lost card stays 'idle' (not 'wrong')
  // on purpose — the ✕ badge carries that signal, so off-hive color never
  // floods a whole card (Section 5b).
  const tileStateFor = (side: 'A' | 'B'): TileState => {
    if (!result) {
      if (!pendingPick) return 'idle';
      return pendingPick === side ? 'selected' : 'dim';
    }
    if (!revealed) {
      return result.pick === side ? 'selected' : 'dim';
    }
    if (isWinnerSide(side)) return 'correct';
    if (result.pick === side) return 'idle';
    return 'dim';
  };

  // Section 3 — the ✓/✕ text badges stay (colorblind-confirmed). Rendered as
  // a RevealRow delta chip now (the "market row" reveal layer), each
  // preceded by a sm dot whose SHAPE (filled vs hollow) carries the
  // higher/lower signal independent of color.
  const badgeFor = (side: 'A' | 'B'): string | undefined => {
    if (!revealed || !result) return undefined;
    if (isWinnerSide(side)) return '✓ Higher';
    if (result.pick === side) return '✕ Lower';
    return undefined;
  };

  // Fun Patch item 1 — reveal copy acknowledges the wager: locked+correct
  // is the biggest celebration, locked+wrong stays "that's the game" per
  // Addendum B1 (wrong = interesting, not punishing), never a scold.
  // Split into label + number (this session, matching the mockup's
  // showdown-reveal card: a small eyebrow label above a big standalone
  // stat number, not one combined sentence) — the number itself is always
  // just `result.points`, so the label no longer needs to embed it.
  const wagerLabel = (): string => {
    if (!result) return '';
    const w = wager ?? 'hedge';
    if (w === 'lock') {
      return result.correct ? 'Locked in. Called it.' : "Bold call. Didn't land. That's the game.";
    }
    return result.correct ? 'Hedged, and it still paid.' : 'Hedged. Kept some back.';
  };

  // Fun Patch item 3 — margin framing, derived from the two real scores'
  // ratio. Guards the divide-by-zero edge (a post with 0 upvotes).
  const marginLine = (): string => {
    if (!result) return '';
    const hi = Math.max(result.postA.score, result.postB.score);
    const lo = Math.min(result.postA.score, result.postB.score);
    const ratio = lo === 0 ? Infinity : hi / lo;
    if (ratio >= 3) return 'Not even close. The crowd crushed this one.';
    if (ratio <= 1.15) return 'Razor thin. This was basically a coin flip.';
    return 'A real gap, but not a total blowout.';
  };

  return (
    <div
      className="flex flex-col gap-4 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4"
      style={{ color: 'var(--on-canvas)' }}
    >
      <p className="text-xs text-center text-[var(--on-canvas-soft)] font-mono font-nums">
        Round {index + 1} of {total} · Showdown
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
      <h2 className="font-display font-semibold text-center text-[var(--size-h2)]">Which scored higher?</h2>

      <Tile
        state={tileStateFor('A')}
        size="lg"
        onClick={() => selectCard('A')}
        disabled={busy || !!result || !!wager}
        className="relative overflow-hidden"
      >
        <p className="font-medium">{round.postA.title}</p>
        {revealed && isWinnerSide('A') && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {SWARM_DOTS.map((d, i) => (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--synced)]/70 animate-swarm-in motion-reduce:animate-none"
                style={
                  {
                    top: d.top,
                    left: d.left,
                    '--dx': `${d.dx}px`,
                    '--dy': `${d.dy}px`,
                    animationDelay: `${d.delay}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
      </Tile>

      <Tile
        state={tileStateFor('B')}
        size="lg"
        onClick={() => selectCard('B')}
        disabled={busy || !!result || !!wager}
        className="relative overflow-hidden"
      >
        <p className="font-medium">{round.postB.title}</p>
        {revealed && isWinnerSide('B') && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {SWARM_DOTS.map((d, i) => (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--synced)]/70 animate-swarm-in motion-reduce:animate-none"
                style={
                  {
                    top: d.top,
                    left: d.left,
                    '--dx': `${d.dx}px`,
                    '--dy': `${d.dy}px`,
                    animationDelay: `${d.delay}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        )}
      </Tile>

      {revealed && result && (
        <SplitBar
          leftPercent={result.percentCorrect}
          leftLabel={`${result.percentCorrect}% got it`}
          rightLabel={`${100 - result.percentCorrect}% didn't`}
        />
      )}

      {pendingPick && !result && (
        <div className={`flex flex-col items-center gap-3 mt-2 text-center ${ENTER}`}>
          <p className="text-sm text-[var(--on-canvas-soft)]">How sure are you?</p>
          {/* Label text bumped 16px (Tailwind's inherited default, no
              size class was set here before — confirmed via PrimaryButton.tsx,
              which sets no font-size of its own) -> 19px, +18.75%, inside
              the requested 15-20% range. h-12/px-6 (48px tall, 24px
              horizontal padding) left untouched — checked, 19px text has
              plenty of headroom inside a 48px-tall button and doesn't
              overflow either label at its current width. */}
          <div className="flex gap-3">
            <PrimaryButton
              variant="aqua"
              onClick={() => selectWager('lock')}
              disabled={busy}
              className="text-[19px]"
            >
              Lock it in
            </PrimaryButton>
            <PrimaryButton
              variant="terracotta"
              onClick={() => selectWager('hedge')}
              disabled={busy}
              className="text-[19px]"
            >
              Hedge
            </PrimaryButton>
          </div>
          <p className="text-xs tabular-nums font-mono font-nums text-[var(--on-canvas-soft)]">
            {isDecider
              ? 'Lock: +300 right / +0 wrong · Hedge: +150 right / +50 wrong'
              : 'Lock: +150 right / +0 wrong · Hedge: +75 right / +25 wrong'}
          </p>
          {answerError && <p className="text-xs text-[var(--on-canvas-soft)]">Couldn't submit. Try again.</p>}
        </div>
      )}

      {result && !revealed && (
        <p className="text-sm text-center text-[var(--on-canvas-soft)] animate-pulse mt-2">Revealing…</p>
      )}

      {revealed && result && (
        <div className="flex flex-col items-center gap-3 mt-2 text-center">
          {/* Addendum B1 — the surprise stat IS the headline of the reveal,
              not a footnote below the correct/incorrect line. */}
          <p
            className={`${ENTER} font-display font-semibold text-[var(--size-h2)]`}
            style={{ animationDelay: '80ms' }}
          >
            {result.surpriseStat}
          </p>
          {/* Result summary card — matches the mockup's showdown-reveal
              card exactly: themed tint background + deep-color border/
              shadow (aqua on a correct pick, terracotta on incorrect,
              mirroring the app's own existing card-choice.correct/
              .incorrect convention rather than inventing a new color
              rule), holding a small eyebrow label above a big standalone
              number — same font-mono tabular-nums treatment DailyResult's
              hero sync score uses, instead of one combined sentence. */}
          <div
            className={`${ENTER} flex w-full max-w-xs flex-col items-center gap-1 rounded-[var(--r-card)] border-[var(--border-w)] px-5 py-4`}
            style={{
              animationDelay: '200ms',
              background: result.correct ? 'var(--aqua-tint)' : 'var(--terracotta-tint)',
              borderColor: result.correct ? 'var(--aqua-deep)' : 'var(--terracotta-deep)',
              boxShadow: `0 6px 0 ${result.correct ? 'var(--aqua-deep)' : 'var(--terracotta-deep)'}`,
            }}
          >
            <p
              className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wide"
              style={{ color: result.correct ? 'var(--aqua-deep)' : 'var(--terracotta-deep)' }}
            >
              <Dot state={result.correct ? 'synced' : 'offhive'} size="sm" />
              {wagerLabel()}
            </p>
            <p
              className="font-display font-bold tabular-nums text-(length:--size-mono-lg)"
              style={{ color: result.correct ? 'var(--aqua-deep)' : 'var(--terracotta-deep)' }}
            >
              +{result.points}
            </p>
            {/* Mockup's `.text-soft` maps to --ink-soft-2, not --ink-soft —
                matched exactly rather than reusing the app's other
                slightly-lighter soft token. */}
            <p className="text-xs text-[var(--ink-soft-2)]">{marginLine()}</p>
          </div>
          {/* Individual post score rows now render below the result
              summary card (were above it) — the summary is the headline
              moment, the per-post breakdown is supporting detail. */}
          <RevealPanel label="Reveal">
            <RevealRow
              title={
                <>
                  <Dot state={isWinnerSide('A') ? 'synced' : 'offhive'} size="sm" />
                  {round.postA.title}
                </>
              }
              value={`${scoreA.toLocaleString()}`}
              delta={badgeFor('A')}
              valueColor={isWinnerSide('A') ? 'var(--synced)' : undefined}
            />
            <RevealRow
              title={
                <>
                  <Dot state={isWinnerSide('B') ? 'synced' : 'offhive'} size="sm" />
                  {round.postB.title}
                </>
              }
              value={`${scoreB.toLocaleString()}`}
              delta={badgeFor('B')}
              valueColor={isWinnerSide('B') ? 'var(--synced)' : undefined}
            />
          </RevealPanel>
          <PrimaryButton onClick={onNext} className={ENTER} style={{ animationDelay: '440ms' }}>
            Next round
          </PrimaryButton>
        </div>
      )}
    </div>
  );
};

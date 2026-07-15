import { useRef, useState } from 'react';
import { useSlate } from './hooks/useSlate';
import { RoundShowdown } from './screens/RoundShowdown';
import { RoundPulse } from './screens/RoundPulse';
import { DailyResult } from './screens/DailyResult';
import { Leaderboard } from './screens/Leaderboard';
import { SubmitRound } from './screens/SubmitRound';
import { HowToPlay } from './screens/HowToPlay';
import type { Answer, ShowdownResult, PulseResult } from '../shared/types';
import { PULSE_SYNCED_THRESHOLD } from '../shared/types';
import { CARD_IN, ENTER } from './motion';
import { SkeletonTile } from './ui/SkeletonTile';
import { ErrorState } from './ui/ErrorState';

type View = 'play' | 'leaderboard' | 'submit' | 'howto';

export const App = () => {
  const { loading, slate, user, dayResult, subredditName, answerRound, completeSlate, shareComment, retry } =
    useSlate();
  const [roundIndex, setRoundIndex] = useState(0);
  const [view, setView] = useState<View>('play');
  const answersRef = useRef<Answer[]>([]);
  const [completing, setCompleting] = useState(false);
  // Fun Patch item 3 — within-slate combo chip: consecutive synced rounds,
  // display-only, resets on any miss and naturally resets each slate since
  // this state doesn't survive a fresh app mount.
  const [combo, setCombo] = useState(0);
  // Pre-game explainer: shown once before Round 1, only for a player who has
  // never completed a day (`totalPlayed === 0`). Client-only — this flag
  // doesn't need to survive a reload/remount, since a first-timer reopening
  // the post mid-way still has `totalPlayed === 0` and would see it again,
  // which is the correct behavior (they haven't finished round 1 yet either).
  const [introSeen, setIntroSeen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
        <div className="flex w-full max-w-sm flex-col gap-3 px-4">
          <SkeletonTile size="lg" />
          <SkeletonTile />
          <SkeletonTile />
        </div>
      </div>
    );
  }

  if (dayResult) {
    if (view === 'leaderboard') {
      return (
        <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
          <div key="leaderboard" className={ENTER}>
            <Leaderboard onBack={() => setView('play')} subredditName={subredditName} />
          </div>
        </div>
      );
    }
    if (view === 'submit') {
      return (
        <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
          <div key="submit" className={ENTER}>
            <SubmitRound onBack={() => setView('play')} subredditName={subredditName} />
          </div>
        </div>
      );
    }
    if (view === 'howto') {
      return (
        <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
          <div key="howto">
            <HowToPlay onDismiss={() => setView('play')} ctaLabel="Back to results" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
        <div key="daily-result" className={ENTER}>
          <DailyResult
            dayResult={dayResult}
            user={user}
            onGoLeaderboard={() => setView('leaderboard')}
            onGoSubmit={() => setView('submit')}
            onGoHowTo={() => setView('howto')}
            onShareComment={shareComment}
          />
        </div>
      </div>
    );
  }

  if (!slate) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
        <div className="w-full max-w-sm px-4">
          <ErrorState code="slate:unavailable" onRetry={() => void retry()} />
        </div>
      </div>
    );
  }

  if ((user?.totalPlayed ?? 0) === 0 && !introSeen) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
        <HowToPlay onDismiss={() => setIntroSeen(true)} />
      </div>
    );
  }

  const round = slate.rounds[roundIndex];
  const isLastRound = roundIndex === slate.rounds.length - 1;

  if (!round) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
        <div className="w-full max-w-sm px-4">
          <ErrorState code="round:not-found" onRetry={() => void retry()} />
        </div>
      </div>
    );
  }

  const advance = async () => {
    if (!isLastRound) {
      setRoundIndex((i) => i + 1);
      return;
    }
    setCompleting(true);
    try {
      await completeSlate(answersRef.current);
    } finally {
      setCompleting(false);
    }
  };

  if (completing) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
        <p className="text-[var(--on-canvas-soft)] animate-pulse">Reading the swarm…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--canvas)] py-8">
      {/* Addendum B4 — "turning a card, not a page reload": this wrapper is
          keyed on roundIndex so every round advance remounts it and replays
          the card-in slide, giving the slate momentum instead of a cut. */}
      <div key={roundIndex} className={CARD_IN}>
        {round.type === 'showdown' ? (
          <RoundShowdown
            round={round}
            index={roundIndex}
            total={slate.rounds.length}
            combo={combo}
            onAnswer={async (pick, wager) => {
              const answer: Answer = { type: 'showdown', roundId: round.roundId, pick, wager };
              const result = (await answerRound(answer)) as ShowdownResult;
              answersRef.current = [...answersRef.current, answer];
              setCombo((c) => (result.correct ? c + 1 : 0));
              return result;
            }}
            onNext={advance}
          />
        ) : (
          <RoundPulse
            round={round}
            index={roundIndex}
            total={slate.rounds.length}
            combo={combo}
            onAnswer={async (value) => {
              const answer: Answer = { type: 'pulse', roundId: round.roundId, value };
              const result = (await answerRound(answer)) as PulseResult;
              answersRef.current = [...answersRef.current, answer];
              setCombo((c) => (result.alignment >= PULSE_SYNCED_THRESHOLD ? c + 1 : 0));
              return result;
            }}
            onNext={advance}
          />
        )}
      </div>
    </div>
  );
};

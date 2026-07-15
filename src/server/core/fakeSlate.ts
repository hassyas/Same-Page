import type {
  Answer,
  DailySlate,
  Round,
  RoundResult,
  ShowdownAnswer,
  ShowdownPost,
  PulseAnswer,
} from '../../shared/types';
import { getCorpus } from './corpus';
import { buildMatchups } from './matchup';
import { recordPulseVote, getBlendedDistribution, bucketIndex } from './pulseAgg';
import { buildPulseSeeds, getDefaultSeedDistribution } from './pulseRounds';
import { recordShowdownAnswer, getPercentCorrect } from './showdownAgg';
import { showdownSurpriseStat, pulseSurpriseStat } from './surpriseStats';
import { getSlateDate } from './slateDate';
export { getSlateDate } from './slateDate';

type HiddenShowdown = {
  type: 'showdown';
  roundId: string;
  postA: ShowdownPost;
  postB: ShowdownPost;
};

type HiddenPulse = {
  type: 'pulse';
  roundId: string;
  spectrumId: string;
  post: { id: string; title: string; thumb: string };
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  // 10 buckets covering 0-100 in steps of 10, hand-authored baseline vote
  // counts — real votes (pulse:{spectrumId}:agg) are blended on top of this.
  seedDistribution: number[];
};

type HiddenRound = HiddenShowdown | HiddenPulse;

const SHOWDOWN_ROUND_IDS = ['sd-1', 'sd-2', 'sd-3'];
const PULSE_ROUND_IDS = ['pl-1', 'pl-2'];

// Fun Patch item 1 — confidence wager. Lock has more upside AND more
// downside than Hedge, so the choice is a real risk-management tradeoff,
// not a strictly-dominant option. No negative points: rating math (game.ts)
// and the +2 daily floor both assume every round contributes >= 0.
const WAGER_POINTS = {
  lock: { correct: 150, wrong: 0 },
  hedge: { correct: 75, wrong: 25 },
} as const;

// No stored "daily:{date}" doc needed since the whole slate is a pure
// function of (corpus, date) — see slateDate.ts for the date seed itself.

const buildShowdownRounds = async (
  pool: ShowdownPost[],
  date: string
): Promise<HiddenShowdown[]> => {
  const pairs = buildMatchups(pool, SHOWDOWN_ROUND_IDS.length, date);
  return pairs.map(([postA, postB], i) => ({
    type: 'showdown' as const,
    roundId: SHOWDOWN_ROUND_IDS[i]!,
    postA,
    postB,
  }));
};

// Corpus-driven Pulse (Addendum A2): a real subreddit post + an evergreen
// spectrum template, picked deterministically per day. Prefers posts not
// already used in today's Showdown matchups so the slate doesn't repeat.
const buildPulseRounds = (
  pool: ShowdownPost[],
  usedPostIds: Set<string>,
  date: string
): HiddenPulse[] => {
  const seeds = buildPulseSeeds(pool, usedPostIds, PULSE_ROUND_IDS.length, date);
  return seeds.map((seed, i) => ({
    type: 'pulse' as const,
    roundId: PULSE_ROUND_IDS[i]!,
    spectrumId: seed.spectrumId,
    post: seed.post,
    prompt: seed.question,
    leftLabel: seed.leftLabel,
    rightLabel: seed.rightLabel,
    seedDistribution: getDefaultSeedDistribution(),
  }));
};

const getHiddenRounds = async (date: string): Promise<HiddenRound[]> => {
  const pool = await getCorpus();
  const showdownRounds = await buildShowdownRounds(pool, date);
  const usedPostIds = new Set(showdownRounds.flatMap((r) => [r.postA.id, r.postB.id]));
  const pulseRounds = buildPulseRounds(pool, usedPostIds, date);
  return [...showdownRounds, ...pulseRounds];
};

export const getTodaysSlate = async (): Promise<DailySlate> => {
  const date = getSlateDate();
  const hiddenRounds = await getHiddenRounds(date);
  const rounds: Round[] = hiddenRounds.map((r) => {
    if (r.type === 'showdown') {
      const { score: _scoreA, ...postA } = r.postA;
      const { score: _scoreB, ...postB } = r.postB;
      return { type: 'showdown', roundId: r.roundId, postA, postB };
    }
    return {
      type: 'pulse',
      roundId: r.roundId,
      spectrumId: r.spectrumId,
      post: r.post,
      prompt: r.prompt,
      leftLabel: r.leftLabel,
      rightLabel: r.rightLabel,
    };
  });
  return { date, rounds };
};

const distributionMean = (distribution: number[]): number => {
  const bucketWidth = 100 / distribution.length;
  let weightedSum = 0;
  let total = 0;
  distribution.forEach((count, i) => {
    const bucketMid = i * bucketWidth + bucketWidth / 2;
    weightedSum += bucketMid * count;
    total += count;
  });
  return total === 0 ? 50 : weightedSum / total;
};

// `record` controls whether this call writes into the real aggregates
// (showdown:{date}:{roundId}:agg / pulse:{spectrumId}:agg) — must happen
// exactly once per answer. /round/answer (the first and only time a given
// answer is submitted) is the one caller that records; /slate/complete
// re-scores from already-recorded state for the final commit, so it must
// not record again.
// Exported for the standalone scoring-simulation harness (tools/simulate) —
// no behavior change, just visibility.
export const computeShowdownResult = async (
  hidden: HiddenShowdown,
  answer: ShowdownAnswer,
  date: string,
  record: boolean,
  isDecider: boolean
): Promise<RoundResult> => {
  const higherIsA = hidden.postA.score >= hidden.postB.score;
  const correct = (answer.pick === 'A') === higherIsA;
  if (record) {
    await recordShowdownAnswer(date, hidden.roundId, correct);
  }
  const percentCorrect = await getPercentCorrect(date, hidden.roundId);
  const tier = WAGER_POINTS[answer.wager];
  const basePoints = correct ? tier.correct : tier.wrong;
  return {
    type: 'showdown',
    roundId: hidden.roundId,
    pick: answer.pick,
    correct,
    points: isDecider ? basePoints * 2 : basePoints,
    postA: hidden.postA,
    postB: hidden.postB,
    percentCorrect,
    surpriseStat: showdownSurpriseStat(percentCorrect, correct),
  };
};

// Exported for the standalone scoring-simulation harness (tools/simulate) —
// no behavior change, just visibility.
export const computePulseResult = async (
  hidden: HiddenPulse,
  answer: PulseAnswer,
  record: boolean,
  isDecider: boolean
): Promise<RoundResult> => {
  const value = Math.min(100, Math.max(0, answer.value));
  if (record) {
    await recordPulseVote(hidden.spectrumId, value);
  }
  const distribution = await getBlendedDistribution(hidden.spectrumId, hidden.seedDistribution);
  const mean = distributionMean(distribution);
  const distance = Math.abs(value - mean);
  const alignment = Math.max(0, Math.round(100 - distance * 1.5));

  const total = distribution.reduce((sum, count) => sum + count, 0);
  const playerBucket = bucketIndex(value);
  const peerPercent = total === 0 ? 0 : Math.round((distribution[playerBucket]! / total) * 100);

  return {
    type: 'pulse',
    roundId: hidden.roundId,
    post: hidden.post,
    prompt: hidden.prompt,
    leftLabel: hidden.leftLabel,
    rightLabel: hidden.rightLabel,
    value,
    alignment,
    points: isDecider ? alignment * 2 : alignment,
    distribution,
    peerPercent,
    surpriseStat: pulseSurpriseStat(peerPercent),
  };
};

const resultForAnswer = async (
  hidden: HiddenRound,
  answer: Answer,
  date: string,
  record: boolean,
  isDecider: boolean
): Promise<RoundResult | null> => {
  if (hidden.type === 'showdown' && answer.type === 'showdown') {
    return computeShowdownResult(hidden, answer, date, record, isDecider);
  }
  if (hidden.type === 'pulse' && answer.type === 'pulse') {
    return computePulseResult(hidden, answer, record, isDecider);
  }
  return null;
};

// Fetches the hidden rounds once and scores every answer against it, so
// scoring a full slate doesn't refetch/rebuild the corpus per answer.
export const computeResults = async (
  answers: Answer[],
  record = false
): Promise<(RoundResult | null)[]> => {
  const date = getSlateDate();
  const hiddenRounds = await getHiddenRounds(date);
  const byRoundId = new Map(hiddenRounds.map((r) => [r.roundId, r]));
  // Fun Patch item 2 — "The Decider": the slate's fixed final round is a
  // stakes-doubled finale, whichever round type happens to land there.
  // Position-based, not type-based, so this stays correct if the round mix
  // (currently always sd-1..3, pl-1..2) ever changes.
  const deciderRoundId = hiddenRounds[hiddenRounds.length - 1]?.roundId;
  return Promise.all(
    answers.map((answer) => {
      const hidden = byRoundId.get(answer.roundId);
      if (!hidden) return null;
      return resultForAnswer(hidden, answer, date, record, hidden.roundId === deciderRoundId);
    })
  );
};

export const computeResult = async (
  answer: Answer,
  record = true
): Promise<RoundResult | null> => {
  const [result] = await computeResults([answer], record);
  return result ?? null;
};

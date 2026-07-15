import { redis } from '@devvit/web/server';

const aggKey = (date: string, roundId: string) => `showdown:${date}:${roundId}:agg`;

// Same low-N smoothing spirit as Pulse's seed distribution (Addendum B6) —
// without it, the very first player of the day would see a jarring 0% or
// 100%. Baseline assumes a plausible "a few early players, ~60% correct".
const BASELINE_CORRECT = 3;
const BASELINE_TOTAL = 5;

export const recordShowdownAnswer = async (
  date: string,
  roundId: string,
  correct: boolean
): Promise<void> => {
  const key = aggKey(date, roundId);
  await redis.hIncrBy(key, 'total', 1);
  if (correct) await redis.hIncrBy(key, 'correct', 1);
};

export const getPercentCorrect = async (date: string, roundId: string): Promise<number> => {
  const data = await redis.hGetAll(aggKey(date, roundId));
  const total = Number(data.total ?? 0) + BASELINE_TOTAL;
  const correct = Number(data.correct ?? 0) + BASELINE_CORRECT;
  return Math.round((correct / total) * 100);
};

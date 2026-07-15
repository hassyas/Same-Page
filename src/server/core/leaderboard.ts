import { redis, reddit } from '@devvit/web/server';
import type { LeaderboardBoard, LeaderboardRow } from '../../shared/types';

const ALLTIME_KEY = 'leaderboard:alltime';
const WEEK_TTL_SECONDS = 14 * 24 * 60 * 60;
const DAY_TTL_SECONDS = 2 * 24 * 60 * 60;
const TOP_N = 10;

// Monday (UTC) of the current week, used as the weekly leaderboard's key —
// a new key every week means old weeks just age out (see WEEK_TTL_SECONDS).
const weekKey = (): string => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diffToMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return `leaderboard:week:${d.toISOString().slice(0, 10)}`;
};

// Exported so digest.ts's daily-recap can enumerate the same day's players
// without a second, possibly-drifting definition of the key.
export const dayKey = (date: string): string => `leaderboard:day:${date}`;

export const recordAllTimeRating = async (userId: string, rating: number): Promise<void> => {
  await redis.zAdd(ALLTIME_KEY, { member: userId, score: rating });
};

export const recordWeeklyScore = async (userId: string, syncScore: number): Promise<void> => {
  const key = weekKey();
  await redis.zIncrBy(key, userId, syncScore);
  await redis.expire(key, WEEK_TTL_SECONDS);
};

// Addendum B5 — near-miss framing ("you were N off from topping the hive
// today") needs a *daily* score dimension, which neither the all-time
// (rating) nor weekly (cumulative) board represents. Reuses the exact
// zIncrBy+expire pattern recordWeeklyScore already established, just keyed
// by day with a much shorter TTL since only "today" is ever read.
export const recordDailyScore = async (userId: string, syncScore: number, date: string): Promise<void> => {
  const key = dayKey(date);
  await redis.zIncrBy(key, userId, syncScore);
  await redis.expire(key, DAY_TTL_SECONDS);
};

// Must be called after recordDailyScore for this user/date so the current
// top reflects this user's own just-committed score. Returns 0 if this
// user IS today's top scorer.
export const getDailyGapToTop = async (date: string, syncScore: number): Promise<number> => {
  const top = await redis.zRange(dayKey(date), 0, 0, { by: 'rank', reverse: true });
  const topScore = top[0]?.score ?? syncScore;
  return Math.max(0, topScore - syncScore);
};

// Reddit user IDs are always `t2_...` — context.userId (the only source we
// ever pass in here) is guaranteed well-formed, but guard anyway before
// spending an API call on a malformed ID rather than relying solely on the
// try/catch below.
const isPlausibleUserId = (userId: string): boolean => /^t2_[a-z0-9]+$/i.test(userId);

const resolveUsername = async (userId: string): Promise<string> => {
  if (!isPlausibleUserId(userId)) return 'a crowd member';
  try {
    const user = await reddit.getUserById(userId as Parameters<typeof reddit.getUserById>[0]);
    return user?.username ? `u/${user.username}` : 'a crowd member';
  } catch (error) {
    console.error('Leaderboard: failed to resolve username for', userId, error);
    return 'a crowd member';
  }
};

const buildBoard = async (key: string, selfUserId: string): Promise<LeaderboardBoard> => {
  const [entries, cardinality, selfScore, selfRankAsc] = await Promise.all([
    redis.zRange(key, 0, TOP_N - 1, { by: 'rank', reverse: true }),
    redis.zCard(key),
    redis.zScore(key, selfUserId),
    redis.zRank(key, selfUserId),
  ]);

  const top: LeaderboardRow[] = await Promise.all(
    entries.map(async (entry, i) => ({
      userId: entry.member,
      username: await resolveUsername(entry.member),
      score: entry.score,
      rank: i + 1,
    }))
  );

  let self: LeaderboardRow | null = null;
  if (selfScore !== undefined && selfRankAsc !== undefined) {
    const existing = top.find((row) => row.userId === selfUserId);
    self = existing ?? {
      userId: selfUserId,
      username: await resolveUsername(selfUserId),
      score: selfScore,
      rank: cardinality - selfRankAsc,
    };
  }

  return { top, self };
};

export const getAllTimeBoard = (selfUserId: string): Promise<LeaderboardBoard> =>
  buildBoard(ALLTIME_KEY, selfUserId);

export const getWeeklyBoard = (selfUserId: string): Promise<LeaderboardBoard> =>
  buildBoard(weekKey(), selfUserId);

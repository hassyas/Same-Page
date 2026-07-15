import { redis } from '@devvit/web/server';
import type { RoundResult, UserDayRecord, UserRecord } from '../../shared/types';
import { recordAllTimeRating, recordWeeklyScore, recordDailyScore, getDailyGapToTop } from './leaderboard';
import { divisiveness } from './surpriseStats';
import { buildHiveReport } from './hiveReport';
import { previousDate } from './slateDate';

const userKey = (userId: string) => `user:${userId}`;
const userDayKey = (userId: string, date: string) => `user:${userId}:day:${date}`;
const playCountKey = (date: string) => `playcount:${date}`;
const answeredRoundsKey = (userId: string, date: string) => `user:${userId}:day:${date}:answered`;
const commitLockKey = (userId: string, date: string) => `user:${userId}:day:${date}:committing`;

const defaultUser: UserRecord = {
  rating: 1000,
  streak: 0,
  bestStreak: 0,
  lastPlayed: null,
  totalPlayed: 0,
};

export const getUser = async (userId: string): Promise<UserRecord> => {
  const raw = await redis.get(userKey(userId));
  return raw ? (JSON.parse(raw) as UserRecord) : defaultUser;
};

export const getUserDay = async (
  userId: string,
  date: string
): Promise<UserDayRecord | null> => {
  const raw = await redis.get(userDayKey(userId, date));
  return raw ? (JSON.parse(raw) as UserDayRecord) : null;
};

// Atomic per-round-per-user guard: a round's answer must only ever be
// recorded into the shared hive aggregates (showdown:*/pulse:* agg) once.
// Without this, a double-tap/retry/reopened round would re-increment those
// counters every call, corrupting the stats every player sees. `hSetNX`
// returns 1 only the first time a field is set, so this doubles as the
// "is this a replay" check callers need.
export const markRoundAnswered = async (
  userId: string,
  date: string,
  roundId: string
): Promise<boolean> => {
  const wasFirstAnswer = await redis.hSetNX(answeredRoundsKey(userId, date), roundId, '1');
  return wasFirstAnswer === 1;
};

const emojiForResult = (result: RoundResult): string => {
  if (result.type === 'showdown') return result.correct ? '🟩' : '🟥';
  if (result.alignment >= 80) return '🟩';
  if (result.alignment >= 50) return '🟨';
  return '🟥';
};

// Addendum A3 — find the day's most-split round by comparing each result's
// agreement percent (percentCorrect for Showdown, peerPercent for Pulse).
// Also feeds Addendum A5's discussion prompt, so it's shared with hiveReport.ts.
const findMostDivisiveResult = (results: RoundResult[]): RoundResult | null => {
  if (results.length === 0) return null;
  return results.reduce((a, b) => {
    const percentA = a.type === 'showdown' ? a.percentCorrect : a.peerPercent;
    const percentB = b.type === 'showdown' ? b.percentCorrect : b.peerPercent;
    return divisiveness(percentB) > divisiveness(percentA) ? b : a;
  });
};

const mostDivisiveMessage = (result: RoundResult): UserDayRecord['mostDivisive'] => {
  const percent = result.type === 'showdown' ? result.percentCorrect : result.peerPercent;
  return {
    roundId: result.roundId,
    message: `Today's real argument: the crowd split ${percent}/${100 - percent}.`,
  };
};

export const commitDay = async (
  userId: string,
  date: string,
  results: RoundResult[]
): Promise<UserDayRecord> => {
  const existing = await getUserDay(userId, date);
  if (existing) return existing;

  // Atomic guard against a duplicate concurrent /slate/complete call (retry,
  // fast double-tap on the last round) racing past the `existing` check
  // above before either write lands — hSetNX only succeeds once, so a loser
  // here waits for the winner's write instead of double-applying rating/
  // leaderboard/community-synced side effects.
  const wonLock = await redis.hSetNX(commitLockKey(userId, date), 'locked', '1');
  if (!wonLock) {
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const winner = await getUserDay(userId, date);
      if (winner) return winner;
    }
    // Winner's write still hasn't landed — fall through and compute rather
    // than leaving the request hanging indefinitely; this is a last resort.
  }

  const user = await getUser(userId);
  const syncScore = results.reduce((sum, r) => sum + r.points, 0);
  // Streak only continues if the user's last play was exactly the day
  // before this one — skipping a day (or more) resets it to 1.
  const continuesStreak = user.lastPlayed === previousDate(date);
  const newStreak = continuesStreak ? user.streak + 1 : 1;
  // Floored at 2 so a rough day (near-zero syncScore) still shows *some*
  // visible progress rather than a dead "+0" — showing up should always
  // count for something in a daily-cadence retention game.
  const ratingDelta = Math.max(2, Math.round(syncScore / 20));

  const mostDivisiveResult = findMostDivisiveResult(results);

  // Addendum B5 — social proof ("N minds synced today"). A simple daily
  // counter is enough: it reflects how many had played *by the moment this
  // player committed*, which is what a same-session read should show —
  // it doesn't need to keep updating for a player who already has their
  // report on screen.
  const communitySynced = await redis.incrBy(playCountKey(date), 1);

  // Addendum B5 — near-miss framing. Must run after this user's own score
  // is recorded so "today's top" reflects them too (see leaderboard.ts).
  await recordDailyScore(userId, syncScore, date);
  const dailyGapToTop = await getDailyGapToTop(date, syncScore);

  const dayRecord: UserDayRecord = {
    date,
    syncScore,
    streak: newStreak,
    results,
    emoji: results.map(emojiForResult).join(''),
    mostDivisive: mostDivisiveResult ? mostDivisiveMessage(mostDivisiveResult) : null,
    shared: false,
    hiveReport: mostDivisiveResult ? buildHiveReport(results, mostDivisiveResult) : null,
    ratingDelta,
    communitySynced,
    dailyGapToTop,
  };

  const updatedUser: UserRecord = {
    rating: user.rating + ratingDelta,
    streak: newStreak,
    bestStreak: Math.max(user.bestStreak, newStreak),
    lastPlayed: date,
    totalPlayed: user.totalPlayed + 1,
  };

  await Promise.all([
    redis.set(userDayKey(userId, date), JSON.stringify(dayRecord)),
    redis.set(userKey(userId), JSON.stringify(updatedUser)),
    recordAllTimeRating(userId, updatedUser.rating),
    recordWeeklyScore(userId, syncScore),
  ]);

  return dayRecord;
};

// Addendum A4 — marks today's share artifact as posted so a re-tap (or a
// retried request) can't post a duplicate comment. Returns null if the day
// hasn't been completed yet (nothing to mark).
export const markDayShared = async (
  userId: string,
  date: string
): Promise<UserDayRecord | null> => {
  const existing = await getUserDay(userId, date);
  if (!existing) return null;
  const updated: UserDayRecord = { ...existing, shared: true };
  await redis.set(userDayKey(userId, date), JSON.stringify(updated));
  return updated;
};

// "Next level" brainstorm item #3 (Tomorrow's Call) — a rating bump that's
// fully orthogonal to the daily play loop: touches ONLY rating, never
// streak/lastPlayed/totalPlayed (those stay governed solely by commitDay
// above), so this side quest can't perturb the already-tuned/verified daily
// scoring path even if the feature is later cut.
export const bumpUserRating = async (userId: string, amount: number): Promise<UserRecord> => {
  const user = await getUser(userId);
  const updated: UserRecord = { ...user, rating: user.rating + amount };
  await redis.set(userKey(userId), JSON.stringify(updated));
  await recordAllTimeRating(userId, updated.rating);
  return updated;
};

import { context, redis, reddit } from '@devvit/web/server';
import type {
  TomorrowsCallCandidates,
  TomorrowsCallPick,
  TomorrowsCallResolution,
} from '../../shared/types';
import { seededShuffle } from './seededRandom';
import { previousDate } from './slateDate';
import { bumpUserRating } from './game';

// "Next level" brainstorm item #3 — Tomorrow's Call. See shared/types.ts for
// the "why orthogonal to core scoring" rationale. Riskiest of the three
// brainstorm items (new data model touching live Reddit post state a full
// day later), so kept deliberately self-contained: every function here fails
// soft (returns null / no-ops) rather than throwing, so a bad day for this
// feature (deleted post, API hiccup) can never break the core daily loop.

const candidatesKey = (date: string): string => `tomorrowscall:candidates:${date}`;
const pickKey = (userId: string, date: string): string => `tomorrowscall:pick:${userId}:${date}`;
const resolvedKey = (userId: string, date: string): string => `tomorrowscall:resolved:${userId}:${date}`;

const BONUS = 100;

const fetchCandidatePool = async (): Promise<{ id: string; title: string }[]> => {
  try {
    const posts = await reddit.getNewPosts({ subredditName: context.subredditName, limit: 30 }).all();
    return posts
      .filter(
        (p) =>
          !p.removed &&
          !p.spam &&
          !p.stickied &&
          !p.nsfw &&
          p.title &&
          // Same app-post exclusion corpus.ts applies — without it the
          // game's own placeholder post can become a prediction candidate
          // (caught live: "karmic-sense" showed up as a Tomorrow's Call
          // option on the real dev subreddit).
          p.title.trim().toLowerCase() !== context.appSlug.toLowerCase()
      )
      .map((p) => ({ id: p.id, title: p.title }));
  } catch (error) {
    console.error("TomorrowsCall: failed to fetch candidate pool", error);
    return [];
  }
};

// Cached once per day (not re-derived on every request) so every player who
// opens Daily Result today predicts on the exact same two posts, and so
// tomorrow's resolution is comparing against posts that were genuinely fixed
// at offer time — "new posts" rotate out of getNewPosts within a day, so
// re-deriving at resolution time would risk silently picking different
// posts than what was actually offered.
export const getTodaysCandidates = async (date: string): Promise<TomorrowsCallCandidates | null> => {
  const raw = await redis.get(candidatesKey(date));
  if (raw) return JSON.parse(raw) as TomorrowsCallCandidates;

  const pool = await fetchCandidatePool();
  if (pool.length < 2) return null;
  const [a, b] = seededShuffle(pool, `${date}:tomorrowscall`);
  const candidates: TomorrowsCallCandidates = { postA: a!, postB: b! };
  await redis.set(candidatesKey(date), JSON.stringify(candidates));
  return candidates;
};

export const getUserPick = async (userId: string, date: string): Promise<TomorrowsCallPick | null> => {
  const raw = await redis.get(pickKey(userId, date));
  return raw ? (JSON.parse(raw) as TomorrowsCallPick) : null;
};

// One pick per user per day, idempotent (a retry/double-tap just returns the
// already-stored pick rather than overwriting it).
export const submitPick = async (
  userId: string,
  date: string,
  pick: 'A' | 'B'
): Promise<TomorrowsCallPick | null> => {
  const existing = await getUserPick(userId, date);
  if (existing) return existing;
  const candidates = await getTodaysCandidates(date);
  if (!candidates) return null;
  const record: TomorrowsCallPick = { ...candidates, pick };
  await redis.set(pickKey(userId, date), JSON.stringify(record));
  return record;
};

export const getResolvedResult = async (
  userId: string,
  date: string
): Promise<TomorrowsCallResolution | null> => {
  const raw = await redis.get(resolvedKey(userId, date));
  return raw ? (JSON.parse(raw) as TomorrowsCallResolution) : null;
};

// Lazy resolution: called whenever a player views Daily Result on `date`.
// Resolves the PREVIOUS day's pending pick (if any) by comparing each post's
// live score right now — the exact same "which scores higher" comparison
// Showdown itself uses, just displaced 24h. Idempotent (a resolved pick is
// never reprocessed); a deleted/removed/unreachable post is treated as
// unresolvable (pick is consumed, no win/loss fabricated) rather than
// crashing or retrying forever.
export const resolveYesterdaysPick = async (
  userId: string,
  date: string
): Promise<TomorrowsCallResolution | null> => {
  const yesterday = previousDate(date);
  const already = await getResolvedResult(userId, yesterday);
  if (already) return already;

  const pending = await getUserPick(userId, yesterday);
  if (!pending) return null;

  let scoreA: number | null = null;
  let scoreB: number | null = null;
  try {
    const [postA, postB] = await Promise.all([
      reddit.getPostById(pending.postA.id as Parameters<typeof reddit.getPostById>[0]),
      reddit.getPostById(pending.postB.id as Parameters<typeof reddit.getPostById>[0]),
    ]);
    if (postA && !postA.removed && typeof postA.score === 'number') scoreA = postA.score;
    if (postB && !postB.removed && typeof postB.score === 'number') scoreB = postB.score;
  } catch (error) {
    console.error('TomorrowsCall: failed to refetch posts for resolution', error);
  }

  if (scoreA === null || scoreB === null) {
    await redis.del(pickKey(userId, yesterday));
    return null;
  }

  const aHigher = scoreA >= scoreB;
  const won = (pending.pick === 'A') === aHigher;
  const bonus = won ? BONUS : 0;

  const result: TomorrowsCallResolution = {
    pick: pending.pick,
    won,
    bonus,
    postATitle: pending.postA.title,
    postBTitle: pending.postB.title,
  };

  await redis.set(resolvedKey(userId, yesterday), JSON.stringify(result));
  if (bonus > 0) await bumpUserRating(userId, bonus);

  return result;
};

import { context, reddit, redis, type Post } from '@devvit/web/server';
import type { ShowdownPost } from '../../shared/types';
import { buildMatchups } from './matchup';
import { getSlateDate } from './slateDate';

const CORPUS_KEY = 'corpus:posts';
const CORPUS_TTL_MS = 24 * 60 * 60 * 1000;
// Guarantees enough posts for the daily 3 matchups even on a fresh/empty
// dev subreddit; real posts always take priority over these.
// Exported for the standalone corpus-simulation harness (tools/simulate) —
// no behavior change, just visibility.
export const MIN_POOL_SIZE = 10;
// Must match SHOWDOWN_ROUND_IDS.length in fakeSlate.ts. Post *count* alone
// isn't enough to guarantee Showdown works — a pool of real posts that are
// all tied on score (e.g. freshly posted, no organic votes yet) has zero
// viable non-tied pairs, so this checks actual pairing viability too.
export const REQUIRED_SHOWDOWN_PAIRS = 3;

// Uses today's actual slate-date seed (not an arbitrary fixed string) so
// this check's greedy pairing runs on the exact same shuffle order the real
// per-day build will use — otherwise the two could disagree on viability
// (greedy non-overlapping pair selection is shuffle-order-dependent).
export const hasEnoughVariance = (posts: ShowdownPost[]): boolean =>
  buildMatchups(posts, REQUIRED_SHOWDOWN_PAIRS, getSlateDate()).length >= REQUIRED_SHOWDOWN_PAIRS;

type CachedCorpus = {
  fetchedAt: number;
  subredditName: string;
  posts: ShowdownPost[];
};

const FALLBACK_POSTS: ShowdownPost[] = [
  { id: 'fallback-1', title: 'I taught my cat to open doors and now I have no privacy', thumb: '', score: 4821 },
  { id: 'fallback-2', title: 'Spent 3 years building a garage workshop and now I just sit in it', thumb: '', score: 3990 },
  { id: 'fallback-3', title: "Unpopular opinion: pineapple belongs on pizza and I'm tired of hiding it", thumb: '', score: 1204 },
  { id: 'fallback-4', title: 'My grandma just beat a video game she started in 1998', thumb: '', score: 6710 },
  { id: 'fallback-5', title: 'Your smoke detector has been chirping for six months and you know it', thumb: '', score: 2540 },
  { id: 'fallback-6', title: 'I made a spreadsheet for my plants and I refuse to apologize', thumb: '', score: 2310 },
  { id: 'fallback-7', title: 'My sourdough starter is older than my current relationship', thumb: '', score: 1870 },
  { id: 'fallback-8', title: 'Beat my 5k personal best and told absolutely everyone at work', thumb: '', score: 5390 },
  { id: 'fallback-9', title: 'The spider I rescued from the bathtub now refuses to leave', thumb: '', score: 980 },
  { id: 'fallback-10', title: 'Repainted the whole apartment in one weekend out of pure spite', thumb: '', score: 3120 },
];

const toShowdownPost = (post: Post): ShowdownPost | null => {
  if (post.removed || post.spam || post.stickied || post.nsfw) return null;
  if (!post.title || typeof post.score !== 'number') return null;
  // Skip the app's own placeholder interactive posts (always titled after
  // the app slug) so a matchup never pits "karmic-sense" vs "karmic-sense".
  if (post.title.trim().toLowerCase() === context.appSlug.toLowerCase()) return null;
  return {
    id: post.id,
    title: post.title,
    thumb: post.thumbnail?.url ?? '',
    score: post.score,
  };
};

const fetchRealPosts = async (subredditName: string): Promise<ShowdownPost[]> => {
  const pool = new Map<string, ShowdownPost>();
  const sources = [
    () => reddit.getTopPosts({ subredditName, timeframe: 'all', limit: 100 }).all(),
    () => reddit.getHotPosts({ subredditName, limit: 100 }).all(),
    () => reddit.getNewPosts({ subredditName, limit: 100 }).all(),
  ];

  for (const fetchSource of sources) {
    try {
      const posts = await fetchSource();
      for (const post of posts) {
        const mapped = toShowdownPost(post);
        if (mapped && !pool.has(mapped.id)) pool.set(mapped.id, mapped);
      }
    } catch (error) {
      console.error('Corpus: one post source failed to fetch:', error);
    }
  }

  return [...pool.values()];
};

// Exported for the standalone corpus-simulation harness (tools/simulate) —
// no behavior change, just visibility. `getCorpus` (the Redis-cached public
// entry point) is unaffected and still the one real callers use.
export const buildCorpus = async (): Promise<ShowdownPost[]> => {
  const real = await fetchRealPosts(context.subredditName);
  if (real.length >= MIN_POOL_SIZE && hasEnoughVariance(real)) return real;

  const seenIds = new Set(real.map((p) => p.id));
  const padded = [...real];
  for (const fallback of FALLBACK_POSTS) {
    if (padded.length >= MIN_POOL_SIZE && hasEnoughVariance(padded)) break;
    if (!seenIds.has(fallback.id)) padded.push(fallback);
  }
  return padded;
};

/**
 * Fetch-once-and-cache: reads the cached post pool from Redis, and only
 * hits the Reddit API to rebuild it when missing, stale (>24h), or the
 * app has moved to a different subreddit.
 */
export const getCorpus = async (): Promise<ShowdownPost[]> => {
  const raw = await redis.get(CORPUS_KEY);
  if (raw) {
    try {
      const cached = JSON.parse(raw) as CachedCorpus;
      const fresh = Date.now() - cached.fetchedAt < CORPUS_TTL_MS;
      const sameSubreddit = cached.subredditName === context.subredditName;
      if (fresh && sameSubreddit && cached.posts.length > 0) {
        return cached.posts;
      }
    } catch (error) {
      console.error('Corpus: cache parse failed, rebuilding:', error);
    }
  }

  const posts = await buildCorpus();
  const toCache: CachedCorpus = {
    fetchedAt: Date.now(),
    subredditName: context.subredditName,
    posts,
  };
  await redis.set(CORPUS_KEY, JSON.stringify(toCache));
  return posts;
};

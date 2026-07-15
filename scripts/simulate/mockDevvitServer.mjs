// In-memory mock of @devvit/web/server for the standalone simulation
// harness (npm run simulate). Implements just the surface actually used by
// corpus.ts / matchup.ts / pulseRounds.ts / fakeSlate.ts / showdownAgg.ts /
// pulseAgg.ts / leaderboard.ts — real game/scoring logic is bundled
// unmodified against this mock (see build.mjs), never reimplemented here.
const store = new Map();
const hashes = new Map();
const zsets = new Map();

function getZset(key) {
  if (!zsets.has(key)) zsets.set(key, new Map());
  return zsets.get(key);
}

export const redis = {
  async get(key) {
    return store.has(key) ? store.get(key) : null;
  },
  async set(key, value) {
    store.set(key, value);
    return 'OK';
  },
  async del(key) {
    store.delete(key);
    hashes.delete(key);
    zsets.delete(key);
    return 1;
  },
  async hSetNX(key, field, value) {
    if (!hashes.has(key)) hashes.set(key, new Map());
    const h = hashes.get(key);
    if (h.has(field)) return 0;
    h.set(field, value);
    return 1;
  },
  async hIncrBy(key, field, amount) {
    if (!hashes.has(key)) hashes.set(key, new Map());
    const h = hashes.get(key);
    const next = (Number(h.get(field)) || 0) + amount;
    h.set(field, String(next));
    return next;
  },
  async hGetAll(key) {
    const h = hashes.get(key);
    if (!h) return {};
    return Object.fromEntries(h.entries());
  },
  async incrBy(key, amount) {
    const current = store.has(key) ? parseInt(store.get(key), 10) : 0;
    const next = current + amount;
    store.set(key, String(next));
    return next;
  },
  async zAdd(key, entry) {
    getZset(key).set(entry.member, entry.score);
    return 1;
  },
  async zIncrBy(key, member, amount) {
    const z = getZset(key);
    const next = (z.get(member) ?? 0) + amount;
    z.set(member, next);
    return next;
  },
  async expire() {
    return 1;
  },
  async zRange(key, start, stop, opts) {
    const z = getZset(key);
    let entries = Array.from(z.entries()).map(([member, score]) => ({ member, score }));
    entries.sort((a, b) => (opts?.reverse ? b.score - a.score : a.score - b.score));
    return entries.slice(start, stop + 1);
  },
  async zRem(key, members) {
    const z = getZset(key);
    let removed = 0;
    for (const m of members) {
      if (z.delete(m)) removed++;
    }
    return removed;
  },
  async mGet(keys) {
    return keys.map((k) => (store.has(k) ? store.get(k) : null));
  },
};

// Mutable source for corpus.ts's fetchRealPosts() to pull from — the test
// script sets this per-dataset via setMockRedditPosts() before calling
// buildCorpus(), so no real network/Reddit API call ever happens.
let mockRedditPosts = [];
export const setMockRedditPosts = (posts) => {
  mockRedditPosts = posts;
};

const postSource = () => ({ all: async () => mockRedditPosts });

// Per-test control over reddit.getPostById (tomorrowsCall.ts resolution) —
// tests install a function that returns a post object or throws, so the
// win/loss/removed/unreachable paths are all drivable without a network.
let mockPostById = () => {
  throw new Error('mock getPostById: no handler installed for this test');
};
export const setMockPostById = (fn) => {
  mockPostById = fn;
};

// Captures reddit.submitComment calls (digest.ts) instead of posting
// anywhere; setSubmitCommentError makes the next calls throw, to drive the
// swallow-errors path.
let submittedComments = [];
let submitCommentError = null;
export const getSubmittedComments = () => submittedComments;
export const setSubmitCommentError = (message) => {
  submitCommentError = message;
};

export const reddit = {
  getTopPosts: postSource,
  getHotPosts: postSource,
  getNewPosts: postSource,
  async getUserById() {
    return null;
  },
  async getPostById(id) {
    return mockPostById(id);
  },
  async submitComment(options) {
    if (submitCommentError) throw new Error(submitCommentError);
    submittedComments.push(options);
    return { id: `t1_mock${submittedComments.length}` };
  },
};

export const context = {
  userId: 't2_simuser',
  postId: 't3_simpost',
  subredditName: 'simulated_sub',
  appSlug: 'karmic-sense',
};

// Clears all in-memory state between datasets so one test's writes (e.g.
// recordShowdownAnswer's agg counters) can never leak into the next.
export const resetMockStore = () => {
  store.clear();
  hashes.clear();
  zsets.clear();
  mockRedditPosts = [];
  mockPostById = () => {
    throw new Error('mock getPostById: no handler installed for this test');
  };
  submittedComments = [];
  submitCommentError = null;
};

// Direct access for tests that need to seed state the real code will then
// read (e.g. digest.ts reads yesterday's user-day records + leaderboard day
// zset) — same shared instance the bundled code uses.
export const mockStore = { store, hashes, zsets };

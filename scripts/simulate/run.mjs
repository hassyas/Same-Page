// Standalone regression harness for corpus/matchup/Pulse-pairing/scoring
// logic — no real redis/reddit.* calls (see mockDevvitServer.mjs). Runs the
// ACTUAL shipped functions (bundled unmodified via build.mjs), not
// reimplementations, against synthetic "Reddit thread" datasets shaped like
// the real failure modes this project has already hit live once
// (18 tied-score posts producing zero Showdown pairs — see PROGRESS.md).
//
// Run with `npm run simulate` (rebuilds the bundle first, then runs this).
import {
  hasEnoughVariance,
  buildCorpus,
  REQUIRED_SHOWDOWN_PAIRS,
  MIN_POOL_SIZE,
  buildMatchups,
  buildPulseSeeds,
  computeShowdownResult,
  computePulseResult,
  getTodaysCandidates,
  getUserPick,
  submitPick,
  resolveYesterdaysPick,
  getResolvedResult,
  maybePostDailyDigest,
  getUser,
} from './.bundle/entry.mjs';
import {
  redis,
  setMockRedditPosts,
  resetMockStore,
  setMockPostById,
  getSubmittedComments,
  setSubmitCommentError,
} from './mockDevvitServer.mjs';

let passed = 0;
let failed = 0;

const assert = (label, condition, detail = '') => {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` (${detail})` : ''}`);
  }
};

const makePost = (id, title, score) => ({ id, title, thumb: '', score });

// ---------------------------------------------------------------------------
// Group A — synthetic corpus datasets through hasEnoughVariance + buildCorpus
// ---------------------------------------------------------------------------
console.log('\n=== Group A: corpus/matchup pairing viability ===');

const healthyPool = Array.from({ length: 30 }, (_, i) =>
  makePost(`healthy-${i}`, `Healthy varied post #${i}`, 100 + i * 37)
);

const allTiedPool = Array.from({ length: 20 }, (_, i) =>
  makePost(`tied-${i}`, `Freshly posted, no votes yet #${i}`, 500)
);

const zeroScorePool = healthyPool.slice(0, 29).map((p, i) => ({ ...p })); // copy
zeroScorePool.push(makePost('zero-score', 'Brand new post, no upvotes yet', 0));

// Exactly MIN_POOL_SIZE (10) posts, but only 2 score tiers (5 + 5) — passes
// the old count-only check but has only 1 real candidate pair (the boundary
// between the two tiers), well under REQUIRED_SHOWDOWN_PAIRS (3). This is
// the exact shape of the real bug that once reached live QA.
const atThresholdPool = [
  ...Array.from({ length: 5 }, (_, i) => makePost(`thr-hi-${i}`, `Tier A post #${i}`, 900)),
  ...Array.from({ length: 5 }, (_, i) => makePost(`thr-lo-${i}`, `Tier B post #${i}`, 300)),
];

const datasets = [
  { name: 'Healthy varied pool (30 posts, distinct scores)', posts: healthyPool, expectRawVariance: true, expectPadding: false },
  { name: 'All-tied-score pool (20 posts, one score)', posts: allTiedPool, expectRawVariance: false, expectPadding: true },
  { name: 'Pool with a 0-score post (29 varied + 1 zero)', posts: zeroScorePool, expectRawVariance: true, expectPadding: false },
  { name: `At the fallback-padding threshold (exactly ${MIN_POOL_SIZE} posts, 2 tiers)`, posts: atThresholdPool, expectRawVariance: false, expectPadding: true },
];

for (const ds of datasets) {
  console.log(`\n--- ${ds.name} ---`);
  resetMockStore();
  setMockRedditPosts(ds.posts);

  const rawPairs = buildMatchups(ds.posts, REQUIRED_SHOWDOWN_PAIRS, 'sim-seed');
  const rawVariance = hasEnoughVariance(ds.posts);
  console.log(`  raw pool size=${ds.posts.length}, raw viable pairs=${rawPairs.length}, hasEnoughVariance=${rawVariance}`);
  assert(`${ds.name}: raw variance matches expectation`, rawVariance === ds.expectRawVariance, `got ${rawVariance}`);

  const corpus = await buildCorpus();
  const finalVariance = hasEnoughVariance(corpus);
  const padded = corpus.length > ds.posts.length;
  console.log(`  after buildCorpus(): size=${corpus.length}, padded=${padded}, hasEnoughVariance=${finalVariance}`);
  assert(`${ds.name}: buildCorpus always guarantees enough variance`, finalVariance === true);
  assert(`${ds.name}: padding only happens when actually needed`, padded === ds.expectPadding, `padded=${padded}, expected=${ds.expectPadding}`);
}

// Direct check: the 0-score post pairs and scores correctly, no crash.
console.log('\n--- 0-score post: direct pairing + scoring check ---');
const zsPairs = buildMatchups(zeroScorePool, REQUIRED_SHOWDOWN_PAIRS, 'sim-seed-2');
const zeroInvolved = zsPairs.some(([a, b]) => a.id === 'zero-score' || b.id === 'zero-score');
assert('0-score post can appear in a viable pair without crashing', zsPairs.length > 0);
console.log(`  (0-score post included in this run's selected pairs: ${zeroInvolved} — pairing is shuffle-seeded, not guaranteed every run)`);

// ---------------------------------------------------------------------------
// Group B — buildPulseSeeds
// ---------------------------------------------------------------------------
console.log('\n=== Group B: Pulse post+template pairing ===');
resetMockStore();

const pulsePool = Array.from({ length: 6 }, (_, i) => makePost(`pulse-${i}`, `Pulse candidate post #${i}`, 100 + i * 10));
const usedIds = new Set(['pulse-0', 'pulse-1']);

const seedsA = buildPulseSeeds(pulsePool, usedIds, 2, 'sim-pulse-seed');
const seedsB = buildPulseSeeds(pulsePool, usedIds, 2, 'sim-pulse-seed');
assert('buildPulseSeeds is deterministic for the same seedKey', JSON.stringify(seedsA) === JSON.stringify(seedsB));
assert('buildPulseSeeds prefers posts not already used in Showdown', seedsA.every((s) => !usedIds.has(s.post.id)), `seeds=${seedsA.map((s) => s.post.id).join(',')}`);
assert('buildPulseSeeds spectrumId is "{templateId}:{postId}"', seedsA.every((s) => s.spectrumId.includes(':') && s.spectrumId.endsWith(s.post.id)));

// Fallback path: only 1 fresh (unused) post exists but count=2 is requested
// — buildPulseSeeds must still return `count` seeds by falling back to the
// full pool rather than erroring or under-returning.
const almostAllUsed = new Set(pulsePool.slice(0, 5).map((p) => p.id));
const seedsFallback = buildPulseSeeds(pulsePool, almostAllUsed, 2, 'sim-pulse-seed-2');
assert('buildPulseSeeds still returns the requested count when fresh posts run out', seedsFallback.length === 2, `got ${seedsFallback.length}`);

// ---------------------------------------------------------------------------
// Group C — computeShowdownResult: wager tiers x correctness x Decider x2
// ---------------------------------------------------------------------------
console.log('\n=== Group C: Showdown scoring — wager tiers + Decider x2 ===');
resetMockStore();

const hiddenShowdown = {
  type: 'showdown',
  roundId: 'sim-sd',
  postA: { id: 'a', title: 'Post A', thumb: '', score: 100 },
  postB: { id: 'b', title: 'Post B', thumb: '', score: 50 },
};
// higherIsA = true (100 >= 50), so picking 'A' is correct, 'B' is wrong.

const showdownMatrix = [
  { wager: 'lock', pick: 'A', isDecider: false, expectCorrect: true, expectPoints: 150 },
  { wager: 'lock', pick: 'A', isDecider: true, expectCorrect: true, expectPoints: 300 },
  { wager: 'lock', pick: 'B', isDecider: false, expectCorrect: false, expectPoints: 0 },
  { wager: 'lock', pick: 'B', isDecider: true, expectCorrect: false, expectPoints: 0 },
  { wager: 'hedge', pick: 'A', isDecider: false, expectCorrect: true, expectPoints: 75 },
  { wager: 'hedge', pick: 'A', isDecider: true, expectCorrect: true, expectPoints: 150 },
  { wager: 'hedge', pick: 'B', isDecider: false, expectCorrect: false, expectPoints: 25 },
  { wager: 'hedge', pick: 'B', isDecider: true, expectCorrect: false, expectPoints: 50 },
];

for (const c of showdownMatrix) {
  const answer = { type: 'showdown', roundId: 'sim-sd', pick: c.pick, wager: c.wager };
  const result = await computeShowdownResult(hiddenShowdown, answer, 'sim-date', false, c.isDecider);
  const label = `${c.wager} + pick ${c.pick} + decider=${c.isDecider}`;
  assert(`${label}: correct=${c.expectCorrect}`, result.correct === c.expectCorrect, `got ${result.correct}`);
  assert(`${label}: points=${c.expectPoints}`, result.points === c.expectPoints, `got ${result.points}`);
}

// ---------------------------------------------------------------------------
// Group D — computePulseResult: alignment formula + Decider x2
// ---------------------------------------------------------------------------
console.log('\n=== Group D: Pulse scoring — alignment formula + Decider x2 ===');
resetMockStore();

// All seed weight in bucket index 4 (bucketWidth=10) -> mean = 4*10 + 5 = 45.
const hiddenPulse = {
  type: 'pulse',
  roundId: 'sim-pl',
  spectrumId: 'sim-spectrum',
  post: { id: 'p', title: 'Pulse post', thumb: '' },
  prompt: 'Prompt?',
  leftLabel: 'Left',
  rightLabel: 'Right',
  seedDistribution: [0, 0, 0, 0, 10, 0, 0, 0, 0, 0],
};

const pulseMatrix = [
  { value: 45, isDecider: false, expectAlignment: 100, expectPoints: 100 }, // distance 0
  { value: 45, isDecider: true, expectAlignment: 100, expectPoints: 200 },
  { value: 95, isDecider: false, expectAlignment: 25, expectPoints: 25 }, // distance 50 -> 100-75=25
  { value: 95, isDecider: true, expectAlignment: 25, expectPoints: 50 },
];

for (const c of pulseMatrix) {
  const answer = { type: 'pulse', roundId: 'sim-pl', value: c.value };
  const result = await computePulseResult(hiddenPulse, answer, false, c.isDecider);
  const label = `value=${c.value} + decider=${c.isDecider}`;
  assert(`${label}: alignment=${c.expectAlignment}`, result.alignment === c.expectAlignment, `got ${result.alignment}`);
  assert(`${label}: points=${c.expectPoints}`, result.points === c.expectPoints, `got ${result.points}`);
  assert(`${label}: points is exactly alignment x2 when Decider`, result.points === (c.isDecider ? result.alignment * 2 : result.alignment));
}

// ---------------------------------------------------------------------------
// Group E — Tomorrow's Call: candidates, pick idempotency, lazy resolution
// ---------------------------------------------------------------------------
console.log("\n=== Group E: Tomorrow's Call — candidates, picks, resolution ===");

const TC_USER = 't2_simuser';
const TC_YESTERDAY = '2026-07-09';
const TC_TODAY = '2026-07-10';

const tcPool = [
  { id: 't3_new1', title: 'Rising post one' },
  { id: 't3_new2', title: 'Rising post two' },
  { id: 't3_new3', title: 'Rising post three' },
];

// -- Candidate selection + caching --
resetMockStore();
setMockRedditPosts(tcPool);
const cand1 = await getTodaysCandidates(TC_YESTERDAY);
assert('candidates: returns 2 distinct posts from the pool', cand1 !== null && cand1.postA.id !== cand1.postB.id, `got ${cand1?.postA.id} vs ${cand1?.postB.id}`);
setMockRedditPosts([{ id: 't3_other', title: 'A totally different pool now' }, { id: 't3_other2', title: 'Another' }]);
const cand2 = await getTodaysCandidates(TC_YESTERDAY);
assert('candidates: second call is served from cache, not re-derived', cand2.postA.id === cand1.postA.id && cand2.postB.id === cand1.postB.id, `got ${cand2.postA.id}/${cand2.postB.id}`);

// -- Not enough posts -> null, no crash --
resetMockStore();
setMockRedditPosts([{ id: 't3_only', title: 'Just one post' }]);
const candSparse = await getTodaysCandidates(TC_YESTERDAY);
assert('candidates: pool of 1 -> null (feature silently unavailable)', candSparse === null);

// -- The app's own placeholder post is never a candidate (caught live:
// "karmic-sense" appeared as a Tomorrow's Call option on the dev sub) --
resetMockStore();
setMockRedditPosts([
  { id: 't3_app', title: 'karmic-sense' },
  { id: 't3_real1', title: 'A real community post' },
  { id: 't3_real2', title: 'Another real community post' },
]);
const candNoApp = await getTodaysCandidates(TC_YESTERDAY);
assert(
  "candidates: the app's own post is filtered out of the pool",
  candNoApp !== null && candNoApp.postA.id !== 't3_app' && candNoApp.postB.id !== 't3_app',
  `got ${candNoApp?.postA.id}/${candNoApp?.postB.id}`
);

// -- Pick idempotency --
resetMockStore();
setMockRedditPosts(tcPool);
const pick1 = await submitPick(TC_USER, TC_YESTERDAY, 'A');
const pick2 = await submitPick(TC_USER, TC_YESTERDAY, 'B');
assert("pick: first pick stored", pick1 !== null && pick1.pick === 'A');
assert("pick: second (conflicting) pick returns the FIRST, never overwrites", pick2.pick === 'A', `got ${pick2.pick}`);
const storedPick = await getUserPick(TC_USER, TC_YESTERDAY);
assert('pick: getUserPick round-trips the stored pick', storedPick?.pick === 'A');

// -- Resolution: win path (+100 exactly once) --
setMockPostById((id) => ({ id, score: id === storedPick.postA.id ? 500 : 100, removed: false }));
const resolveWin = await resolveYesterdaysPick(TC_USER, TC_TODAY);
assert('resolve: picked-A-and-A-won -> won=true, bonus=100', resolveWin?.won === true && resolveWin?.bonus === 100, `got won=${resolveWin?.won} bonus=${resolveWin?.bonus}`);
const userAfterWin = await getUser(TC_USER);
assert('resolve: winning bumps rating 1000 -> 1100 (rating only, streak untouched)', userAfterWin.rating === 1100 && userAfterWin.streak === 0, `rating=${userAfterWin.rating} streak=${userAfterWin.streak}`);
const resolveAgain = await resolveYesterdaysPick(TC_USER, TC_TODAY);
const userAfterSecondResolve = await getUser(TC_USER);
assert('resolve: idempotent — second call returns stored result, NO second bump', resolveAgain?.won === true && userAfterSecondResolve.rating === 1100, `rating=${userAfterSecondResolve.rating}`);

// -- Resolution: loss path (no bump) --
resetMockStore();
setMockRedditPosts(tcPool);
const lossPick = await submitPick(TC_USER, TC_YESTERDAY, 'A');
setMockPostById((id) => ({ id, score: id === lossPick.postA.id ? 100 : 500, removed: false }));
const resolveLoss = await resolveYesterdaysPick(TC_USER, TC_TODAY);
const userAfterLoss = await getUser(TC_USER);
assert('resolve: picked-A-and-B-won -> won=false, bonus=0, rating unchanged', resolveLoss?.won === false && resolveLoss?.bonus === 0 && userAfterLoss.rating === 1000, `won=${resolveLoss?.won} rating=${userAfterLoss.rating}`);

// -- Resolution: tie goes to A (score >= comparison, same as Showdown) --
resetMockStore();
setMockRedditPosts(tcPool);
const tiePick = await submitPick(TC_USER, TC_YESTERDAY, 'A');
setMockPostById((id) => ({ id, score: 250, removed: false }));
const resolveTie = await resolveYesterdaysPick(TC_USER, TC_TODAY);
assert('resolve: tied scores -> A wins (>= rule, mirrors Showdown)', resolveTie?.won === true, `got won=${resolveTie?.won}, pick was ${tiePick.pick}`);

// -- Resolution: unreachable post -> fail-soft (pick consumed, nothing fabricated) --
resetMockStore();
setMockRedditPosts(tcPool);
await submitPick(TC_USER, TC_YESTERDAY, 'A');
setMockPostById(() => {
  throw new Error('simulated Reddit API failure');
});
const resolveFail = await resolveYesterdaysPick(TC_USER, TC_TODAY);
const userAfterFail = await getUser(TC_USER);
const pickAfterFail = await getUserPick(TC_USER, TC_YESTERDAY);
assert('resolve: API failure -> null result, no rating change, no crash', resolveFail === null && userAfterFail.rating === 1000);
assert('resolve: API failure consumes the pick (no retry loop forever)', pickAfterFail === null);

// -- Resolution: removed post -> same fail-soft path --
resetMockStore();
setMockRedditPosts(tcPool);
const remPick = await submitPick(TC_USER, TC_YESTERDAY, 'A');
setMockPostById((id) => ({ id, score: 100, removed: id === remPick.postA.id }));
const resolveRemoved = await resolveYesterdaysPick(TC_USER, TC_TODAY);
assert('resolve: removed post -> null result (never fabricates a win/loss)', resolveRemoved === null);

// -- Resolution: nothing pending -> null, no stored result --
resetMockStore();
const resolveNothing = await resolveYesterdaysPick(TC_USER, TC_TODAY);
const storedNothing = await getResolvedResult(TC_USER, TC_YESTERDAY);
assert('resolve: no pending pick -> null, nothing stored', resolveNothing === null && storedNothing === null);

// ---------------------------------------------------------------------------
// Group F — Daily Hive Digest: once-only lock, roster aggregation, fail-soft
// ---------------------------------------------------------------------------
console.log('\n=== Group F: Daily Hive Digest — lock, aggregation, fail-soft ===');

// Seeds "yesterday" state the way the real day would have left it: the daily
// leaderboard zset roster + each player's user-day record (only the fields
// digest.ts actually reads).
const seedYesterday = async (players) => {
  for (const p of players) {
    await redis.zIncrBy(`leaderboard:day:${TC_YESTERDAY}`, p.userId, p.syncScore);
    await redis.set(
      `user:${p.userId}:day:${TC_YESTERDAY}`,
      JSON.stringify({
        date: TC_YESTERDAY,
        syncScore: p.syncScore,
        mostDivisive: p.mostDivisive ?? null,
        hiveReport: p.archetype ? { archetype: p.archetype } : null,
      })
    );
  }
};

// -- Happy path: roster of 3, mixed archetypes --
resetMockStore();
await seedYesterday([
  { userId: 't2_a', syncScore: 400, archetype: 'Hivemind', mostDivisive: { roundId: 'sd-1', message: 'Hottest debate today: the hive split 52/48 on this one.' } },
  { userId: 't2_b', syncScore: 300, archetype: 'Hivemind' },
  { userId: 't2_c', syncScore: 200, archetype: 'Contrarian' },
]);
await maybePostDailyDigest(TC_TODAY);
let comments = getSubmittedComments();
assert('digest: posts exactly one comment for a day with players', comments.length === 1, `got ${comments.length}`);
const digestText = comments[0]?.text ?? '';
assert('digest: names the player count', digestText.includes('3 crowd members played'), 'text checked');
assert('digest: includes the most-divisive line', digestText.includes('52/48'));
assert('digest: archetype mix is percentage-correct (67% Hivemind, 33% Contrarian)', digestText.includes('67% Hivemind') && digestText.includes('33% Contrarian'), 'text checked');
assert('digest: posts as the app, on the app post', comments[0]?.runAs === 'APP' && comments[0]?.id === 't3_simpost');

// -- Once-only under concurrency: 8 simultaneous rollover triggers --
resetMockStore();
await seedYesterday([{ userId: 't2_a', syncScore: 400, archetype: 'Wildcard' }]);
await Promise.all(Array.from({ length: 8 }, () => maybePostDailyDigest(TC_TODAY)));
assert('digest: 8 concurrent triggers -> exactly 1 comment (hSetNX lock holds)', getSubmittedComments().length === 1, `got ${getSubmittedComments().length}`);

// -- Empty yesterday -> no comment, no crash --
resetMockStore();
await maybePostDailyDigest(TC_TODAY);
assert('digest: nobody played yesterday -> no comment posted', getSubmittedComments().length === 0);

// -- submitComment failure -> swallowed, lock consumed, no crash --
resetMockStore();
await seedYesterday([{ userId: 't2_a', syncScore: 400, archetype: 'Wildcard' }]);
setSubmitCommentError('simulated RATELIMIT');
await maybePostDailyDigest(TC_TODAY); // must not throw
setSubmitCommentError(null);
await maybePostDailyDigest(TC_TODAY); // lock already consumed -> still no comment
assert('digest: submitComment failure is swallowed AND the day is not retried', getSubmittedComments().length === 0, `got ${getSubmittedComments().length}`);

// ---------------------------------------------------------------------------
console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);

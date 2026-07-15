// Thin re-export shim so build.mjs has a single entry point pulling in the
// exact real, unmodified functions under test — nothing here is
// reimplemented logic, just named re-exports for the bundler.
export { hasEnoughVariance, buildCorpus, REQUIRED_SHOWDOWN_PAIRS, MIN_POOL_SIZE } from '../../src/server/core/corpus.ts';
export { buildMatchups } from '../../src/server/core/matchup.ts';
export { buildPulseSeeds } from '../../src/server/core/pulseRounds.ts';
export { computeShowdownResult, computePulseResult } from '../../src/server/core/fakeSlate.ts';
export {
  getTodaysCandidates,
  getUserPick,
  submitPick,
  resolveYesterdaysPick,
  getResolvedResult,
} from '../../src/server/core/tomorrowsCall.ts';
export { maybePostDailyDigest } from '../../src/server/core/digest.ts';
export { getUser } from '../../src/server/core/game.ts';

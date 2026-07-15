// Shared with RoundPulse.tsx/DailyResult.tsx/splash.tsx — a Pulse round
// counts as "read right" at/above this alignment %. One constant so all 3
// call sites can't drift out of sync with each other.
export const PULSE_SYNCED_THRESHOLD = 80;

// A round (of either type) counts as "the hive agreed with you" for
// rounds-correct tallies (Splash summary, Daily Result split bar) — mirrors
// whatever logic already produces dayResult.emoji server-side.
export const isRoundSynced = (r: RoundResult): boolean =>
  r.type === 'showdown' ? r.correct : r.alignment >= PULSE_SYNCED_THRESHOLD;

export type ShowdownPost = {
  id: string;
  title: string;
  thumb: string;
  score: number;
};

export type RoundShowdown = {
  type: 'showdown';
  roundId: string;
  postA: Omit<ShowdownPost, 'score'>;
  postB: Omit<ShowdownPost, 'score'>;
};

export type RoundPulse = {
  type: 'pulse';
  roundId: string;
  spectrumId: string;
  post: { id: string; title: string; thumb: string };
  prompt: string;
  leftLabel: string;
  rightLabel: string;
};

export type Round = RoundShowdown | RoundPulse;

export type DailySlate = {
  date: string;
  rounds: Round[];
};

// Fun Patch — confidence wager (poker logic: randomness is fun when you bet
// on your read). 'lock' raises the ceiling and the floor's downside;
// 'hedge' is the safer consolation-prize play. See game.ts scoring.
export type ShowdownWager = 'lock' | 'hedge';

export type ShowdownAnswer = {
  type: 'showdown';
  roundId: string;
  pick: 'A' | 'B';
  wager: ShowdownWager;
};

export type PulseAnswer = {
  type: 'pulse';
  roundId: string;
  value: number;
};

export type Answer = ShowdownAnswer | PulseAnswer;

export type ShowdownResult = {
  type: 'showdown';
  roundId: string;
  pick: 'A' | 'B';
  correct: boolean;
  points: number;
  postA: ShowdownPost;
  postB: ShowdownPost;
  // Addendum A3 — surprise stats: % of today's players who got this right,
  // and a ready-to-render framing of it (minority/majority-aware).
  percentCorrect: number;
  surpriseStat: string;
};

export type PulseResult = {
  type: 'pulse';
  roundId: string;
  post: { id: string; title: string; thumb: string };
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  alignment: number;
  points: number;
  distribution: number[];
  // Addendum A3 — % of the (real+seed) crowd that landed in the same bucket
  // as this player, and a ready-to-render framing of it.
  peerPercent: number;
  surpriseStat: string;
};

export type RoundResult = ShowdownResult | PulseResult;

export type UserRecord = {
  rating: number;
  streak: number;
  bestStreak: number;
  lastPlayed: string | null;
  totalPlayed: number;
};

// Addendum A5 — the within-session identity layer. Must land at N=1 session:
// derived purely from divergence-from-crowd across this session's 5 rounds.
export type HiveReport = {
  archetype: 'Hivemind' | 'Contrarian' | 'Wildcard' | 'The Quiet One';
  headline: string;
  strength: string;
  blindSpot: string;
  discussionPrompt: string;
};

export type UserDayRecord = {
  date: string;
  syncScore: number;
  streak: number;
  results: RoundResult[];
  emoji: string;
  // Addendum A3 — the day's most-split round, surfaced as a highlight.
  mostDivisive: { roundId: string; message: string } | null;
  // Addendum A4 — has this player already posted their share comment today?
  shared: boolean;
  // Addendum A5 — within-session archetype + identity read.
  hiveReport: HiveReport | null;
  // Addendum B5 — retention cues: how much the hive-sync rating moved today
  // (always >= 0 — see commitDay), and how many hive members had played by
  // the moment this player committed (social proof).
  ratingDelta: number;
  communitySynced: number;
  // Addendum B5 — near-miss framing: how far below *today's* current top
  // sync score this player's own score is (0 if they are the top). Null on
  // older records committed before this field existed.
  dailyGapToTop: number | null;
};

// Addendum A6 — contribution loop. Lean/end-to-end: real players pitch a
// Pulse spectrum; judging/curation into the live rotation is manual for now.
export type SpectrumSubmission = {
  id: string;
  userId: string;
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
};

// "Next level" brainstorm item #3 — Tomorrow's Call: an optional bonus
// prediction offered after today's slate is done, resolved lazily the next
// time the player is back (the cliffhanger the daily loop otherwise lacks).
// Deliberately orthogonal to UserDayRecord/UserRecord's core scoring fields
// — a won pick bumps `rating` directly (see game.ts's `bumpUserRating`), but
// never touches syncScore/streak/ratingDelta, so this can't perturb the
// already-tuned daily scoring path even if it's ever cut.
export type TomorrowsCallCandidates = {
  postA: { id: string; title: string };
  postB: { id: string; title: string };
};

export type TomorrowsCallPick = TomorrowsCallCandidates & { pick: 'A' | 'B' };

export type TomorrowsCallResolution = {
  pick: 'A' | 'B';
  won: boolean;
  bonus: number;
  postATitle: string;
  postBTitle: string;
};

export type LeaderboardRow = {
  userId: string;
  username: string;
  score: number;
  rank: number;
};

export type LeaderboardBoard = {
  top: LeaderboardRow[];
  self: LeaderboardRow | null;
};

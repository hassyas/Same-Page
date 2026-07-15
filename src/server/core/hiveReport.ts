import type { HiveReport, RoundResult } from '../../shared/types';

// % of the hive whose answer matches this player's answer — a single unified
// signal across both round types (Showdown's percentCorrect is objective
// correctness, but with a binary choice, "wrong" players overwhelmingly
// share the same wrong pick, so 100-percentCorrect approximates their peer
// share the same way Pulse's peerPercent does directly).
const crowdAgreement = (r: RoundResult): number =>
  r.type === 'showdown' ? (r.correct ? r.percentCorrect : 100 - r.percentCorrect) : r.peerPercent;

const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

const stdDev = (values: number[]): number => {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
};

// Must land at N=1 session (Addendum A5) — derived purely from within-session
// divergence across this session's rounds, not a long-term history.
const pickArchetype = (avg: number, spread: number): HiveReport['archetype'] => {
  if (spread >= 25) return 'Wildcard';
  if (avg >= 65) return 'Hivemind';
  if (avg <= 35) return 'Contrarian';
  return 'The Quiet One';
};

// SWARM SIGNAL Section 7 — identity-first, deadpan; the avg number stays
// (mechanics wording is kept), but the line leads with who you were today.
const ARCHETYPE_HEADLINES: Record<HiveReport['archetype'], (avg: number) => string> = {
  Hivemind: (avg) => `You read the room like you built it. ${avg}% matched.`,
  Contrarian: (avg) => `You read the room, then went the other way. ${avg}% matched.`,
  Wildcard: (avg) => `Dead-on, then miles off. Nobody pins you down. ${avg}% average.`,
  'The Quiet One': (avg) => `Quiet, but you don't miss much. ${avg}% matched.`,
};

const buildDiscussionPrompt = (mostDivisive: RoundResult): string => {
  if (mostDivisive.type === 'showdown') {
    const percent = mostDivisive.percentCorrect;
    return `Which one do you think really deserved it, "${mostDivisive.postA.title}" or "${mostDivisive.postB.title}"? The crowd was split roughly ${percent}/${100 - percent}.`;
  }
  const percent = mostDivisive.peerPercent;
  const leaning = mostDivisive.value >= 50 ? mostDivisive.rightLabel : mostDivisive.leftLabel;
  return `Do you really think "${mostDivisive.post.title}" leans ${leaning}? The crowd was split roughly ${percent}/${100 - percent}.`;
};

export const buildHiveReport = (results: RoundResult[], mostDivisive: RoundResult): HiveReport => {
  const agreements = results.map(crowdAgreement);
  const avg = Math.round(mean(agreements));
  const spread = Math.round(stdDev(agreements));
  const archetype = pickArchetype(avg, spread);

  const showdownResults = results.filter((r) => r.type === 'showdown');
  const pulseResults = results.filter((r) => r.type === 'pulse');
  const showdownAvg = showdownResults.length ? mean(showdownResults.map(crowdAgreement)) : 50;
  const pulseAvg = pulseResults.length ? mean(pulseResults.map(crowdAgreement)) : 50;
  const showdownIsStrength = showdownAvg >= pulseAvg;

  return {
    archetype,
    headline: ARCHETYPE_HEADLINES[archetype](avg),
    strength: showdownIsStrength
      ? 'Showdown. You read post popularity well.'
      : 'Pulse. You nailed the community vibe checks.',
    blindSpot: showdownIsStrength
      ? 'Pulse. The community vibe checks caught you off guard.'
      : 'Showdown. Post popularity sometimes surprised you.',
    discussionPrompt: buildDiscussionPrompt(mostDivisive),
  };
};

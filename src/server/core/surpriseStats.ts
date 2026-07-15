// Addendum A3 — surprise stats on every reveal. Server-composed so the
// client just renders a string; keeps the minority/majority framing logic
// in one place (also reusable later for the within-session archetype, A5).
// Addendum B6 — "so far" framing throughout: the real vote count behind
// these percentages is always blended with a seed baseline (showdownAgg.ts /
// pulseAgg.ts) and never exposed to the client, so the copy stays honest and
// alive ("this is a live, growing number") rather than implying a fixed,
// final tally either way.

export const showdownSurpriseStat = (percentCorrect: number, correct: boolean): string => {
  if (correct && percentCorrect < 50) return `Only ${percentCorrect}% called this so far. Rare company.`;
  if (correct) return `${percentCorrect}% of the crowd is with you so far. Safe call.`;
  if (percentCorrect >= 50) return `${percentCorrect}% went the other way. You're the outlier here.`;
  return `Only ${percentCorrect}% have this one so far. Wrong in good company.`;
};

export const pulseSurpriseStat = (peerPercent: number): string => {
  if (peerPercent >= 40) return `${peerPercent}% landed right where you did, so far. Dead-on read.`;
  if (peerPercent <= 15) return `Only ${peerPercent}% landed where you did so far. A genuine outlier read.`;
  return `${peerPercent}% landed near you so far.`;
};

// How split opinion was on this round: 100 at a 50/50 split, 0 at consensus.
export const divisiveness = (percent: number): number => 100 - Math.abs(percent - 50) * 2;

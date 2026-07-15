// Addendum B5 — "progress you can see accruing... you're now Tuned-In
// tier." Rating only ever goes up (see game.ts's commitDay — the daily
// delta is always >= 0), so thresholds are a simple ascending ladder.
const TIERS: { floor: number; name: string }[] = [
  { floor: 0, name: 'Newcomer' },
  { floor: 1100, name: 'Regular' },
  { floor: 1250, name: 'Tuned-In' },
  { floor: 1400, name: 'In Sync' },
  { floor: 1600, name: 'Hive Mind' },
  { floor: 1800, name: 'Legend' },
];

export const tierForRating = (rating: number): string => {
  let current = TIERS[0]!.name;
  for (const tier of TIERS) {
    if (rating >= tier.floor) current = tier.name;
  }
  return current;
};

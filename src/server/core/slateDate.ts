// Real daily rotation (Addendum A1): today's date (UTC calendar day) is the
// seed for everything — same day always yields the same slate, a new UTC
// day always yields a fresh one. Pulled out of fakeSlate.ts so corpus.ts can
// use the exact same seed for its pairing-viability check as the real build
// will use (they used to use different seeds, which could let the check
// pass on a shuffle order the real per-day build didn't get).
export const getSlateDate = (): string => new Date().toISOString().slice(0, 10);

// Yesterday relative to `date` (both plain YYYY-MM-DD, UTC calendar days).
// Shared home for this so game.ts and digest.ts can't drift onto two
// different "what is yesterday" implementations.
export const previousDate = (date: string): string => {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

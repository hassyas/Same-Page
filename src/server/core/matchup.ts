import type { ShowdownPost } from '../../shared/types';
import { seededShuffle } from './seededRandom';

/**
 * Pair posts with similar scores (adjacent once sorted) so the correct
 * answer isn't obvious at a glance, then pick `count` non-overlapping pairs.
 */
export const buildMatchups = (
  pool: ShowdownPost[],
  count: number,
  seedKey: string
): [ShowdownPost, ShowdownPost][] => {
  const sorted = [...pool].sort((a, b) => b.score - a.score);
  const candidates: [ShowdownPost, ShowdownPost][] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (a.score !== b.score) candidates.push([a, b]);
  }

  const shuffled = seededShuffle(candidates, seedKey);
  const used = new Set<string>();
  const pairs: [ShowdownPost, ShowdownPost][] = [];
  for (const pair of shuffled) {
    const [a, b] = pair;
    if (used.has(a.id) || used.has(b.id)) continue;
    pairs.push(pair);
    used.add(a.id);
    used.add(b.id);
    if (pairs.length === count) break;
  }
  return pairs;
};

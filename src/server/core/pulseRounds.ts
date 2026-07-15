import type { ShowdownPost } from '../../shared/types';
import { seededShuffle } from './seededRandom';
import { SPECTRUM_TEMPLATES } from './spectrums';

export type PulseRoundSeed = {
  post: { id: string; title: string; thumb: string };
  question: string;
  leftLabel: string;
  rightLabel: string;
  spectrumId: string;
};

// Low-N reveals still need to feel alive (Addendum B6) — every dynamic
// post+template pairing starts from this hand-authored bell-shaped baseline
// until real votes accumulate on top of it. Kept deliberately light (sums to
// 30, not ~100): real votes are scoped per template+post pairing, which
// rarely repeats, so a heavier seed would dominate the shown distribution
// for a pairing's entire lifetime even as real engagement grows — this
// weight lets real votes actually move the bar within a normal day's traffic.
const DEFAULT_SEED_DISTRIBUTION = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1];

export const getDefaultSeedDistribution = (): number[] => [...DEFAULT_SEED_DISTRIBUTION];

/**
 * Picks `count` corpus posts (preferring ones not already used in today's
 * Showdown matchups) and pairs each with an evergreen spectrum template,
 * deterministically per seedKey (Addendum A2 — corpus-driven Pulse).
 */
export const buildPulseSeeds = (
  corpus: ShowdownPost[],
  usedPostIds: Set<string>,
  count: number,
  seedKey: string
): PulseRoundSeed[] => {
  const fresh = corpus.filter((p) => !usedPostIds.has(p.id));
  const pool = fresh.length >= count ? fresh : corpus;

  const posts = seededShuffle(pool, `${seedKey}:pulse-posts`).slice(0, count);
  const templates = seededShuffle(SPECTRUM_TEMPLATES, `${seedKey}:pulse-templates`);

  return posts.map((post, i) => {
    const template = templates[i % templates.length]!;
    return {
      post: { id: post.id, title: post.title, thumb: post.thumb },
      question: template.question,
      leftLabel: template.leftLabel,
      rightLabel: template.rightLabel,
      spectrumId: `${template.id}:${post.id}`,
    };
  });
};

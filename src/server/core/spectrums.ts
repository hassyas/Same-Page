import { redis } from '@devvit/web/server';
import { getApprovedSubmissions } from './submissions';

export type SpectrumTemplate = {
  id: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
};

// Evergreen — applies to any subreddit's posts with zero manual curation per
// post (Addendum A2). Real posts come from the cached corpus; only the
// axis/question here is hand-written.
export const SPECTRUM_TEMPLATES: SpectrumTemplate[] = [
  { id: 'overrated-underrated', question: 'Is this post overrated or underrated?', leftLabel: 'Overrated', rightLabel: 'Underrated' },
  { id: 'upvote-scroll', question: 'Would you upvote this or scroll past?', leftLabel: 'Scroll past', rightLabel: 'Upvote' },
  { id: 'niche-frontpage', question: 'Is this niche or front-page material?', leftLabel: 'Niche', rightLabel: 'Front-page' },
  { id: 'cursed-wholesome', question: 'Cursed or wholesome?', leftLabel: 'Cursed', rightLabel: 'Wholesome' },
  { id: 'lurk-comment', question: 'Would you lurk or leave a comment?', leftLabel: 'Just lurk', rightLabel: 'Leave a comment' },
  { id: 'boring-banger', question: 'Boring or an absolute banger?', leftLabel: 'Boring', rightLabel: 'Banger' },
  { id: 'relatable-out-of-touch', question: 'Relatable or out of touch?', leftLabel: 'Out of touch', rightLabel: 'Relatable' },
  { id: 'skip-save', question: 'Would you skip this or save it?', leftLabel: 'Skip it', rightLabel: 'Save it' },
  { id: 'lowkey-major', question: 'Is this a lowkey moment or a major one?', leftLabel: 'Lowkey', rightLabel: 'Major' },
  { id: 'chill-chaotic', question: 'Chill vibes or chaotic energy?', leftLabel: 'Chill', rightLabel: 'Chaotic' },
  { id: 'expected-shocking', question: 'Totally expected or shocking?', leftLabel: 'Expected', rightLabel: 'Shocking' },
  { id: 'meh-masterpiece', question: 'Meh or a masterpiece?', leftLabel: 'Meh', rightLabel: 'Masterpiece' },
  { id: 'private-shareworthy', question: 'Keep it private or share it with everyone?', leftLabel: 'Keep private', rightLabel: 'Share it' },
  { id: 'lucky-earned', question: 'Was this luck or hard-earned?', leftLabel: 'Pure luck', rightLabel: 'Hard-earned' },
  { id: 'petty-justified', question: 'Petty or totally justified?', leftLabel: 'Petty', rightLabel: 'Justified' },
  { id: 'niche-relatable', question: 'A niche take or something everyone gets?', leftLabel: 'Niche take', rightLabel: 'Everyone gets it' },
];

const TEMPLATE_POOL_KEY = 'spectrums:pool';
const TEMPLATE_POOL_TTL_MS = 24 * 60 * 60 * 1000;

type CachedTemplatePool = { fetchedAt: number; templates: SpectrumTemplate[] };

// Folds moderator-approved player submissions (Addendum A6's contribution
// loop) into the evergreen static templates above. Cached the same way
// corpus.ts caches its post pool — frozen for up to 24h so every player
// hitting the same day's slate sees the same pool; without this, a
// mid-day approval would shift `pool[i % pool.length]` for requests that
// land after it, splitting one day's Pulse round across two different
// spectrumIds for different players (the aggregate vote counts and the
// round itself both key off spectrumId).
export const getTemplatePool = async (): Promise<SpectrumTemplate[]> => {
  const raw = await redis.get(TEMPLATE_POOL_KEY);
  if (raw) {
    const cached = JSON.parse(raw) as CachedTemplatePool;
    if (Date.now() - cached.fetchedAt < TEMPLATE_POOL_TTL_MS) return cached.templates;
  }
  const approved = await getApprovedSubmissions();
  const templates: SpectrumTemplate[] = [
    ...SPECTRUM_TEMPLATES,
    ...approved.map((s) => ({ id: s.id, question: s.prompt, leftLabel: s.leftLabel, rightLabel: s.rightLabel })),
  ];
  await redis.set(TEMPLATE_POOL_KEY, JSON.stringify({ fetchedAt: Date.now(), templates } satisfies CachedTemplatePool));
  return templates;
};

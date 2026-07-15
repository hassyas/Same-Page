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

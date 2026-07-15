import { Dot } from './Dot';
import type { DotSize, DotState } from './Dot';

// SWARM SIGNAL Section 3 — the per-round reveal row as dots instead of the
// old 🟩🟨🟥 colored squares. Maps the server's already-tiered emoji string
// (game.ts emojiForResult) straight onto the dot triad so the tiering stays
// in one place: 🟩 → synced (filled), 🟨 → close (half), 🟥 → off-hive
// (hollow). Used on the splash reveal and Daily Result.
const EMOJI_TO_DOT: Record<string, DotState> = {
  '🟩': 'synced',
  '🟨': 'close',
  '🟥': 'offhive',
};

export const ResultDots = ({ emoji, size = 'md' }: { emoji: string; size?: DotSize }) => (
  // gap-1.5 (6px) -> gap-1 (4px) this session, proportional to the -30% dot
  // size cut below (Dot.tsx / --size-dot-lg) so the row doesn't read as
  // suddenly over-spaced relative to the now-smaller dots.
  <span className="inline-flex items-center gap-1" aria-hidden="true">
    {[...emoji].map((ch, i) => (
      <Dot key={i} state={EMOJI_TO_DOT[ch] ?? 'offhive'} size={size} />
    ))}
  </span>
);

// SWARM SIGNAL Section 3 — the Duolingo day-chain lesson, adapted to dots:
// the streak is a horizontal row of dots, one filled ember dot per kept day,
// capped at 7 rendered with a "+N" in paper-dim beyond. Replaces the 🔥 emoji
// everywhere it appeared (splash, Daily Result).
export const StreakChain = ({ streak, size = 'lg' }: { streak: number; size?: DotSize }) => {
  const rendered = Math.min(Math.max(streak, 0), 7);
  const overflow = streak - rendered;
  if (streak <= 0) {
    return <span className="text-sm font-display text-[var(--ink-soft)] tabular-nums">no streak yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${streak}-day streak`}>
      {Array.from({ length: rendered }, (_, i) => (
        <Dot key={i} state="synced" size={size} />
      ))}
      {overflow > 0 && (
        <span className="text-sm font-display text-[var(--ink-soft)] tabular-nums">+{overflow}</span>
      )}
    </span>
  );
};

// SWARM SIGNAL Section 3 — ember ▲ triangle (SVG, not emoji) beside a
// rating/delta number. Replaces the ⚡ glyph.
export const RatingTriangle = ({ className }: { className?: string }) => (
  <svg width="9" height="8" viewBox="0 0 10 9" className={className} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d="M5 0 L10 9 L0 9 Z" fill="var(--gold)" />
  </svg>
);

// SWARM SIGNAL Section 3 — "you above the swarm": three dots, two sand and one
// ember slightly higher. Replaces the 🏆 emoji on the Leaderboard header and
// anywhere rank/leaderboard is labeled.
export const RankCluster = ({ className }: { className?: string }) => (
  <svg width="26" height="18" viewBox="0 0 26 18" className={className} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <circle cx="7" cy="13" r="4" fill="var(--close)" />
    <circle cx="19" cy="13" r="4" fill="var(--close)" />
    <circle cx="13" cy="5" r="4.5" fill="var(--gold)" />
  </svg>
);

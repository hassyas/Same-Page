import { Lockup } from '../brand/Lockup';

// Archetype hues reuse the existing Bold Clay tokens (see tokens.css) —
// Hivemind/Contrarian/Wildcard are the aqua/terracotta/gold fills,
// The Quiet One (formerly "Lurker-sense", renamed in the copy rewrite
// session — the --arch-lurker CSS token name is unchanged, it's just an
// internal token name, not user-facing) is the dark ink fill.
const ARCHETYPE_COLOR: Record<string, string> = {
  Hivemind: 'var(--arch-hivemind)',
  Contrarian: 'var(--arch-contrarian)',
  Wildcard: 'var(--arch-wildcard)',
  'The Quiet One': 'var(--arch-lurker)',
};

// Computed WCAG contrast (relative-luminance, hand-verified, not eyeballed):
// ink text on aqua = 8.40:1, on terracotta = 4.94:1, on gold = 9.09:1 — all
// pass AA. The Quiet One's ink fill needs the inverse (on-canvas on ink =
// 15.97:1), matching the app's established "on-canvas text on dark
// surfaces" rule everywhere else. Now only applies to the small archetype
// badge (see below) — the card itself is always the light --tile surface
// with ink text, per the redesign moving archetype color from a full-bleed
// background to a smaller accent, matching the rest of the app's "light
// cards, bold accents" language instead of a solid color slab.
const LIGHT_FILL_ARCHETYPES = new Set(['Hivemind', 'Contrarian', 'Wildcard']);

/* Poster-scale share card. `shareText` is the exact output of
   `buildShareText()` (src/shared/shareText.ts) — reused, not reimplemented,
   so the poster's dot row always matches the artifact that actually leaves
   the app in a Reddit comment. Line 2 of that 3-line string is the dot row
   ("the Wordle grid"). */
export const SharePoster = ({
  shareText,
  archetype,
  statLabel,
  statValue,
  className = '',
}: {
  shareText: string;
  archetype?: string | undefined;
  statLabel: string;
  statValue: string;
  className?: string;
}) => {
  const dotsLine = shareText.split('\n')[1] ?? '';
  const accent = (archetype && ARCHETYPE_COLOR[archetype]) || 'var(--ink)';
  const badgeTextColor = archetype && LIGHT_FILL_ARCHETYPES.has(archetype) ? 'var(--ink)' : 'var(--on-canvas)';

  return (
    <div
      // px/pt/pb instead of a single `p-6` (which would collide with a
      // separate pb- utility at equal specificity, order-dependent in the
      // compiled stylesheet — same class of bug fixed elsewhere this
      // project, avoided outright here). pb-4 tightens the bottom edge;
      // the SVG icon below also gets a `block` className to kill its
      // default inline-baseline gap, the other real source of the
      // reported dead space.
      className={`mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-[var(--r-card)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--tile)] px-6 pt-6 pb-4 shadow-[0_6px_0_rgba(0,0,0,0.2)] ${className}`}
      style={{ borderTopWidth: '8px', borderTopColor: accent }}
    >
      <div>
        <span
          className="inline-block rounded-[var(--r-pill)] px-3 py-1 text-[var(--size-small)] font-bold uppercase tracking-widest"
          style={{ backgroundColor: accent, color: badgeTextColor }}
        >
          {archetype ?? 'Same Page'}
        </span>
        <p className="mt-3 font-display text-(length:--size-poster) font-bold leading-none text-[var(--ink)]">
          {statValue}
        </p>
        <p className="text-(length:--size-h2) text-[var(--ink-soft)]">{statLabel}</p>
      </div>
      <div className="flex flex-col gap-3">
        {/* -30% off --size-h2's own clamp this session, via a dedicated
            --size-dots-line token (not a scaled reference to --size-h2
            itself, which is a shared heading token used elsewhere in the
            app) — see tokens.css. tracking-widest is an em-based letter-
            spacing utility, so it scales down automatically with the
            smaller font-size, no separate adjustment needed there. */}
        <p className="font-mono font-nums text-(length:--size-dots-line) tracking-widest text-[var(--ink)]">{dotsLine}</p>
        <Lockup variant="mark-only" size="sm" className="opacity-90 block" />
      </div>
    </div>
  );
};

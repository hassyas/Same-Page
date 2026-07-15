import type { UserDayRecord } from './types';

// SWARM SIGNAL Section 8 — the one place unicode glyphs remain (a plain-text
// Reddit comment can't render the in-app SVG dots). Compact by design: three
// lines, no legend inside the artifact (the app's own share block shows the
// legend beneath the preview instead). One source of truth so the "copy"
// button (client) and the "post to comments" route (server) stay identical.
//
//   SAME PAGE, Jul 12
//   ●◐●○● 74% matched
//   streak 4 · Wildcard
//
// ● synced   ◐ close   ○ off-hive  — mirrors the server's already-tiered
// emoji string (🟩/🟨/🟥), so the tiering lives in one place (game.ts).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format a UTC day string "YYYY-MM-DD" as "Mon DD" without constructing a
// Date (which would drift by timezone).
const formatDate = (date: string): string => {
  const [, month, day] = date.split('-');
  const mi = Number(month) - 1;
  const mon = MONTHS[mi] ?? month ?? '';
  return `${mon} ${Number(day)}`;
};

const EMOJI_TO_DOT: Record<string, string> = { '🟩': '●', '🟨': '◐', '🟥': '○' };
const toDots = (emoji: string): string => [...emoji].map((ch) => EMOJI_TO_DOT[ch] ?? '○').join('');

// Overall "matched" %: each round contributes its alignment (Pulse) or a
// binary hit (Showdown), averaged. Reflects the same dots the row shows.
const inSyncPercent = (dayResult: UserDayRecord): number => {
  if (dayResult.results.length === 0) return 0;
  const total = dayResult.results.reduce(
    (sum, r) => sum + (r.type === 'pulse' ? r.alignment : r.correct ? 100 : 0),
    0
  );
  return Math.round(total / dayResult.results.length);
};

export const buildShareText = (dayResult: UserDayRecord): string => {
  const lines = [
    `SAME PAGE, ${formatDate(dayResult.date)}`,
    `${toDots(dayResult.emoji)} ${inSyncPercent(dayResult)}% matched`,
  ];
  const archetype = dayResult.hiveReport?.archetype;
  lines.push(archetype ? `streak ${dayResult.streak} · ${archetype}` : `streak ${dayResult.streak}`);
  return lines.join('\n');
};

import type { CSSProperties, ReactNode } from 'react';

/* big mono number (+ optional delta chip) centered above a label line below
   it, per the "number on top" reveal pattern (RevealPanel's child) — was a
   row with the number pinned right, restructured this session to stack
   and center instead, applied here once so every call site (Showdown's
   post-score rows, Tomorrow's Call's result/locked-in rows) picks it up
   consistently rather than duplicating the layout per screen. `title`
   accepts a node (not just a string) so callers can prefix a colorblind-
   safe shape glyph (e.g. Dot) before the label text. */
export const RevealRow = ({
  title,
  value,
  delta,
  valueColor,
  style,
}: {
  title: ReactNode;
  value: string;
  delta?: string | undefined;
  /* Verdict-beat color override for the value only (green/red per Global
     Rules — never the whole row, never decorative). */
  valueColor?: string | undefined;
  style?: CSSProperties | undefined;
}) => (
  <div className="flex flex-col items-center gap-1 py-2.5 text-center" style={style}>
    <span className="flex items-center gap-2">
      <span
        // Was a bare text-[var(--size-mono-lg)] — silently dropped its
        // font-size all along (the inline color style below always won
        // the cascade regardless, so this never looked broken, but the
        // intended size never actually applied either; same Tailwind v4
        // bug class fixed elsewhere this project, closed here too).
        className="font-mono font-nums tabular-nums text-(length:--size-mono-lg)"
        style={{ color: valueColor ?? 'var(--reveal-ink)' }}
      >
        {value}
      </span>
      {delta && (
        // reveal-rule as a chip bg measures ~1.2:1 against reveal-bg —
        // effectively invisible, leaving dim text with no visible chip
        // boundary to wrap inside on narrow widths. Plain reveal-ink text
        // is fully legible on its own; the ✓/✕ prefix already carries the
        // win/loss signal (colorblind-safe by design, see badgeFor()).
        <span className="whitespace-nowrap font-mono font-nums text-(length:--size-small) text-[var(--reveal-ink)]">
          {delta}
        </span>
      )}
    </span>
    <span className="flex items-center gap-1.5 text-[var(--reveal-ink)]">{title}</span>
  </div>
);

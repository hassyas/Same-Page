const SEGMENTS = 7;
const GAP_DEG = 6;
const CX = 100;
const CY = 100;
const R = 84;
const STROKE = 10;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(CX, CY, R, endAngle);
  const end = polarToCartesian(CX, CY, R, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/* 7-segment stroke-only ring; segments fill left-to-right as the streak
   climbs and wrap every 7 days (day 8 reads the same as day 1) — purely a
   decorative week-shaped read on top of the real (uncapped) streak number,
   which is what's actually scored/persisted server-side.

   Number now renders in font-display (Alfa Slab One) instead of mono, to
   match the rest of the app's brand type system rather than reading as a
   stray monospace stat. The label stays on the body font (Inter) — Alfa
   Slab One is heavy/blocky enough that a small uppercase label in it would
   hurt legibility, so this is a deliberate mixed pairing, not an oversight.

   Sizing ratio (numberFontPx) was reduced from the original mono-based
   value to compensate for Alfa Slab One being visibly wider/heavier per
   character than JetBrains Mono at the same font-size — without this
   adjustment the font swap would reintroduce the exact ring-overflow bug
   this component was already fixed for once. */
export const StreakRing = ({ streak, size }: { streak: number; size?: number }) => {
  const activeCount = streak > 0 ? ((streak - 1) % SEGMENTS) + 1 : 0;
  const segDeg = 360 / SEGMENTS;
  const numericSize = size ?? 170;
  const dimension = size ? `${size}px` : 'clamp(140px, 40vw, 200px)';
  const numberFontPx = Math.max(14, Math.round(numericSize * 0.19));
  const labelFontPx = Math.max(8, Math.round(numericSize * 0.07));

  return (
    <div
      className="relative inline-flex items-center justify-center rounded-full border-[var(--border-w)] border-[var(--ink)] bg-[var(--gold-tint)] shadow-[0_6px_0_var(--gold-deep)]"
      style={{ width: dimension, height: dimension }}
    >
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const start = i * segDeg + GAP_DEG / 2;
          const end = (i + 1) * segDeg - GAP_DEG / 2;
          return (
            <path
              key={i}
              d={describeArc(start, end)}
              fill="none"
              stroke={i < activeCount ? 'var(--gold-deep)' : 'var(--ink-soft)'}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-4 text-center">
        <span
          className="font-display leading-none text-[var(--ink)]"
          style={{ fontSize: `${numberFontPx}px` }}
        >
          {streak}
        </span>
        <span
          className="uppercase leading-tight text-[var(--ink-soft)] whitespace-nowrap"
          style={{ fontSize: `${labelFontPx}px`, letterSpacing: '0.02em' }}
        >
          -day streak
        </span>
      </div>
    </div>
  );
};

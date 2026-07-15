// The signature element of the bold-clay identity — a two-tone aqua/
// terracotta proportional bar for any binary split (Showdown reveal %
// correct/incorrect, Daily Result rounds-right/missed). Reuse this
// everywhere there's a "how did the crowd split" moment; don't let a screen
// invent its own version of "show a percentage." Static (no mount
// animation) — the bar itself communicates the split without needing motion.
type Props = {
  leftPercent: number; // 0-100, aqua side
  leftLabel: string;
  rightLabel: string;
  className?: string;
};

export const SplitBar = ({ leftPercent, leftLabel, rightLabel, className = '' }: Props) => {
  const left = Math.max(0, Math.min(100, leftPercent));
  const right = 100 - left;
  return (
    <div className={className}>
      <div className="flex h-6 w-full overflow-hidden rounded-[var(--r-pill)] border-[var(--border-w)] border-[var(--ink)]">
        <div className="h-full bg-[var(--aqua)]" style={{ width: `${left}%` }} />
        <div className="h-full bg-[var(--terracotta)]" style={{ width: `${right}%` }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-sm font-bold">
        {/* -deep variants, not the raw duel hues — aqua/terracotta both fail
            AA as text on a white surface (Phase 0 contrast audit). */}
        <span className="text-[var(--aqua-deep)]">{leftLabel}</span>
        <span className="text-[var(--terracotta-deep)]">{rightLabel}</span>
      </div>
    </div>
  );
};

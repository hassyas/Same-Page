import { assertNoEmoji } from './assertNoEmoji';

/* Labeled pill, mono value. Caller wraps multiple chips in flex-wrap gap-2. */
export const StatChip = ({ label, value, className = '' }: { label: string; value: string; className?: string }) => {
  assertNoEmoji('StatChip', label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-[var(--rule)] bg-[var(--tile)] px-3 py-1.5 text-[var(--size-small)] ${className}`}
    >
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span className="font-mono font-nums tabular-nums text-[var(--ink)]">{value}</span>
    </span>
  );
};

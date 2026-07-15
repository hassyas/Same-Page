import { GhostButton } from './GhostButton';

/* Display headline + one ghost CTA, no mascot. */
export const EmptyState = ({
  headline,
  ctaLabel,
  onCta,
}: {
  headline: string;
  ctaLabel: string;
  onCta: () => void;
}) => (
  <div className="flex flex-col items-center gap-3 py-6 text-center">
    <p className="font-display font-bold text-[var(--size-h2)]">{headline}</p>
    <GhostButton onClick={onCta}>{ctaLabel}</GhostButton>
  </div>
);

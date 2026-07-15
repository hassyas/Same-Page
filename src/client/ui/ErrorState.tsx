import { RevealPanel } from './RevealPanel';
import { PrimaryButton } from './PrimaryButton';

/* Standard error state: dark RevealPanel, a mono status code, Retry. */
export const ErrorState = ({ code, onRetry }: { code: string; onRetry: () => void }) => (
  <RevealPanel label="Something broke">
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="font-mono font-nums text-sm text-[var(--reveal-dim)]">{code}</span>
      <PrimaryButton onClick={onRetry}>Retry</PrimaryButton>
    </div>
  </RevealPanel>
);

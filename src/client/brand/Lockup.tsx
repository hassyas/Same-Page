import { HiveMark } from './HiveMark';
import { Wordmark } from './Wordmark';

type LockupVariant = 'stacked' | 'inline' | 'mark-only';
type LockupSize = 'sm' | 'md' | 'lg';

// `sm` bumped 16→24 for splash.tsx's front-screen title read (the only
// `inline`-variant call site — SharePoster's `mark-only` doesn't render the
// wordmark, so this doesn't touch it). HiveMark's own `sm` size (20px,
// SIZE_PX below) is untouched — icon stays small beside the now-bigger
// title, a normal lockup proportion, not a bug.
const WORDMARK_SIZE: Record<LockupSize, number> = { sm: 24, md: 22, lg: 34 };

export const Lockup = ({
  variant = 'inline',
  size = 'md',
  className = '',
}: {
  variant?: LockupVariant;
  size?: LockupSize;
  className?: string;
}) => {
  if (variant === 'mark-only') {
    return <HiveMark size={size} variant="duo" className={className} />;
  }
  const direction = variant === 'stacked' ? 'flex-col' : 'flex-row';
  return (
    <div className={`flex ${direction} items-center gap-2 ${className}`}>
      <HiveMark size={size} variant="duo" />
      <Wordmark size={WORDMARK_SIZE[size]} />
    </div>
  );
};

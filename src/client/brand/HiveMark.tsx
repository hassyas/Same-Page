/* Geometric mark: one large hex + two small offset hexes, no mascot, no
   gradient/stroke/glow. All fills via currentColor (mono) or --ink/--gold
   (duo) so it drops onto any surface without a prop for every color. */
import { hexPoints } from '../hexPoints';

type HiveMarkSize = 'sm' | 'md' | 'lg';
type HiveMarkVariant = 'mono' | 'duo';

const SIZE_PX: Record<HiveMarkSize, number> = { sm: 20, md: 48, lg: 96 };

const BIG_HEX = hexPoints(20, 24, 16);
const SMALL_HEX_A = hexPoints(34, 14, 8);
const SMALL_HEX_B = hexPoints(36, 32, 8);

export const HiveMark = ({
  size = 'md',
  variant = 'mono',
  className,
}: {
  size?: HiveMarkSize;
  variant?: HiveMarkVariant;
  className?: string;
}) => {
  const px = SIZE_PX[size];
  const bigFill = variant === 'duo' ? 'var(--ink)' : 'currentColor';
  const smallFill = variant === 'duo' ? 'var(--gold)' : 'currentColor';
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Same Page"
      className={className}
    >
      <polygon points={BIG_HEX} fill={bigFill} />
      <polygon points={SMALL_HEX_A} fill={smallFill} />
      <polygon points={SMALL_HEX_B} fill={smallFill} />
    </svg>
  );
};

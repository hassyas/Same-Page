/* "Same Page" in the display face — a single <text>, no letter-overlap
   trick (that was tuned for Fraunces's thin serif strokes; Alfa Slab One's
   heavy slab strokes would just collide if pulled together the same way). */

export const Wordmark = ({ size = 28, className }: { size?: number; className?: string }) => {
  return (
    <svg
      width={size * 6}
      height={size * 1.4}
      viewBox={`0 0 ${size * 6} ${size * 1.4}`}
      role="img"
      aria-label="Same Page"
      className={className}
    >
      <text
        x="0"
        y={size}
        fontFamily="var(--font-display)"
        fontWeight={400}
        fontSize={size}
        fill="currentColor"
      >
        Same Page
      </text>
    </svg>
  );
};

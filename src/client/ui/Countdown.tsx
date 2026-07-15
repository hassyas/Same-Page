/* Neutral only — no pulse, no urgency color, ever (Global Rules). Takes the
   already-formatted label; the actual time math stays in useUnlockCountdown.
   `tone` picks the correct neutral for the surface it's rendered on — a
   white tile card (default) vs. directly on the dark canvas. */
export const Countdown = ({
  label,
  className = '',
  tone = 'surface',
}: {
  label: string;
  className?: string;
  tone?: 'surface' | 'canvas';
}) => (
  <p
    className={`text-(length:--size-small) ${tone === 'canvas' ? 'text-[var(--on-canvas-soft)]' : 'text-[var(--ink-soft)]'} ${className}`}
  >
    {label}
  </p>
);

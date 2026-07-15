import { useSound } from '../audio/useSound';

/* Icon-only, so it carries its own aria-label. Two thin bars for "off"
   (no sound waves) vs. three curved bars for "on" — shape difference, not
   color, carries the state (consistent with the app's colorblind-safe
   Dot language elsewhere). */
export const SoundToggle = ({ className = '' }: { className?: string }) => {
  const { enabled, toggle } = useSound();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={enabled ? 'Mute sound' : 'Unmute sound'}
      aria-pressed={enabled}
      className={`flex h-11 w-11 items-center justify-center rounded-full border-[var(--border-w)] border-[var(--on-canvas-soft)] text-[var(--on-canvas)] focus-visible:outline-2 focus-visible:outline-[var(--gold)] focus-visible:outline-offset-[3px] ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M2 7v4h3l4 3V4L5 7H2Z" fill="currentColor" />
        {enabled ? (
          <path
            d="M12 6c1.2 1 1.2 5 0 6M14.2 4.2c2.4 2.4 2.4 7.2 0 9.6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path d="M12 6l4 6M16 6l-4 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
};

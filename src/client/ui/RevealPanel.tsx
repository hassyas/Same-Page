import type { ReactNode } from 'react';

/* Dark data panel, only ever shown post-reveal. w-full, --r-card. */
export const RevealPanel = ({
  children,
  label,
  className = '',
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) => (
  <div className={`w-full rounded-[var(--r-card)] bg-[var(--reveal-bg)] p-4 ${className}`}>
    {/* Found while touching this file for the RevealRow restructure: a
        bare text-[var(--size-small)] + a separate color class is the same
        Tailwind v4 ambiguous-compilation collision fixed elsewhere this
        project multiple times — this file was named as a candidate long
        ago but never actually swept. Fixed with the same proven syntax. */}
    {label && (
      <p className="mb-2 text-(length:--size-small) uppercase tracking-widest text-[var(--reveal-dim)]">{label}</p>
    )}
    <div className="flex flex-col divide-y divide-[var(--reveal-rule)]">{children}</div>
  </div>
);

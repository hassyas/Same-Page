import type { ReactNode } from 'react';

/* 1-col <=380px, 2-col 381-639px, 4-col >=640px (Tailwind's default `sm`). */
export const TileGrid = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`grid grid-cols-1 gap-2 min-[381px]:grid-cols-2 sm:grid-cols-4 ${className}`}>{children}</div>
);

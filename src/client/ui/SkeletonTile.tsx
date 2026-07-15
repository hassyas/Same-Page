/* Loading-state placeholder — same footprint as Tile so a skeleton screen
   doesn't jump when real content replaces it. */
export const SkeletonTile = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const heightClass = size === 'sm' ? 'h-10' : size === 'lg' ? 'h-20' : 'h-14';
  return (
    <div
      className={`w-full rounded-[var(--r-tile)] border border-[var(--rule)] bg-[var(--rule)] animate-shimmer motion-reduce:animate-none motion-reduce:opacity-70 ${heightClass} ${className}`}
      aria-hidden="true"
    />
  );
};

import { useCallback, useState, type ReactNode } from 'react';
import { isSoundEnabled, playSound, setSoundEnabled } from './procSfx';
import { SoundContext } from './soundContext';

/* Headless — no DOM. Reads localStorage.samepage.sound once on mount, so
   first paint is always muted (empty storage) regardless of a prior visit's
   choice landing a tick later. */
export const SoundProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  return <SoundContext.Provider value={{ enabled, toggle, play: playSound }}>{children}</SoundContext.Provider>;
};

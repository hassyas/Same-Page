import { createContext } from 'react';
import type { SoundName } from './procSfx';

export type SoundContextValue = {
  enabled: boolean;
  toggle: () => void;
  play: (name: SoundName) => void;
};

export const SoundContext = createContext<SoundContextValue | null>(null);

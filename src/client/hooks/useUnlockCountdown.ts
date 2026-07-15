import { useEffect, useState } from 'react';

// Addendum B5 — "show 'tomorrow's slate unlocks in Xh' so the appointment
// is concrete and felt in-session." Rotation boundary is UTC calendar day
// (see Decisions log), so this is just time-to-next-UTC-midnight.
const formatCountdown = (): string => {
  const now = new Date();
  const nextMidnightUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  const msLeft = Math.max(0, nextMidnightUTC - now.getTime());
  const hours = Math.floor(msLeft / (1000 * 60 * 60));
  const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 1) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

export const useUnlockCountdown = (): string => {
  const [label, setLabel] = useState(formatCountdown);

  useEffect(() => {
    const id = window.setInterval(() => setLabel(formatCountdown()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return label;
};

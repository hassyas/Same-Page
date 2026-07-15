import { useEffect, useState } from 'react';
import { fetchWithTimeout } from '../fetchWithTimeout';
import type { LeaderboardResponse } from '../../shared/api';
import type { LeaderboardBoard } from '../../shared/types';
import { SwarmField } from '../components/SwarmField';
import { RankCluster } from '../components/indicators';
import { Tile } from '../ui/Tile';
import { PrimaryButton } from '../ui/PrimaryButton';
import { GhostButton } from '../ui/GhostButton';
import { SkeletonTile } from '../ui/SkeletonTile';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { ENTER, staggerDelay } from '../motion';

type Props = {
  onBack: () => void;
  subredditName: string | null;
};

type Tab = 'allTime' | 'weekly';

// Matches GhostButton's own shadow exactly (see GhostButton.tsx) — used to
// override the active tab's PrimaryButton "gold" variant shadow, which is
// otherwise 1px deeper with a larger blur layer, so both tab states read
// as the same footprint regardless of which is active.
const TAB_SHADOW = '0 6px 0 var(--ink), 0 9px 14px rgba(0,0,0,0.3)';

// SWARM SIGNAL Section 5e — avatar initials recolor to a fixed 4-hue WARM set
// derived from the palette. Off-hive blue is deliberately excluded — it's
// semantic-only, so it can never appear decoratively. Deterministic per
// username so the same person keeps the same color across reloads.
const AVATAR_COLORS: { bg: string; fg: string }[] = [
  { bg: '#c9b999', fg: '#171310' }, // sand
  { bg: '#c97f1b', fg: '#f3ead9' }, // ember-deep
  { bg: '#b7a995', fg: '#171310' }, // paper-dim
  { bg: '#8a6d4f', fg: '#f3ead9' }, // muted brown
];

const avatarColor = (username: string) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
};

const initial = (username: string): string => username.replace(/^u\//, '').charAt(0).toUpperCase() || '?';

const AVATAR_SIZE_PX = 32;

export const Leaderboard = ({ onBack, subredditName }: Props) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('allTime');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchWithTimeout('/api/leaderboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LeaderboardResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const board: LeaderboardBoard | null = data ? (tab === 'allTime' ? data.allTime : data.weekly) : null;
  const selfInTop = board?.self ? board.top.some((row) => row.userId === board.self!.userId) : true;
  // Own row pinned to top: real rank number is preserved (not renumbered),
  // only its position in the list moves.
  const orderedRows = board
    ? board.self && !selfInTop
      ? [board.self, ...board.top]
      : board.self
        ? [board.self, ...board.top.filter((row) => row.userId !== board.self!.userId)]
        : board.top
    : [];

  const renderRow = (row: LeaderboardBoard['top'][number], isSelf: boolean, index: number) => {
    const avatar = avatarColor(row.username);
    return (
      <Tile
        key={row.userId}
        state={isSelf ? 'selected' : 'idle'}
        size="md"
        className={`${ENTER} ${isSelf ? 'bg-[var(--aqua-tint)] border-[var(--aqua-deep)]' : ''}`}
        style={staggerDelay(Math.min(index, 6))}
      >
        <div className="flex items-center gap-3">
          <span
            className={`shrink-0 w-7 font-mono font-nums tabular-nums text-(length:--size-mono-lg) ${row.rank === 1 ? 'font-bold text-[var(--gold-deep)]' : 'text-[var(--ink-soft)]'}`}
          >
            #{row.rank}
          </span>
          <span
            className="shrink-0 flex items-center justify-center rounded-full text-sm font-display font-semibold"
            style={{ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX, backgroundColor: avatar.bg, color: avatar.fg }}
            aria-hidden="true"
          >
            {initial(row.username)}
          </span>
          <span className="flex-1 min-w-0 truncate text-left">{row.username}</span>
          <span className="shrink-0 font-mono font-nums tabular-nums">{row.score.toLocaleString()}</span>
        </div>
      </Tile>
    );
  };

  return (
    <div
      className="relative flex flex-col gap-4 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4"
      style={{ color: 'var(--on-canvas)' }}
    >
      {/* Section 4/5e — the swarm field sits behind the header only (never
          behind the rows, which need to stay legible). */}
      <div className="relative overflow-hidden rounded-[var(--r-tile)] py-3">
        <SwarmField seed="leaderboard" />
        <h2 className="relative flex items-center justify-center gap-2 font-display font-bold text-(length:--size-h2) text-[var(--on-canvas)]">
          <RankCluster /> Who reads {subredditName ? `r/${subredditName}` : 'this sub'} best
        </h2>
      </div>

      {/* Tab-height investigation (this session): PrimaryButton and
          GhostButton already share an identical box model (both h-12,
          px-6, border-[var(--border-w)] — confirmed by reading both
          components, the "different default padding/height" hypothesis
          in the brief doesn't hold up against the actual code). The one
          real, confirmed asymmetry: PrimaryButton's "gold" variant shadow
          is a 7px offset + a larger blur layer, GhostButton's is 6px +
          smaller blur — a visual (not layout) difference that can still
          read as "sits differently" at a glance. Equalized here via an
          explicit style override so both tab states render pixel-
          identical geometry regardless of which is active, without
          touching the shared `gold` variant used elsewhere (tier-up pill,
          Decider badge) where the original deeper shadow is unaffected. */}
      <div className="flex justify-center gap-2">
        {tab === 'allTime' ? (
          <PrimaryButton variant="gold" onClick={() => setTab('allTime')} style={{ boxShadow: TAB_SHADOW }}>
            All-time
          </PrimaryButton>
        ) : (
          <GhostButton onClick={() => setTab('allTime')}>All-time</GhostButton>
        )}
        {tab === 'weekly' ? (
          <PrimaryButton variant="gold" onClick={() => setTab('weekly')} style={{ boxShadow: TAB_SHADOW }}>
            This week
          </PrimaryButton>
        ) : (
          <GhostButton onClick={() => setTab('weekly')}>This week</GhostButton>
        )}
      </div>

      {/* Root-cause investigation (item 4, submission-day session): weekly
          can legitimately show a HIGHER number than all-time for the same
          rank — they're two different metrics, not a bug. All-time is
          `rating` (server: game.ts), a slow-climbing score starting at 1000
          that only ever gains max(2, syncScore/20) per day played. Weekly
          is `recordWeeklyScore`'s raw zIncrBy of that day's full syncScore,
          uncapped, resetting every Monday — a few strong days can easily
          outpace months of rating creep. Traced, not guessed: both call
          sites are game.ts:110/141 (rating) and :152 (weekly). Clarifying
          caption added here rather than "fixing" correct behavior.
          Font bumped text-xs->text-sm and margin -mt-2->mt-1 this session
          (was reading as cramped, per direct feedback). */}
      <p className="text-center text-sm text-[var(--on-canvas-soft)] mt-1">
        {tab === 'allTime'
          ? 'Crowd Score. Climbs slowly, never resets.'
          : 'Sum of match scores this week. Resets every Monday.'}
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          <SkeletonTile />
          <SkeletonTile />
          <SkeletonTile />
        </div>
      ) : error ? (
        <ErrorState code="leaderboard:fetch-failed" onRetry={() => void load()} />
      ) : !board || board.top.length === 0 ? (
        <EmptyState headline="Nobody's topped the board yet." ctaLabel="Back" onCta={onBack} />
      ) : (
        // Tabs share one fetch, so switching is instant client-side data —
        // key={tab} remounts this block so it crossfades in, not hard-swaps.
        <div key={tab} className={`flex flex-col gap-2 ${ENTER}`}>
          {orderedRows.map((row, index) => renderRow(row, row.userId === board.self?.userId, index))}
        </div>
      )}

      <GhostButton onClick={onBack} className="mt-2 self-center">
        Back
      </GhostButton>
    </div>
  );
};

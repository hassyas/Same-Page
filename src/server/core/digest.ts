import { redis, reddit, context } from '@devvit/web/server';
import { getUserDay } from './game';
import { dayKey } from './leaderboard';
import { previousDate } from './slateDate';

// "Next level" brainstorm item #2 — Daily Crowd Digest (originally named
// "Daily Hive Digest", renamed in the copy rewrite session): one app-authored
// comment per day (not per player) recapping yesterday's slate, posted as
// the app (runAs: 'APP', no permission grant needed — that's only required
// for runAs: 'USER'). This is the community ritual layer: the existing share
// button is a player talking about themselves, this is the game talking to
// the whole subreddit so players argue in the replies instead of N
// disconnected share posts.

const digestLockKey = (date: string): string => `digest:${date}:lock`;

// Cap how many of a day's players get pulled into the archetype mix — a
// hackathon-scale daily player count will never approach this, and it keeps
// a pathological future case from doing an unbounded number of reads.
const MAX_MEMBERS_FOR_MIX = 200;

const buildDigestText = async (date: string): Promise<string | null> => {
  const members = await redis.zRange(dayKey(date), 0, MAX_MEMBERS_FOR_MIX - 1, { by: 'rank' });
  if (members.length === 0) return null;

  const records = await Promise.all(members.map((m) => getUserDay(m.member, date)));
  const sample = records.find((r): r is NonNullable<typeof r> => r !== null);
  if (!sample) return null;
  // Search the whole roster for a most-divisive line rather than trusting
  // the first record to have one — records committed before that field
  // existed (a known gotcha class in this codebase) would otherwise
  // silently drop the line even when every other record carries it.
  const mostDivisive = records.find((r) => r?.mostDivisive)?.mostDivisive ?? null;

  const archetypeCounts = new Map<string, number>();
  for (const rec of records) {
    const archetype = rec?.hiveReport?.archetype;
    if (archetype) archetypeCounts.set(archetype, (archetypeCounts.get(archetype) ?? 0) + 1);
  }
  const totalWithArchetype = [...archetypeCounts.values()].reduce((a, b) => a + b, 0);
  const mixLine =
    totalWithArchetype > 0
      ? [...archetypeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => `${Math.round((count / totalWithArchetype) * 100)}% ${name}`)
          .join(', ')
      : null;

  const playerCount = members.length;
  const lines = [
    `**Daily Crowd Digest: ${date}**`,
    '',
    `${playerCount} crowd member${playerCount === 1 ? '' : 's'} played yesterday's slate.`,
  ];
  if (mostDivisive) lines.push(mostDivisive.message);
  if (mixLine) lines.push(`Crowd mix: ${mixLine}.`);
  lines.push('', 'Defend your pick below.');

  return lines.join('\n');
};

// Lazy trigger, no scheduler dependency (same pattern the rest of this app
// already uses for daily rotation): called from the first `/slate/complete`
// after a UTC rollover. `hSetNX` guarantees only the first caller across all
// players who roll into the new day actually posts, everyone else no-ops.
export const maybePostDailyDigest = async (currentDate: string): Promise<void> => {
  const date = previousDate(currentDate);
  const wonLock = await redis.hSetNX(digestLockKey(date), 'posted', '1');
  if (!wonLock) return;

  // Best-effort, once only: if this throws (rate limit, transient API
  // error), the lock above already stands and this date's digest simply
  // never gets posted — same accepted risk profile as this app's other
  // once-only side effects (e.g. the share-comment guard), not worth a
  // retry queue for a single daily recap comment.
  try {
    if (!context.postId) return;
    const text = await buildDigestText(date);
    if (!text) return;
    await reddit.submitComment({ id: context.postId, text, runAs: 'APP' });
  } catch (error) {
    console.error('Daily digest: failed to post', error);
  }
};

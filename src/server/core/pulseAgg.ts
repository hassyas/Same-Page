import { redis } from '@devvit/web/server';

const BUCKET_COUNT = 10;
const aggKey = (spectrumId: string) => `pulse:${spectrumId}:agg`;

export const bucketIndex = (value: number): number =>
  Math.min(BUCKET_COUNT - 1, Math.max(0, Math.floor(value / (100 / BUCKET_COUNT))));

export const recordPulseVote = async (spectrumId: string, value: number): Promise<void> => {
  const bucket = bucketIndex(value);
  await redis.hIncrBy(aggKey(spectrumId), `b${bucket}`, 1);
};

// Blends real votes on top of a hand-authored seed distribution so low-N
// reveals still feel alive (Addendum B6: "the hive so far").
export const getBlendedDistribution = async (
  spectrumId: string,
  seedDistribution: number[]
): Promise<number[]> => {
  const real = await redis.hGetAll(aggKey(spectrumId));
  return seedDistribution.map((seedCount, i) => seedCount + Number(real[`b${i}`] ?? 0));
};

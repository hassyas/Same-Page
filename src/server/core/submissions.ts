import { redis } from '@devvit/web/server';
import type { SpectrumSubmission } from '../../shared/types';

// Addendum A6 — contribution loop, lean/end-to-end version: real players
// pitch a Pulse spectrum idea, stored for review. Surfacing an approved
// submission into the live daily rotation is a manual curation step for
// now, not automated — see PROGRESS.md.
const MAX_PENDING_PER_USER = 5;
const submissionKey = (id: string) => `submission:${id}`;
const userSubmissionsKey = (userId: string) => `submissions:by-user:${userId}`;
const QUEUE_KEY = 'submissions:queue';

const generateId = (): string => `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getUserSubmissions = async (userId: string): Promise<SpectrumSubmission[]> => {
  const entries = await redis.zRange(userSubmissionsKey(userId), 0, 999, {
    by: 'rank',
    reverse: true,
  });
  if (entries.length === 0) return [];

  const raw = await redis.mGet(entries.map((e) => submissionKey(e.member)));
  return raw
    .filter((r): r is string => r !== null)
    .map((r) => JSON.parse(r) as SpectrumSubmission);
};

export const submitSpectrum = async (
  userId: string,
  prompt: string,
  leftLabel: string,
  rightLabel: string
): Promise<SpectrumSubmission> => {
  const existing = await getUserSubmissions(userId);
  const pendingCount = existing.filter((s) => s.status === 'pending').length;
  if (pendingCount >= MAX_PENDING_PER_USER) {
    throw new Error('Too many pending submissions. Wait for review before submitting more.');
  }

  const submission: SpectrumSubmission = {
    id: generateId(),
    userId,
    prompt,
    leftLabel,
    rightLabel,
    createdAt: Date.now(),
    status: 'pending',
  };

  await Promise.all([
    redis.set(submissionKey(submission.id), JSON.stringify(submission)),
    redis.zAdd(QUEUE_KEY, { member: submission.id, score: submission.createdAt }),
    redis.zAdd(userSubmissionsKey(userId), { member: submission.id, score: submission.createdAt }),
  ]);

  return submission;
};

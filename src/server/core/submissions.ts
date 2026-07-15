import { redis } from '@devvit/web/server';
import type { SpectrumSubmission } from '../../shared/types';

// Addendum A6 — contribution loop, lean/end-to-end version: real players
// pitch a Pulse spectrum idea, stored for review. Surfacing an approved
// submission into the live daily rotation is a manual curation step,
// exercised via the "Approve next submission" / "Reject next submission"
// moderator menu items (see menu.ts) — approved submissions are folded into
// the Pulse template pool by spectrums.ts's getTemplatePool().
const MAX_PENDING_PER_USER = 5;
const submissionKey = (id: string) => `submission:${id}`;
const userSubmissionsKey = (userId: string) => `submissions:by-user:${userId}`;
const QUEUE_KEY = 'submissions:queue';
const APPROVED_KEY = 'submissions:approved';

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

export type SubmissionDecision = 'approved' | 'rejected';

// Minimal moderator review: Devvit Web menu items are fire-and-forget with
// no list/picker UI, so review works by walking the pending queue in FIFO
// order — repeated clicks on "Approve next submission" / "Reject next
// submission" each pop the oldest still-pending item, decide it, and the
// caller toasts back exactly what was just decided (see menu.ts).
export const decideNextSubmission = async (
  decision: SubmissionDecision
): Promise<SpectrumSubmission | null> => {
  const oldest = await redis.zRange(QUEUE_KEY, 0, 0, { by: 'rank' });
  if (oldest.length === 0) return null;
  const id = oldest[0]!.member;
  await redis.zRem(QUEUE_KEY, [id]);

  const raw = await redis.get(submissionKey(id));
  if (!raw) return null; // stale queue entry (submission key missing) — already dropped above

  const submission: SpectrumSubmission = { ...(JSON.parse(raw) as SpectrumSubmission), status: decision };
  await Promise.all([
    redis.set(submissionKey(id), JSON.stringify(submission)),
    decision === 'approved'
      ? redis.zAdd(APPROVED_KEY, { member: id, score: submission.createdAt })
      : Promise.resolve(undefined),
  ]);
  return submission;
};

// Read by spectrums.ts's getTemplatePool() to fold approved player
// submissions into the Pulse rotation — kept here so submissions.ts stays
// the one place that knows about submission storage/status.
export const getApprovedSubmissions = async (): Promise<SpectrumSubmission[]> => {
  const entries = await redis.zRange(APPROVED_KEY, 0, 999, { by: 'rank' });
  if (entries.length === 0) return [];
  const raw = await redis.mGet(entries.map((e) => submissionKey(e.member)));
  return raw.filter((r): r is string => r !== null).map((r) => JSON.parse(r) as SpectrumSubmission);
};

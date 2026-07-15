import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { decideNextSubmission } from '../core/submissions';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

// Minimal moderator review (Addendum A6 contribution loop): no picker UI —
// Devvit Web menu items are fire-and-forget — so review walks the pending
// queue FIFO. Repeated taps process one submission at a time; the toast
// reports exactly what was just decided so there's an audit trail.
menu.post('/approve-submission', async (c) => {
  try {
    const decided = await decideNextSubmission('approved');
    return c.json<UiResponse>(
      {
        showToast: decided
          ? `Approved: "${decided.prompt}" (${decided.leftLabel} / ${decided.rightLabel}) — now in the Pulse rotation.`
          : 'No pending submissions.',
      },
      200
    );
  } catch (error) {
    console.error(`Error approving submission: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to approve submission' }, 400);
  }
});

menu.post('/reject-submission', async (c) => {
  try {
    const decided = await decideNextSubmission('rejected');
    return c.json<UiResponse>(
      { showToast: decided ? `Rejected: "${decided.prompt}"` : 'No pending submissions.' },
      200
    );
  } catch (error) {
    console.error(`Error rejecting submission: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to reject submission' }, 400);
  }
});

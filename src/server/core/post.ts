import { reddit, context } from '@devvit/web/server';

// The literal post a player (or a judge) first clicks into — was just the
// bare app slug 'karmic-sense' with no body, which reads as an abandoned
// dev/test stub rather than an invitation to play. `textFallback` covers
// old.reddit.com/non-JS viewers, who would otherwise see nothing at all.
export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Same Page — today’s slate is live',
    textFallback: {
      text: `Five rounds a day. Guess how r/${context.subredditName} actually reacted — not what you'd guess, what the crowd did. Open this post to play today's slate.`,
    },
  });
};

# Same Page

**A daily game about knowing your community's mind — not your own.**

Built for [Reddit's Games with a Hook Hackathon](https://redditgameswithahook.devpost.com/) on [Devvit Web](https://developers.reddit.com/).

> The app's registered developer-platform name is `karmic-sense` (the "Same Page" name was already taken) — the two refer to the same app. In-game, on the subreddit, and everywhere a player sees it, it's called **Same Page**.

## What it is

Every day, your subreddit gets one shared 5-round slate built from its own real posts. You're not guessing your own opinion — you're guessing the crowd's. Get in sync with how everyone else actually reacted, and your score (and streak) climbs.

Two round types, mixed together, plus a Round 5 twist:

- **Showdown** — Two real posts from the sub, face to face. Pick which one scored higher. Then bet how sure you are: **Lock it in** for bigger points if you're right, or **Hedge** to bank something safer either way.
- **Pulse** — Don't share your own take. Instead, guess where the *whole crowd* landed on a real spectrum question tied to a real post — then see how close your guess was to the actual distribution.
- **The Decider** — Round 5 always pays double. Whatever you've built up over the first four rounds, this is the round that swings it.

Every reveal leads with the surprise: how rare or common your read actually was, not just whether you were "right."

## After the slate

- **Daily Result** — your synced score, your streak, a rating tier that only ever climbs, and a "Hive Report" that reads your session back to you as one of a few community-reaction archetypes (with a discussion prompt worth bringing to the comments).
- **Tomorrow's Call** — an optional side bet on which of two brand-new posts will score higher by this time tomorrow. Resolves itself, silently, the next time you check in — a reason to come back beyond just the streak.
- **Leaderboard** — an all-time rating (slow, never resets) and a this-week score (resets Monday), so a single great day and a long steady one are both worth something.
- **Submit a Round** — pitch your own Showdown matchup or Pulse question. Submissions queue for moderator review; this is how the community feeds the game back into itself instead of only consuming it.

Come back daily: a new slate rotates in every day (UTC), your streak/rating persist, and a community digest recaps the previous day's results as a comment on the app's own post — no login flow, no separate app, just the subreddit you're already in.

## Why it's built this way

This app deliberately avoids the things the hackathon's own judging criteria call out as tells of a lazy Reddit game: no Snoo, no karma-as-a-score gimmick, no gradient-hero/generic-AI-app look, no jargon like "sync" or "hive" left in the final copy (an earlier pass explicitly rewrote all of that into plain English). The one thing it does lean into on purpose is the platform itself — every round is built from real posts and real community reaction on the subreddit it's installed in, which is the whole point: it's a game about *this* community, not a generic trivia shell wearing a Reddit skin.

## How to play (quick version)

1. Open today's post. If you haven't played yet, tap in.
2. Answer all 5 rounds — pick, bet, or guess, depending on the round type.
3. Watch each reveal: the surprise stat first, then whether you synced with the crowd.
4. Round 5 pays double — make it count.
5. See your Daily Result, check the Leaderboard, maybe pitch a round of your own, and come back tomorrow for a new slate.

## Tech stack

- [Devvit Web](https://developers.reddit.com/) — Reddit's developer platform (the app runs as a webview inside a Reddit post)
- [React](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/) — client
- [Hono](https://hono.dev/) — server routes
- Redis (via Devvit's built-in persistence) — all game state: daily slates, scores, streaks, leaderboard, submissions
- [Tailwind CSS](https://tailwindcss.com/) — styling
- No Phaser — this entry is Devvit Web only, not entered in the Phaser category

## Commands

Run from this directory (`npm create devvit@latest` scaffolded it; Node ≥22 required):

- `npm run dev` — starts `devvit playtest`, a live dev server on a real (test) subreddit
- `npm run build` — builds the client and server bundles
- `npm run deploy` — type-checks, lints, then uploads a new app version to the Developer Platform
- `npm run launch` — `deploy`, then files a publish request for full-directory review
- `npm run login` — logs the Devvit CLI into Reddit
- `npm run type-check` — `tsc --build`
- `npm run simulate` — runs the project's own regression harness (bundles the real server logic with `esbuild`, drives it against an in-memory Redis mock — see `scripts/simulate/`) without needing a live Reddit connection

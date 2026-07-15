import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  AnswerRequest,
  AnswerResponse,
  CompleteRequest,
  CompleteResponse,
  LeaderboardResponse,
  MySubmissionsResponse,
  ShareCommentResponse,
  SlateResponse,
  SubmitSpectrumRequest,
  SubmitSpectrumResponse,
  TomorrowsCallPickRequest,
  TomorrowsCallPickResponse,
  TomorrowsCallResponse,
} from '../../shared/api';
import { getTodaysSlate, computeResult, computeResults, getSlateDate } from '../core/fakeSlate';
import { commitDay, getUser, getUserDay, markDayShared, markRoundAnswered } from '../core/game';
import { getAllTimeBoard, getWeeklyBoard } from '../core/leaderboard';
import { maybePostDailyDigest } from '../core/digest';
import {
  getTodaysCandidates,
  getUserPick,
  resolveYesterdaysPick,
  submitPick,
} from '../core/tomorrowsCall';
import { buildShareText } from '../../shared/shareText';
import { getUserSubmissions, submitSpectrum } from '../core/submissions';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

const requireUserId = (): string => {
  if (!context.userId) throw new Error('Could not resolve current user');
  return context.userId;
};

api.get('/slate', async (c) => {
  try {
    const userId = requireUserId();
    const date = getSlateDate();
    const [existing, user] = await Promise.all([
      getUserDay(userId, date),
      getUser(userId),
    ]);

    // "Next level" brainstorm sweetener #4 — dynamic subreddit-name
    // personalization ("r/[name]" instead of a generic "this sub"). Reuses
    // the existing /slate round-trip rather than adding a second one;
    // `context.subredditName` is genuinely optional (BaseContext types it as
    // `string | undefined`), so callers must treat null as the real fallback
    // case, not an error.
    const subredditName = context.subredditName ?? null;

    if (existing) {
      return c.json<SlateResponse>({
        type: 'slate',
        alreadyPlayed: true,
        result: existing,
        user,
        subredditName,
      });
    }

    const slate = await getTodaysSlate();
    return c.json<SlateResponse>({
      type: 'slate',
      alreadyPlayed: false,
      slate,
      user,
      subredditName,
    });
  } catch (error) {
    console.error('API /slate error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load today’s slate' },
      400
    );
  }
});

api.post('/round/answer', async (c) => {
  try {
    const userId = requireUserId();
    const date = getSlateDate();
    const alreadyPlayed = await getUserDay(userId, date);
    if (alreadyPlayed) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Already played today' },
        409
      );
    }

    const body = await c.req.json<AnswerRequest>();
    // Only record into the shared hive aggregates the first time this
    // round is answered — a replay (double-tap/retry/reopened round) still
    // gets a valid result back, it just doesn't re-count itself into the
    // stats every other player sees.
    const isFirstAnswer = await markRoundAnswered(userId, date, body.answer.roundId);
    const result = await computeResult(body.answer, isFirstAnswer);
    if (!result) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Unknown round' },
        400
      );
    }

    return c.json<AnswerResponse>({ type: 'answer', result });
  } catch (error) {
    console.error('API /round/answer error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to score round' },
      400
    );
  }
});

api.post('/slate/complete', async (c) => {
  try {
    const userId = requireUserId();
    const date = getSlateDate();
    const existing = await getUserDay(userId, date);
    if (existing) {
      return c.json<CompleteResponse>({ type: 'complete', result: existing });
    }

    const [slate, body] = await Promise.all([
      getTodaysSlate(),
      c.req.json<CompleteRequest>(),
    ]);
    const results = (await computeResults(body.answers)).filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    if (results.length !== slate.rounds.length) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Incomplete answers' },
        400
      );
    }

    const result = await commitDay(userId, date, results);
    // Lazy, no-scheduler daily digest trigger — see digest.ts. A no-op for
    // every player except whichever one happens to be first to complete a
    // slate after UTC rollover; never blocks/fails this response either way
    // (its own try/catch swallows errors).
    await maybePostDailyDigest(date);
    return c.json<CompleteResponse>({ type: 'complete', result });
  } catch (error) {
    console.error('API /slate/complete error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to complete slate' },
      400
    );
  }
});

api.get('/leaderboard', async (c) => {
  try {
    const userId = requireUserId();
    const [allTime, weekly] = await Promise.all([
      getAllTimeBoard(userId),
      getWeeklyBoard(userId),
    ]);
    return c.json<LeaderboardResponse>({ type: 'leaderboard', allTime, weekly });
  } catch (error) {
    console.error('API /leaderboard error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load leaderboard' },
      400
    );
  }
});

api.post('/share/comment', async (c) => {
  try {
    const userId = requireUserId();
    const date = getSlateDate();
    const dayResult = await getUserDay(userId, date);
    if (!dayResult) {
      return c.json<ErrorResponse>(
        { status: 'error', message: "Play today's slate first" },
        400
      );
    }

    if (dayResult.shared) {
      return c.json<ShareCommentResponse>({ type: 'share-comment', result: dayResult });
    }

    if (!context.postId) throw new Error('Missing post context');
    await reddit.submitComment({
      id: context.postId,
      text: buildShareText(dayResult),
      runAs: 'USER',
    });

    const updated = await markDayShared(userId, date);
    return c.json<ShareCommentResponse>({ type: 'share-comment', result: updated ?? dayResult });
  } catch (error) {
    console.error('API /share/comment error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to post comment' },
      400
    );
  }
});

api.post('/submit/spectrum', async (c) => {
  try {
    const userId = requireUserId();
    const body = await c.req.json<SubmitSpectrumRequest>();
    const prompt = body.prompt?.trim();
    const leftLabel = body.leftLabel?.trim();
    const rightLabel = body.rightLabel?.trim();

    if (!prompt || !leftLabel || !rightLabel) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'All fields are required' },
        400
      );
    }
    if (prompt.length > 140 || leftLabel.length > 24 || rightLabel.length > 24) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Keep it short. Prompt under 140 chars, labels under 24.' },
        400
      );
    }

    const submission = await submitSpectrum(userId, prompt, leftLabel, rightLabel);
    return c.json<SubmitSpectrumResponse>({ type: 'submit-spectrum', submission });
  } catch (error) {
    console.error('API /submit/spectrum error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit';
    return c.json<ErrorResponse>({ status: 'error', message }, 400);
  }
});

// "Next level" brainstorm item #3 — Tomorrow's Call. Only offered/resolved
// once today's slate is actually done (mirrors the "optional bonus after
// Daily Result" scoping) — before that, candidates/myPick/resolvedYesterday
// all come back null rather than erroring, so the client can render nothing
// during the round-playing phase without special-casing this endpoint.
api.get('/tomorrows-call', async (c) => {
  try {
    const userId = requireUserId();
    const date = getSlateDate();
    const dayResult = await getUserDay(userId, date);
    if (!dayResult) {
      return c.json<TomorrowsCallResponse>({
        type: 'tomorrows-call',
        candidates: null,
        myPick: null,
        resolvedYesterday: null,
      });
    }

    const resolvedYesterday = await resolveYesterdaysPick(userId, date);
    const [candidates, myPick] = await Promise.all([
      getTodaysCandidates(date),
      getUserPick(userId, date),
    ]);
    return c.json<TomorrowsCallResponse>({
      type: 'tomorrows-call',
      candidates,
      myPick,
      resolvedYesterday,
    });
  } catch (error) {
    console.error('API /tomorrows-call error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to load tomorrow’s call' }, 400);
  }
});

api.post('/tomorrows-call/pick', async (c) => {
  try {
    const userId = requireUserId();
    const date = getSlateDate();
    const dayResult = await getUserDay(userId, date);
    if (!dayResult) {
      return c.json<ErrorResponse>({ status: 'error', message: "Play today's slate first" }, 400);
    }

    const body = await c.req.json<TomorrowsCallPickRequest>();
    if (body.pick !== 'A' && body.pick !== 'B') {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid pick' }, 400);
    }

    const pick = await submitPick(userId, date, body.pick);
    if (!pick) {
      return c.json<ErrorResponse>({ status: 'error', message: 'No candidates available today' }, 400);
    }
    return c.json<TomorrowsCallPickResponse>({ type: 'tomorrows-call-pick', pick });
  } catch (error) {
    console.error('API /tomorrows-call/pick error:', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Failed to save pick' }, 400);
  }
});

api.get('/submit/mine', async (c) => {
  try {
    const userId = requireUserId();
    const submissions = await getUserSubmissions(userId);
    return c.json<MySubmissionsResponse>({ type: 'my-submissions', submissions });
  } catch (error) {
    console.error('API /submit/mine error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load submissions' },
      400
    );
  }
});

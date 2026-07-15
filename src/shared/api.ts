import type {
  Answer,
  DailySlate,
  LeaderboardBoard,
  RoundResult,
  SpectrumSubmission,
  TomorrowsCallCandidates,
  TomorrowsCallPick,
  TomorrowsCallResolution,
  UserDayRecord,
  UserRecord,
} from './types';

export type SlateResponse =
  | { type: 'slate'; alreadyPlayed: false; slate: DailySlate; user: UserRecord; subredditName: string | null }
  | { type: 'slate'; alreadyPlayed: true; result: UserDayRecord; user: UserRecord; subredditName: string | null };

export type AnswerRequest = { answer: Answer };

export type AnswerResponse = {
  type: 'answer';
  result: RoundResult;
};

export type CompleteRequest = { answers: Answer[] };

export type CompleteResponse = {
  type: 'complete';
  result: UserDayRecord;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  allTime: LeaderboardBoard;
  weekly: LeaderboardBoard;
};

export type ShareCommentResponse = {
  type: 'share-comment';
  result: UserDayRecord;
};

export type SubmitSpectrumRequest = {
  prompt: string;
  leftLabel: string;
  rightLabel: string;
};

export type SubmitSpectrumResponse = {
  type: 'submit-spectrum';
  submission: SpectrumSubmission;
};

export type MySubmissionsResponse = {
  type: 'my-submissions';
  submissions: SpectrumSubmission[];
};

// "Next level" brainstorm item #3 — Tomorrow's Call.
export type TomorrowsCallResponse = {
  type: 'tomorrows-call';
  candidates: TomorrowsCallCandidates | null;
  myPick: TomorrowsCallPick | null;
  resolvedYesterday: TomorrowsCallResolution | null;
};

export type TomorrowsCallPickRequest = { pick: 'A' | 'B' };

export type TomorrowsCallPickResponse = {
  type: 'tomorrows-call-pick';
  pick: TomorrowsCallPick;
};

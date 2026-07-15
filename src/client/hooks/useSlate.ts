import { useCallback, useEffect, useState } from 'react';
import { fetchWithTimeout } from '../fetchWithTimeout';
import type {
  AnswerRequest,
  AnswerResponse,
  CompleteRequest,
  CompleteResponse,
  ShareCommentResponse,
  SlateResponse,
} from '../../shared/api';
import type { Answer, DailySlate, RoundResult, UserDayRecord, UserRecord } from '../../shared/types';

type SlateState = {
  loading: boolean;
  slate: DailySlate | null;
  user: UserRecord | null;
  dayResult: UserDayRecord | null;
  subredditName: string | null;
};

export const useSlate = () => {
  const [state, setState] = useState<SlateState>({
    loading: true,
    slate: null,
    user: null,
    dayResult: null,
    subredditName: null,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetchWithTimeout('/api/slate');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SlateResponse = await res.json();
        if (data.alreadyPlayed) {
          setState({
            loading: false,
            slate: null,
            user: data.user,
            dayResult: data.result,
            subredditName: data.subredditName,
          });
        } else {
          setState({
            loading: false,
            slate: data.slate,
            user: data.user,
            dayResult: null,
            subredditName: data.subredditName,
          });
        }
      } catch (err) {
        console.error('Failed to load slate', err);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };
    void init();
  }, []);

  // P5 (UI/UX overhaul) — the new error-state Retry button's target.
  // Deliberately NOT called from the mount effect above (an eslint
  // `react-hooks/set-state-in-effect` false-positive fires when an effect
  // invokes an externally-defined, setState-containing function via its
  // dependency array — the inline closure above doesn't trigger it, so the
  // two are kept separate rather than deduplicated into one).
  const retry = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetchWithTimeout('/api/slate');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SlateResponse = await res.json();
      if (data.alreadyPlayed) {
        setState({
          loading: false,
          slate: null,
          user: data.user,
          dayResult: data.result,
          subredditName: data.subredditName,
        });
      } else {
        setState({
          loading: false,
          slate: data.slate,
          user: data.user,
          dayResult: null,
          subredditName: data.subredditName,
        });
      }
    } catch (err) {
      console.error('Failed to load slate', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const answerRound = useCallback(async (answer: Answer): Promise<RoundResult> => {
    const res = await fetchWithTimeout('/api/round/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer } satisfies AnswerRequest),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: AnswerResponse = await res.json();
    return data.result;
  }, []);

  const completeSlate = useCallback(async (answers: Answer[]): Promise<UserDayRecord> => {
    const res = await fetchWithTimeout('/api/slate/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers } satisfies CompleteRequest),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: CompleteResponse = await res.json();
    setState((prev) => ({ ...prev, dayResult: data.result }));
    return data.result;
  }, []);

  const shareComment = useCallback(async (): Promise<UserDayRecord> => {
    const res = await fetchWithTimeout('/api/share/comment', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ShareCommentResponse = await res.json();
    setState((prev) => ({ ...prev, dayResult: data.result }));
    return data.result;
  }, []);

  return { ...state, answerRound, completeSlate, shareComment, retry };
};

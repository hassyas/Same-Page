import { useEffect, useState } from 'react';
import { fetchWithTimeout } from '../fetchWithTimeout';
import type { MySubmissionsResponse, SubmitSpectrumRequest, SubmitSpectrumResponse } from '../../shared/api';
import type { SpectrumSubmission } from '../../shared/types';
import { PrimaryButton } from '../ui/PrimaryButton';
import { GhostButton } from '../ui/GhostButton';
import { Tile } from '../ui/Tile';
import { TextInput } from '../ui/TextInput';
import { SkeletonTile } from '../ui/SkeletonTile';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { ENTER } from '../motion';

type Props = {
  onBack: () => void;
  subredditName: string | null;
};

type Tab = 'submit' | 'mine';

export const SubmitRound = ({ onBack, subredditName }: Props) => {
  const subLabel = subredditName ? `r/${subredditName}` : 'this sub';
  const [tab, setTab] = useState<Tab>('submit');
  const [prompt, setPrompt] = useState('');
  const [leftLabel, setLeftLabel] = useState('');
  const [rightLabel, setRightLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<SpectrumSubmission[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [mineError, setMineError] = useState(false);

  const loadMine = async () => {
    setLoadingMine(true);
    setMineError(false);
    try {
      const res = await fetchWithTimeout('/api/submit/mine');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MySubmissionsResponse = await res.json();
      setMine(data.submissions);
    } catch (err) {
      console.error('Failed to load submissions', err);
      setMineError(true);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    void loadMine();
  }, []);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithTimeout('/api/submit/spectrum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, leftLabel, rightLabel } satisfies SubmitSpectrumRequest),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
      const typed = data as SubmitSpectrumResponse;
      setMine((prev) => [typed.submission, ...prev]);
      setPrompt('');
      setLeftLabel('');
      setRightLabel('');
      setSubmitted(true);
      window.setTimeout(() => setSubmitted(false), 420);
    } catch (err) {
      console.error('Submit failed', err);
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4"
      style={{ color: 'var(--on-canvas)' }}
    >
      <h2 className="font-display font-bold text-center text-[var(--size-h1)]">Submit a Pulse round</h2>

      <div className="flex justify-center gap-2">
        {tab === 'submit' ? (
          <PrimaryButton variant="gold" onClick={() => setTab('submit')}>
            Submit
          </PrimaryButton>
        ) : (
          <GhostButton onClick={() => setTab('submit')}>Submit</GhostButton>
        )}
        {tab === 'mine' ? (
          <PrimaryButton variant="gold" onClick={() => setTab('mine')}>
            My submissions
          </PrimaryButton>
        ) : (
          <GhostButton onClick={() => setTab('mine')}>My submissions</GhostButton>
        )}
      </div>

      {/* key={tab} remounts on tab switch so it crossfades in, not a hard swap. */}
      {tab === 'submit' ? (
        <div key={tab} className={`flex flex-col gap-4 ${ENTER}`}>
          <p className="text-sm text-center text-[var(--on-canvas-soft)]">
            Pitch a spectrum question. If it's picked, it'll run against real posts from {subLabel}.
          </p>

          <TextInput
            placeholder="Prompt, e.g. 'Is this a hot take?'"
            value={prompt}
            maxLength={140}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex gap-2">
            <TextInput
              placeholder="Left label"
              value={leftLabel}
              maxLength={24}
              onChange={(e) => setLeftLabel(e.target.value)}
            />
            <TextInput
              placeholder="Right label"
              value={rightLabel}
              maxLength={24}
              onChange={(e) => setRightLabel(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-[var(--on-canvas-soft)] text-center">{error}</p>}
          <PrimaryButton
            variant="aqua"
            onClick={submit}
            disabled={submitting || !prompt.trim() || !leftLabel.trim() || !rightLabel.trim()}
            className={`self-center ${submitted ? 'animate-reveal-pop motion-reduce:animate-none' : ''}`}
          >
            {submitting ? 'Submitting…' : 'Submit for review'}
          </PrimaryButton>
        </div>
      ) : (
        <div key={tab} className={`flex flex-col gap-2 ${ENTER}`}>
          {loadingMine ? (
            <>
              <SkeletonTile size="sm" />
              <SkeletonTile size="sm" />
            </>
          ) : mineError ? (
            <ErrorState code="submissions:fetch-failed" onRetry={() => void loadMine()} />
          ) : mine.length === 0 ? (
            <EmptyState
              headline="Nothing in the queue yet."
              ctaLabel="Submit your first round"
              onCta={() => setTab('submit')}
            />
          ) : (
            mine.map((s) => (
              <Tile key={s.id} size="md">
                <p>{s.prompt}</p>
                <p className="text-xs text-[var(--ink-soft)]">
                  {s.leftLabel} ↔ {s.rightLabel} · {s.status}
                </p>
              </Tile>
            ))
          )}
        </div>
      )}

      <GhostButton onClick={onBack} className="mt-2 self-center">
        Back
      </GhostButton>
    </div>
  );
};

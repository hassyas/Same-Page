import { useEffect, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { showToast } from '@devvit/web/client';
import { fetchWithTimeout } from '../fetchWithTimeout';
import type { UserDayRecord, UserRecord } from '../../shared/types';
import { isRoundSynced } from '../../shared/types';
import type { LeaderboardResponse, TomorrowsCallPickResponse, TomorrowsCallResponse } from '../../shared/api';
import { buildShareText } from '../../shared/shareText';
import { tierForRating } from '../../shared/tiers';
import { ResultDots } from '../components/indicators';
import { useCountUp } from '../hooks/useCountUp';
import { useUnlockCountdown } from '../hooks/useUnlockCountdown';
import { ENTER } from '../motion';
import { StatChip } from '../ui/StatChip';
import { StreakRing } from '../ui/StreakRing';
import { PrimaryButton } from '../ui/PrimaryButton';
import { GhostButton } from '../ui/GhostButton';
import { RevealPanel } from '../ui/RevealPanel';
import { RevealRow } from '../ui/RevealRow';
import { SplitBar } from '../ui/SplitBar';
import { SharePoster } from '../ui/SharePoster';
import { EmberBurst } from '../ui/EmberBurst';
import { Countdown } from '../ui/Countdown';
import { SoundToggle } from '../ui/SoundToggle';
import { useSound } from '../audio/useSound';
import { Haptics } from '../ui/Haptics';

type Props = {
  dayResult: UserDayRecord;
  user: UserRecord | null;
  onGoLeaderboard: () => void;
  onGoSubmit: () => void;
  onGoHowTo: () => void;
  onShareComment: () => Promise<UserDayRecord>;
};

// Tomorrow's Call candidate picker — the app's only interactive control
// inside a dark RevealPanel, so it uses the reveal-* token family (not
// GhostButton/Tile, which are tuned for the light canvas) plus the same
// r-tile radius and tap/focus treatment every other button in the app has.
const pickButtonClass =
  'text-left text-sm line-clamp-2 text-[var(--reveal-ink)] border border-[var(--reveal-rule)] rounded-[var(--r-tile)] px-3 py-2 hover:bg-[var(--reveal-rule)] active:scale-95 transition-transform duration-150 motion-reduce:transition-none disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-[var(--reveal-ink)] focus-visible:outline-offset-[3px]';

export const DailyResult = ({
  dayResult,
  user,
  onGoLeaderboard,
  onGoSubmit,
  onGoHowTo,
  onShareComment,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const [posting, setPosting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [savingPoster, setSavingPoster] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const shareText = buildShareText(dayResult);
  const { play } = useSound();

  // This screen can be reached via Devvit's own "expand to full view"
  // transition (from the already-played splash), which is playing at the
  // same time this component mounts. If our CSS stagger starts on mount, it
  // can finish running *underneath* that native transition before the user
  // can actually see the screen. Gate the reveal on a short post-mount
  // delay so it reliably plays after the screen has settled, not during it.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 250);
    return () => window.clearTimeout(t);
  }, []);

  const syncScore = useCountUp(dayResult.syncScore, 900, 250);
  const revealClass = ready ? ENTER : 'opacity-0';
  const revealStyle = (delayMs: number) => (ready ? { animationDelay: `${delayMs}ms` } : undefined);

  // Addendum B5 — "progress you can see accruing": animate the rating
  // delta counting up to the new total, then reveal the tier it lands in.
  const ratingDelta = dayResult.ratingDelta ?? 0;
  const newRating = user?.rating ?? 1000;
  const animatedRating = useCountUp(newRating, 700, 360);
  const tier = tierForRating(newRating);
  const unlockCountdown = useUnlockCountdown();

  // Addendum B4 — "a small, earned burst on a milestone": the accent's
  // second legitimate use (first is the Decider header). Only fires on a
  // genuine tier crossing, never on ordinary daily progress within a tier.
  const prevTier = tierForRating(newRating - ratingDelta);
  const tieredUp = user !== null && ratingDelta > 0 && prevTier !== tier;

  // P5 (UI/UX overhaul) — sound/haptic pairing for the tier-up moment, gated
  // on the same `ready` flag as the rest of the reveal so it can't fire
  // underneath Devvit's own expand transition.
  useEffect(() => {
    if (ready && tieredUp) {
      play('tier-up');
      Haptics.tierUp();
    }
  }, [ready, tieredUp, play]);

  // PRD §7 requires this screen to show rank alongside sync score/streak —
  // it wasn't wired up. All-time rank matches the "hive-sync" stat next to
  // it (both driven by `user.rating`), so reuse the same leaderboard the
  // Leaderboard screen already exposes rather than adding a new endpoint.
  const [rank, setRank] = useState<number | null>(null);
  const [rankError, setRankError] = useState(false);
  const loadRank = async () => {
    setRankError(false);
    try {
      const res = await fetchWithTimeout('/api/leaderboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LeaderboardResponse = await res.json();
      setRank(json.allTime.self?.rank ?? null);
    } catch (err) {
      console.error('Failed to load rank', err);
      setRankError(true);
    }
  };
  useEffect(() => {
    void loadRank();
  }, []);

  // "Next level" brainstorm item #3 — Tomorrow's Call. Loaded independently
  // of the leaderboard rank fetch above (separate concerns, separate
  // failure modes) — a failure here just leaves the card absent, never
  // blocks anything else on this screen.
  const [tomorrowsCall, setTomorrowsCall] = useState<TomorrowsCallResponse | null>(null);
  const [tcPicking, setTcPicking] = useState(false);
  const [tcPickError, setTcPickError] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithTimeout('/api/tomorrows-call');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TomorrowsCallResponse = await res.json();
        setTomorrowsCall(json);
      } catch (err) {
        console.error('Failed to load Tomorrow’s Call', err);
      }
    };
    void load();
  }, []);

  const pickTomorrowsCall = async (pick: 'A' | 'B') => {
    if (tcPicking || tomorrowsCall?.myPick) return;
    setTcPicking(true);
    setTcPickError(false);
    try {
      const res = await fetchWithTimeout('/api/tomorrows-call/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pick }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TomorrowsCallPickResponse = await res.json();
      setTomorrowsCall((prev) => (prev ? { ...prev, myPick: json.pick } : prev));
    } catch (err) {
      console.error('Failed to save Tomorrow’s Call pick', err);
      setTcPickError(true);
    } finally {
      setTcPicking(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  // Root cause of "Save poster still not producing an image" (this
  // session, reported after last session's toPng+fetch(dataUrl)+
  // clipboard.write attempt): the user confirmed the observed symptom is
  // the TEXT fallback toast firing ("...poster text copied instead"),
  // meaning the image path genuinely reaches the try block and throws
  // partway through, rather than the handler being unwired — narrows this
  // to either (a) `fetch(dataUrl)` on a base64 data: URL, which some
  // webview CSPs block for `connect-src` even though it's normally exempt,
  // or (b) `navigator.clipboard.write([ClipboardItem])` itself being
  // denied — Reddit's Devvit webview is a third-party iframe, and the
  // Clipboard API's *image* write specifically requires the "clipboard-
  // write" Permissions-Policy to be delegated to that iframe by the host
  // page, which is outside this app's control and can't be confirmed or
  // worked around from inside the webview's own code.
  // Fixed (a) outright: switched from `toPng()` + a manual `fetch()`
  // round-trip to `toBlob()`, which returns the PNG `Blob` directly with
  // no data-URL/fetch step at all, removing that entire failure mode.
  // Restructured into 3 independent, separately-caught attempts (each with
  // its own `console.error` tag, so if this is still broken the exact
  // failing stage is identifiable next time even without live console
  // access) instead of one attempt with a single catch-all fallback:
  // 1) clipboard image write (the real "save an image" outcome), 2) if
  // that specifically fails/is unsupported, a real `<a download>` browser
  // download built from the same blob via `URL.createObjectURL` (previously
  // this branch could only ever fire when `ClipboardItem` didn't exist at
  // all, never as a fallback from a write that existed but threw — now it's
  // tried whenever step 1 fails, for any reason), 3) only if rasterizing
  // the card itself failed (blob is null) does it fall to the old text-only
  // clipboard copy, now genuinely the last resort rather than the first
  // thing to fail into.
  const savePoster = async () => {
    if (savingPoster || !posterRef.current) return;
    setSavingPoster(true);

    let blob: Blob | null = null;
    try {
      blob = await toBlob(posterRef.current, { pixelRatio: 2, cacheBust: true });
    } catch (err) {
      console.error('Save poster: rasterizing the card failed', err);
    }

    if (blob) {
      try {
        if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
          throw new Error('Clipboard image write unsupported in this webview');
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Poster image copied. Paste it anywhere to save it.');
        setSavingPoster(false);
        return;
      } catch (err) {
        console.error('Save poster: clipboard image write failed', err);
      }

      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'same-page-poster.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Poster image downloading.');
        setSavingPoster(false);
        return;
      } catch (err) {
        console.error('Save poster: browser download failed', err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Could not save the image. Poster text copied instead.');
    } catch (err) {
      console.error('Save poster: text fallback failed', err);
      showToast('Could not save poster.');
    } finally {
      setSavingPoster(false);
    }
  };

  const postComment = async () => {
    if (posting || dayResult.shared) return;
    setPosting(true);
    setShareError(null);
    try {
      await onShareComment();
    } catch (err) {
      console.error('Post comment failed', err);
      setShareError('Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  // Addendum B5 — near-miss framing: only worth saying when it's genuinely
  // close (or the player *was* today's top) — an always-on line would just
  // be noise on an average day.
  const gap = dayResult.dailyGapToTop;
  const nearMissLine =
    gap === 0 ? 'You topped the crowd today.' : gap !== null && gap <= 20 ? `So close, ${gap} off the top.` : null;

  return (
    <div
      className="flex flex-col gap-4 lg:gap-3 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4 text-center"
      style={{ color: 'var(--on-canvas)' }}
    >
      {/* No colored hero, canvas bg — the archetype name is the headline, the
          sync score count-up sits beside it. Sound toggle lives here since
          this is the one screen a sound (tier-up) currently fires on — see
          PROGRESS.md for the "no global header" gap this doesn't yet close. */}
      <div className="flex justify-end">
        <SoundToggle />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs uppercase tracking-widest font-semibold text-[var(--on-canvas-soft)]">
          Today's Result
        </p>
        {/* Root cause of "too small to read" (this session): confirmed via
            compiled CSS that `text-[var(--size-h1)] lg:text-[var(--size-
            poster)]` was the exact same Tailwind v4 bare-var()-compiles-
            to-color bug fixed elsewhere this project multiple times —
            `.text-\[var\(--size-h1\)\]{color:var(--size-h1)}`, not
            `font-size:`. This element has no companion color class, so
            the bug was invisible (nothing looked "wrong," just silently
            never got its intended font-size), exactly the "flagged, not
            fixed, out of scope" case a much earlier session's sweep
            explicitly called out but didn't touch. Fixed with the proven
            text-(length:--x) syntax. Beyond the bug fix, also bumped the
            target size itself to --size-poster at every breakpoint (was
            --size-h1 on mobile, --size-poster only from lg: up) per this
            session's explicit ask to make this heading read as a real
            headline, not just restore the originally-intended-but-never-
            rendered size. */}
        {dayResult.hiveReport && (
          <p className="font-display font-bold leading-none text-(length:--size-poster)">
            {dayResult.hiveReport.archetype}
          </p>
        )}
        <p className="font-mono font-bold font-nums tabular-nums text-(length:--size-h1) text-[var(--on-canvas)]">
          {syncScore}
        </p>
        <p className={`${revealClass} flex justify-center mt-1`} style={revealStyle(0)}>
          <ResultDots emoji={dayResult.emoji} size="lg" />
        </p>
      </div>

      {/* Streak ring + labeled stat chips — rating/tier, rank. Tier gets its
          own special filled-accent treatment on a genuine tier crossing
          (ember-burst + tier-up sound + haptic, all gated on `ready`). */}
      <div className={`${revealClass} flex flex-col items-center gap-3`} style={revealStyle(320)}>
        {/* Bumped 104->210: was reading as a small decoration next to
            SharePoster's much larger stat number nearby. StreakRing's
            internal font sizes are ratio-based off `size` (numberFontPx =
            size*0.19, labelFontPx = size*0.07 — see StreakRing.tsx), so
            this scales proportionally, not just a fixed-size swap. Checked
            for overflow: at size=210 the number renders ~40px, well under
            the ring's px-4-inset ~178px-wide text box even for a 3-digit
            streak; the screen's own max-w-sm (384px) - px-4 (32px) = 352px
            available width comfortably fits a 210px ring. */}
        <StreakRing streak={dayResult.streak} size={210} />
        {dayResult.streak >= 3 && (
          <p className="text-xs text-[var(--on-canvas-soft)] -mt-2">Miss a day and this resets.</p>
        )}
        <div className="flex flex-wrap justify-center items-center gap-2">
          <StatChip label="Crowd Score" value={user ? String(animatedRating) : '—'} />
          {rankError ? (
            <button
              type="button"
              onClick={() => void loadRank()}
              className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--tile)] px-3 py-1.5 text-(length:--size-small) text-[var(--ink-soft)] active:scale-95 transition-transform duration-150 motion-reduce:transition-none"
            >
              Rank: retry
            </button>
          ) : (
            <StatChip label="Rank" value={rank !== null ? `#${rank}` : '—'} />
          )}
          {tieredUp ? (
            <span className="relative inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--gold)] px-3 py-1.5 text-(length:--size-small) font-semibold text-[var(--ink)] animate-reveal-pop motion-reduce:animate-none">
              New tier: {tier}
              <EmberBurst />
            </span>
          ) : (
            <StatChip label="Tier" value={tier} />
          )}
        </div>
      </div>

      <div
        className={`${revealClass} flex flex-col gap-2 text-left rounded-[var(--r-tile)] px-4 py-3 bg-[var(--tile)] border-[var(--border-w)] border-[var(--ink)] shadow-[0_4px_0_rgba(0,0,0,0.2)]`}
        style={revealStyle(200)}
      >
        <p className="text-xs font-mono font-bold uppercase tracking-wide text-[var(--ink-soft)]">
          Round by round
        </p>
        <SplitBar
          leftPercent={(dayResult.results.filter(isRoundSynced).length / (dayResult.results.length || 1)) * 100}
          leftLabel={`${dayResult.results.filter(isRoundSynced).length} read right`}
          rightLabel={`${dayResult.results.length - dayResult.results.filter(isRoundSynced).length} missed`}
        />
      </div>

      {dayResult.hiveReport && (
        <div
          className={`${revealClass} flex flex-col gap-2 text-left rounded-[var(--r-card)] border-[var(--border-w)] border-[var(--ink)] bg-[var(--tile)] px-4 py-3 shadow-[0_5px_0_rgba(0,0,0,0.2)]`}
          style={revealStyle(140)}
        >
          <p className="font-display font-bold text-(length:--size-h2) text-[var(--ink)]">
            {dayResult.hiveReport.archetype}
          </p>
          <p className="text-sm text-[var(--ink-soft)]">{dayResult.hiveReport.headline}</p>
          <p className="text-xs text-[var(--ink-soft)]">
            <span className="font-medium text-[var(--ink)]">Strength:</span> {dayResult.hiveReport.strength}
          </p>
          <p className="text-xs text-[var(--ink-soft)]">
            <span className="font-medium text-[var(--ink)]">Blind spot:</span> {dayResult.hiveReport.blindSpot}
          </p>
          <p className="text-sm italic text-[var(--ink-soft)] border-t border-[var(--rule)] pt-2 mt-1">
            {dayResult.hiveReport.discussionPrompt}
          </p>
        </div>
      )}

      {/* Everything that used to be 3 separate loose paragraphs (most-
          divisive callout, near-miss line, social proof) is now one
          "hive signals" card so it reads as one connected update on the
          room, not three disconnected asides. */}
      <div
        className={`${revealClass} flex flex-col gap-1.5 text-left rounded-[var(--r-tile)] px-4 py-3 lg:py-2 bg-[var(--tile)] border-[var(--border-w)] border-[var(--ink)] shadow-[0_4px_0_rgba(0,0,0,0.2)] text-[var(--ink)]`}
        style={revealStyle(240)}
      >
        {dayResult.mostDivisive && <p className="text-sm font-medium">{dayResult.mostDivisive.message}</p>}
        {nearMissLine && <p className="text-sm font-semibold text-[var(--ink)]">{nearMissLine}</p>}
        <p className="text-xs text-[var(--ink-soft)]">
          {(dayResult.communitySynced ?? 1).toLocaleString()} hive members synced today
        </p>
      </div>

      {/* "Next level" brainstorm item #3 — the cliffhanger: an optional
          bonus prediction that resolves the NEXT time the player is back, so
          the day doesn't just end on a full stop. A resolved/pending bet is
          reveal-layer data, so it lives in the dark RevealPanel now. */}
      {tomorrowsCall && (tomorrowsCall.resolvedYesterday || tomorrowsCall.candidates) && (
        <div className={revealClass} style={revealStyle(300)}>
          <RevealPanel label="Tomorrow's call">
            {tomorrowsCall.resolvedYesterday && (
              <RevealRow
                title={
                  tomorrowsCall.resolvedYesterday.pick === 'A'
                    ? tomorrowsCall.resolvedYesterday.postATitle
                    : tomorrowsCall.resolvedYesterday.postBTitle
                }
                value={tomorrowsCall.resolvedYesterday.won ? 'Won' : 'No bonus'}
                delta={tomorrowsCall.resolvedYesterday.won ? `+${tomorrowsCall.resolvedYesterday.bonus}` : undefined}
                valueColor={tomorrowsCall.resolvedYesterday.won ? 'var(--synced)' : undefined}
              />
            )}
            {tomorrowsCall.candidates &&
              (tomorrowsCall.myPick ? (
                <RevealRow
                  // Was wrapping onto 2 lines and losing its vertical
                  // centering against the (long, big-mono-font) picked
                  // post title used as this row's `value` — RevealRow's
                  // title span had no wrap protection, so the adjacent
                  // wide value squeezed it. shrink-0 keeps it a fixed-
                  // width single-line column; RevealRow's own
                  // `items-center` then centers it correctly against the
                  // now-multi-line value beside it.
                  title={<span className="whitespace-nowrap shrink-0">Locked in</span>}
                  value={
                    tomorrowsCall.myPick.pick === 'A'
                      ? tomorrowsCall.myPick.postA.title
                      : tomorrowsCall.myPick.postB.title
                  }
                />
              ) : (
                <div className="flex flex-col gap-1.5 py-2.5">
                  {/* Primary instructional text, not a secondary label —
                      reveal-ink, not reveal-dim (which stays reserved for
                      genuinely secondary labels like the panel header). */}
                  <p className="text-sm text-[var(--reveal-ink)]">Which will score higher by this time tomorrow?</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      className={pickButtonClass}
                      onClick={() => pickTomorrowsCall('A')}
                      disabled={tcPicking}
                    >
                      {tomorrowsCall.candidates.postA.title}
                    </button>
                    <button
                      type="button"
                      className={pickButtonClass}
                      onClick={() => pickTomorrowsCall('B')}
                      disabled={tcPicking}
                    >
                      {tomorrowsCall.candidates.postB.title}
                    </button>
                  </div>
                  {tcPickError && (
                    <p className="text-xs text-[var(--reveal-dim)]">Couldn't save your pick. Try again.</p>
                  )}
                </div>
              ))}
          </RevealPanel>
        </div>
      )}

      {/* Neither block below participates in the reveal stagger (no
          revealClass/revealStyle) — they're always-visible, self-contained,
          and independent of each other. Poster full-width on its own row,
          then two equal columns underneath (share actions / nav), both
          rendering as standalone pills with no wrapping card — matched
          treatment on both sides. */}
      <div className="flex flex-col gap-4 mt-2">
        {/* posterRef targets this wrapper, not SharePoster.tsx internally —
            html-to-image rasterizes whatever's actually in the DOM here, so
            the exported image always matches what's on screen. */}
        <div ref={posterRef}>
          <SharePoster
            shareText={shareText}
            archetype={dayResult.hiveReport?.archetype}
            statLabel="matched"
            statValue={`${syncScore}`}
            className="mx-auto"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-2">
            <PrimaryButton fluid onClick={copyToClipboard}>
              {copied ? 'Copied' : 'Copy share text'}
            </PrimaryButton>
            <PrimaryButton fluid onClick={savePoster} disabled={savingPoster}>
              {savingPoster ? 'Saving…' : 'Save poster'}
            </PrimaryButton>
            <PrimaryButton onClick={postComment} disabled={posting || dayResult.shared} fluid>
              {dayResult.shared ? 'Posted' : posting ? 'Posting…' : 'Post to comments'}
            </PrimaryButton>
            {shareError && <p className="text-xs text-[var(--on-canvas-soft)] text-center">{shareError}</p>}
          </div>

          {/* Standalone pills, matching the share-action column exactly —
              no wrapping card (the previous bounded-card treatment made
              this column visually inconsistent with its sibling). */}
          <div className="flex flex-col gap-2">
            <GhostButton onClick={onGoLeaderboard}>Leaderboard</GhostButton>
            <GhostButton onClick={onGoSubmit}>Submit a round</GhostButton>
            <GhostButton onClick={onGoHowTo}>How to play</GhostButton>
          </div>
        </div>
      </div>

      <Countdown label={`New slate in ${unlockCountdown}`} className="mt-2" tone="canvas" />
    </div>
  );
};

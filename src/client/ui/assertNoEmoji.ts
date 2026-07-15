// Guard against the anti-slop rule "emoji children of
// PrimaryButton/GhostButton/StatChip/eyebrows/headers" — logs, never throws,
// so a slip doesn't crash the app mid-demo. Not gated behind a DEV flag:
// this project's tsconfig deliberately sets `"types": []` (no vite/client
// import.meta.env typing), and the check itself is a single cheap regex
// test, so running it unconditionally costs nothing worth a config change.
const EMOJI_RE = /\p{Extended_Pictographic}/u;

export function assertNoEmoji(source: string, text: unknown): void {
  if (typeof text === 'string' && EMOJI_RE.test(text)) {
    console.error(`[anti-slop] emoji found in <${source}> text: "${text}"`);
  }
}

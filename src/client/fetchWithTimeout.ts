// A dead connection should surface as a real, retryable error rather than
// hang the UI forever — every client fetch in this app goes through this.
const FETCH_TIMEOUT_MS = 10000;

export const fetchWithTimeout = (input: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

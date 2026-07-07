/**
 * Fixed-window in-memory rate limiter for API routes (single-process app,
 * so no shared store is needed). Windows are tracked per caller key.
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Requests left in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the window resets; 0 when the request was allowed. */
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  /** Maximum requests per key per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Clock, injectable for tests. Defaults to Date.now. */
  now?: () => number;
}

interface WindowState {
  windowStartMs: number;
  count: number;
}

/** Expired entries are swept once the map grows past this size. */
const PRUNE_THRESHOLD = 1000;

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: RateLimiterOptions): (key: string) => RateLimitDecision {
  const windows = new Map<string, WindowState>();

  const prune = (currentMs: number) => {
    if (windows.size < PRUNE_THRESHOLD) return;
    for (const [key, state] of windows) {
      if (currentMs - state.windowStartMs >= windowMs) windows.delete(key);
    }
  };

  return function check(key: string): RateLimitDecision {
    const currentMs = now();
    prune(currentMs);

    const state = windows.get(key);
    if (!state || currentMs - state.windowStartMs >= windowMs) {
      windows.set(key, { windowStartMs: currentMs, count: 1 });
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (state.count >= limit) {
      const msUntilReset = state.windowStartMs + windowMs - currentMs;
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(msUntilReset / 1000),
      };
    }

    windows.set(key, { windowStartMs: state.windowStartMs, count: state.count + 1 });
    return { allowed: true, remaining: limit - state.count - 1, retryAfterSeconds: 0 };
  };
}

import { describe, expect, test } from 'vitest';
import { createRateLimiter } from '@/lib/rateLimit';

const WINDOW_MS = 60_000;

function limiterWithClock(limit: number, startMs = 0) {
  let currentMs = startMs;
  const check = createRateLimiter({ limit, windowMs: WINDOW_MS, now: () => currentMs });
  const advance = (ms: number) => {
    currentMs += ms;
  };
  return { check, advance };
}

describe('createRateLimiter', () => {
  test('allows requests under the limit', () => {
    const { check } = limiterWithClock(3);
    expect(check('user-a').allowed).toBe(true);
    expect(check('user-a').allowed).toBe(true);
    expect(check('user-a').allowed).toBe(true);
  });

  test('blocks the request that exceeds the limit', () => {
    const { check } = limiterWithClock(2);
    check('user-a');
    check('user-a');
    const decision = check('user-a');
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('tracks each key independently', () => {
    const { check } = limiterWithClock(1);
    expect(check('user-a').allowed).toBe(true);
    expect(check('user-b').allowed).toBe(true);
    expect(check('user-a').allowed).toBe(false);
  });

  test('resets the count after the window elapses', () => {
    const { check, advance } = limiterWithClock(1);
    expect(check('user-a').allowed).toBe(true);
    expect(check('user-a').allowed).toBe(false);
    advance(WINDOW_MS);
    expect(check('user-a').allowed).toBe(true);
  });

  test('reports remaining requests in the current window', () => {
    const { check } = limiterWithClock(3);
    expect(check('user-a').remaining).toBe(2);
    expect(check('user-a').remaining).toBe(1);
    expect(check('user-a').remaining).toBe(0);
  });

  test('retryAfterSeconds counts down to the end of the window', () => {
    const { check, advance } = limiterWithClock(1);
    check('user-a');
    advance(45_000);
    const decision = check('user-a');
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(15);
  });
});

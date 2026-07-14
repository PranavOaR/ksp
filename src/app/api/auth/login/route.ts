import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { authenticate, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rateLimit';

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Brute-force guard: only FAILED attempts count, keyed per username + IP. */
const loginLimiter = createRateLimiter({ limit: LOGIN_ATTEMPT_LIMIT, windowMs: LOGIN_WINDOW_MS });

function callerIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body?.username || !body?.password) {
    return fail('Username and password are required.');
  }

  const limiterKey = `${body.username.toLowerCase().trim()}|${callerIp(request)}`;
  const decision = loginLimiter.peek(limiterKey);
  if (!decision.allowed) {
    return fail(
      `Too many sign-in attempts. Try again in ${Math.ceil(decision.retryAfterSeconds / 60)} minute(s).`,
      429
    );
  }

  let user;
  try {
    user = authenticate(body.username, body.password);
  } catch (error) {
    // Misconfigured deployment (e.g. DEMO_PASSWORD unset in production)
    console.error('[drishti-auth] sign-in unavailable:', error);
    return fail('Sign-in is not available on this deployment.', 503);
  }
  if (!user) {
    // Only failures consume the rate-limit window — legitimate users signing
    // in and out repeatedly (demo sessions) must never lock themselves out
    loginLimiter(limiterKey);
    // Deliberately vague message — do not reveal which field was wrong
    return fail('Invalid credentials.', 401);
  }

  try {
    logAudit(getDb(), user.role, 'login', `${user.rank} ${user.name} signed in`);
  } catch (error) {
    console.error('[drishti-auth] audit log failed on login:', error);
  }

  const response = NextResponse.json({
    success: true,
    data: { name: user.name, rank: user.rank, role: user.role },
    error: null,
  });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  return response;
}

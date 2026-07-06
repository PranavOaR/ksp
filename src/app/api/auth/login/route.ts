import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { authenticate, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body?.username || !body?.password) {
    return fail('Username and password are required.');
  }

  const user = authenticate(body.username, body.password);
  if (!user) {
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
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  return response;
}

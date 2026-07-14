import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { SESSION_COOKIE, sessionFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (session) {
    try {
      logAudit(getDb(), session.role, 'logout', `${session.rank} ${session.name} signed out`);
    } catch (error) {
      console.error('[drishti-auth] audit log failed on logout:', error);
    }
  }
  const response = NextResponse.json({ success: true, data: { loggedOut: true }, error: null });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

import { NextResponse } from 'next/server';
import { fail } from '@/lib/api';
import { sessionFromRequest } from '@/lib/auth';
import { isWorkspace, WORKSPACE_COOKIE, workspaceFromRequest } from '@/lib/workspace';

export async function GET(request: Request) {
  return NextResponse.json({
    success: true,
    data: { workspace: workspaceFromRequest(request) },
    error: null,
  });
}

export async function POST(request: Request) {
  if (!sessionFromRequest(request)) {
    return fail('Sign in required.', 401);
  }
  const body = (await request.json().catch(() => null)) as { workspace?: string } | null;
  if (!isWorkspace(body?.workspace)) {
    return fail('workspace must be "demo" or "live".');
  }
  const response = NextResponse.json({
    success: true,
    data: { workspace: body!.workspace },
    error: null,
  });
  // Not httpOnly on purpose: the client UI reads it to show the active workspace
  response.cookies.set(WORKSPACE_COOKIE, body!.workspace!, {
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}

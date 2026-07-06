import { NextResponse } from 'next/server';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ success: true, data, error: null });
}

export function fail(message: string, status = 400): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json({ success: false, data: null, error: message }, { status });
}

export function roleFromRequest(request: Request): string {
  return request.headers.get('x-drishti-role') ?? 'Investigator';
}

/** Uniform error handling for route handlers: log server-side, generic client message. */
export async function withErrorHandling<T>(
  handler: () => T | Promise<T>
): Promise<NextResponse<ApiEnvelope<T>> | NextResponse<ApiEnvelope<never>>> {
  try {
    return ok(await handler());
  } catch (error) {
    console.error('[drishti-api]', error);
    return fail('Internal error while processing the request.', 500);
  }
}

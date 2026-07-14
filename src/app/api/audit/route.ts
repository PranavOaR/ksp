import { fail, withErrorHandling } from '@/lib/api';
import { canAccess, sessionFromRequest } from '@/lib/auth';
import { getAuditLog, logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  // Mirrors the /audit page restriction (ROLE_ACCESS)
  if (!canAccess('/audit', session.role)) {
    return fail('Audit trail requires Supervisor or Administrator role.', 403);
  }
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    return { entries: getAuditLog(db) };
  });
}

const ALLOWED_CLIENT_ACTIONS = ['export_pdf', 'export_csv'] as const;

/** Client-side events that must still reach the audit trail (PRD J2: exports). */
export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return fail('Sign in required.', 401);
  const body = (await request.json().catch(() => null)) as { action?: string; detail?: string } | null;
  const action = body?.action ?? '';
  if (!(ALLOWED_CLIENT_ACTIONS as readonly string[]).includes(action)) {
    return fail(`action must be one of: ${ALLOWED_CLIENT_ACTIONS.join(', ')}`);
  }
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, session.role, action, body?.detail ?? '');
    return { logged: true };
  });
}

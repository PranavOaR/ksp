import { fail, roleFromRequest, withErrorHandling } from '@/lib/api';
import { getAuditLog, logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';

export async function GET(request: Request) {
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    return { entries: getAuditLog(db) };
  });
}

const ALLOWED_CLIENT_ACTIONS = ['export_pdf', 'export_csv'] as const;

/** Client-side events that must still reach the audit trail (PRD J2: exports). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string; detail?: string } | null;
  const action = body?.action ?? '';
  if (!(ALLOWED_CLIENT_ACTIONS as readonly string[]).includes(action)) {
    return fail(`action must be one of: ${ALLOWED_CLIENT_ACTIONS.join(', ')}`);
  }
  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    logAudit(db, roleFromRequest(request), action, body?.detail ?? '');
    return { logged: true };
  });
}

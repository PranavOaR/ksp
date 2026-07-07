import { fail, roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { sessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { workspaceFromRequest } from '@/lib/workspace';
import { buildCaseIntelligence } from '@/lib/intel/caseIntel';
import { updateCaseStatus } from '@/lib/intel/createCase';
import { clusterByMO, findMOCluster } from '@/lib/intel/moClusters';

/** Update case status: Open → Under Investigation → Solved (PRD F1). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = sessionFromRequest(request);
  if (!session) {
    return fail('Sign in required.', 401);
  }
  if (session.role !== 'Supervisor' && session.role !== 'Administrator') {
    return fail('Case status updates require Supervisor or Administrator role.', 403);
  }
  const { id } = await context.params;
  const firId = Number(id);
  if (!Number.isInteger(firId) || firId <= 0) {
    return fail('Case id must be a positive integer.');
  }
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  if (!body?.status) {
    return fail('status is required.');
  }

  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    const updated = updateCaseStatus(db, firId, body.status!);
    if (!updated) {
      throw new Error('Invalid status or case not found');
    }
    logAudit(
      db,
      session.role,
      'update_case_status',
      `case ${firId} → ${body.status} by ${session.rank} ${session.name}`
    );
    return { updated: true, status: body.status };
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const firId = Number(id);
  if (!Number.isInteger(firId) || firId <= 0) {
    return fail('Case id must be a positive integer.');
  }

  return withErrorHandling(() => {
    const db = getDb(workspaceFromRequest(request));
    const intelligence = buildCaseIntelligence(db, firId);
    if (!intelligence) {
      throw new Error(`Case ${firId} not found`);
    }
    logAudit(db, roleFromRequest(request), 'view_case', intelligence.fir.fir_number);

    // A3: check whether this case is part of a serial MO cluster (C4)
    const allMoRows = db
      .prepare(`SELECT id, modus_operandi FROM firs`)
      .all() as Array<{ id: number; modus_operandi: string }>;
    const clusters = clusterByMO(allMoRows);
    const moCluster = findMOCluster(firId, clusters);
    const moSerialPattern = moCluster
      ? { isSerial: true, clusterSize: moCluster.count, mo: moCluster.mo }
      : { isSerial: false, clusterSize: 1, mo: intelligence.fir.modus_operandi };

    return { ...intelligence, moSerialPattern };
  });
}

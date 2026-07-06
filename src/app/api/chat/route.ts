import { fail, roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
import { parseQuery } from '@/lib/intel/queryParser';
import { executeQuery } from '@/lib/intel/queryExecutor';
import type { QueryFilter } from '@/lib/intel/types';

interface ChatRequestBody {
  message: string;
  context?: QueryFilter;
}

const MAX_MESSAGE_LENGTH = 500;

function isValidBody(body: unknown): body is ChatRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.message === 'string' && candidate.message.trim().length > 0;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isValidBody(body)) {
    return fail('Request must include a non-empty "message" string.');
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return fail(`Message exceeds ${MAX_MESSAGE_LENGTH} characters.`);
  }

  return withErrorHandling(() => {
    const db = getDb();
    const role = roleFromRequest(request);
    const parsed = parseQuery(body.message, body.context);
    const result = executeQuery(db, parsed.filter);
    logAudit(db, role, 'chat_query', body.message);

    return {
      answer: result.summary,
      kind: result.kind,
      firs: result.firs,
      offenders: result.offenders,
      totalCount: result.totalCount,
      evidence: result.evidence.slice(0, 10),
      reasoningTrail: parsed.matched,
      confidence: parsed.confidence,
      isRefinement: parsed.isRefinement,
      filter: parsed.filter,
    };
  });
}

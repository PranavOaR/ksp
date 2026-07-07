import { fail, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { sessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { createRateLimiter } from '@/lib/rateLimit';
import { workspaceFromRequest } from '@/lib/workspace';
import { isLlmEnabled, llmComposeAnswer, llmParseQuery } from '@/lib/intel/llm';
import type { CopilotLanguage } from '@/lib/intel/llmCoerce';
import { parseQuery } from '@/lib/intel/queryParser';
import { executeQuery } from '@/lib/intel/queryExecutor';
import type { ParsedQuery, QueryFilter } from '@/lib/intel/types';

interface ChatRequestBody {
  message: string;
  context?: QueryFilter;
  /** Preferred answer language — Kannada answers even for English questions (A3). */
  answerLanguage?: 'en' | 'kn';
}

const MAX_MESSAGE_LENGTH = 500;

/** Generous for humans, tight enough to protect the Claude API budget. */
const CHAT_REQUESTS_PER_MINUTE = 20;
const RATE_WINDOW_MS = 60_000;

const chatRateLimiter = createRateLimiter({
  limit: CHAT_REQUESTS_PER_MINUTE,
  windowMs: RATE_WINDOW_MS,
});

function isValidBody(body: unknown): body is ChatRequestBody {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.message === 'string' && candidate.message.trim().length > 0;
}

interface UnderstandResult {
  parsed: ParsedQuery;
  language: CopilotLanguage;
  engine: 'claude' | 'rules';
}

/** Claude translation with deterministic fallback — the demo never breaks offline. */
async function understand(message: string, context?: QueryFilter): Promise<UnderstandResult> {
  if (isLlmEnabled()) {
    try {
      const llmParsed = await llmParseQuery(message, context);
      return { parsed: llmParsed, language: llmParsed.language, engine: 'claude' };
    } catch (error) {
      console.error('[drishti-llm] parse failed, falling back to rule engine:', error);
    }
  }
  return { parsed: parseQuery(message, context), language: 'en', engine: 'rules' };
}

export async function POST(request: Request) {
  // The Copilot spends Claude API budget — session required, no header fallback.
  const session = sessionFromRequest(request);
  if (!session) {
    return fail('Sign in required.', 401);
  }

  const rate = chatRateLimiter(`${session.role}:${session.name}`);
  if (!rate.allowed) {
    return fail(
      `Too many Copilot requests — please wait ${rate.retryAfterSeconds}s and try again.`,
      429
    );
  }

  const body = await request.json().catch(() => null);
  if (!isValidBody(body)) {
    return fail('Request must include a non-empty "message" string.');
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return fail(`Message exceeds ${MAX_MESSAGE_LENGTH} characters.`);
  }

  return withErrorHandling(async () => {
    const db = getDb(workspaceFromRequest(request));
    const role = session.role;
    const { parsed, language, engine } = await understand(body.message, body.context);
    const result = executeQuery(db, parsed.filter);
    logAudit(db, role, 'chat_query', `[${engine}/${language}] ${body.message}`);

    const wantsKannada = language === 'kn' || body.answerLanguage === 'kn';
    let answerLanguage: CopilotLanguage = 'en';
    let answer = result.summary;
    if (engine === 'claude' && wantsKannada) {
      try {
        answer = await llmComposeAnswer({
          question: body.message,
          language: 'kn',
          summary: result.summary,
          firs: result.firs,
          offenders: result.offenders,
          totalCount: result.totalCount,
        });
        answerLanguage = 'kn';
      } catch (error) {
        console.error('[drishti-llm] compose failed, using deterministic summary:', error);
      }
    }

    return {
      answer,
      kind: result.kind,
      firs: result.firs,
      offenders: result.offenders,
      totalCount: result.totalCount,
      evidence: result.evidence.slice(0, 10),
      reasoningTrail: parsed.matched,
      confidence: parsed.confidence,
      isRefinement: parsed.isRefinement,
      filter: parsed.filter,
      engine,
      language: answerLanguage,
    };
  });
}

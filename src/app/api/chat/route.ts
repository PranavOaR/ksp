import { fail, roleFromRequest, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { getDb } from '@/lib/db/client';
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
  const body = await request.json().catch(() => null);
  if (!isValidBody(body)) {
    return fail('Request must include a non-empty "message" string.');
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return fail(`Message exceeds ${MAX_MESSAGE_LENGTH} characters.`);
  }

  return withErrorHandling(async () => {
    const db = getDb();
    const role = roleFromRequest(request);
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

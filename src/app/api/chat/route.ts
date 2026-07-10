import { fail, withErrorHandling } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { sessionFromRequest } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { createRateLimiter } from '@/lib/rateLimit';
import { workspaceFromRequest } from '@/lib/workspace';
import { composeMemoFallback, runInvestigation, type AgentStep } from '@/lib/intel/agent';
import { isLlmEnabled, llmComposeAnswer, llmComposeMemo, llmParseQuery } from '@/lib/intel/llm';
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

/**
 * Runs the investigation playbook + memo composition and shapes the chat
 * response. The memo is the only LLM call; its real duration lands in the
 * trace as the final step, with the deterministic template as fallback.
 */
async function runAgent(
  db: ReturnType<typeof getDb>,
  personName: string,
  engine: 'claude' | 'rules',
  memoLanguage: CopilotLanguage
) {
  const investigation = runInvestigation(db, personName);

  let memo: string | null = null;
  let memoEngine: 'claude' | 'rules' = 'rules';
  if (investigation.target) {
    const startedAt = performance.now();
    if (engine === 'claude' && isLlmEnabled()) {
      try {
        memo = await llmComposeMemo({
          targetName: investigation.target.name,
          findings: investigation.findings,
          language: memoLanguage,
        });
        memoEngine = 'claude';
      } catch (error) {
        console.error('[drishti-agent] memo compose failed, using template:', error);
      }
    }
    if (!memo) {
      memo = composeMemoFallback(investigation.target.name, investigation.findings);
    }
    const memoStep: AgentStep = {
      id: 'memo',
      title: 'Draft lead memo',
      tool: memoEngine === 'claude' ? 'Claude (grounded on findings)' : 'deterministic template',
      status: 'done',
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      summary: 'Lead memo drafted from the collected findings.',
      evidence: [],
    };
    investigation.steps.push(memoStep);
  }

  const evidence = investigation.steps.flatMap((step) => step.evidence);
  return {
    answer: investigation.target
      ? `Investigation brief on ${investigation.target.name} — ${investigation.steps.length} steps completed.`
      : investigation.steps[0]?.summary ?? `Could not resolve "${personName}".`,
    kind: investigation.candidates?.length ? ('candidates' as const) : ('agent' as const),
    firs: [],
    offenders: investigation.findings.profile ? [investigation.findings.profile] : [],
    totalCount: investigation.findings.priorCases.length,
    evidence: [...new Set(evidence)].slice(0, 10),
    engine,
    ...(investigation.candidates ? { candidates: investigation.candidates } : {}),
    ...(investigation.target
      ? { agent: { target: investigation.target, steps: investigation.steps, memo } }
      : {}),
  };
}

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

    // Module A′: "investigate <person>" fans out into the multi-step agent
    // instead of a single query. The agent trace is the response.
    if (parsed.filter.intent === 'investigate' && parsed.filter.personName) {
      const wantsKannadaMemo = language === 'kn' || body.answerLanguage === 'kn';
      const agentResponse = await runAgent(
        db,
        parsed.filter.personName,
        engine,
        wantsKannadaMemo ? 'kn' : 'en'
      );
      logAudit(db, role, 'agent_investigation', `[${engine}] ${parsed.filter.personName}`);
      return {
        ...agentResponse,
        reasoningTrail: parsed.matched,
        confidence: parsed.confidence,
        isRefinement: false,
        filter: parsed.filter,
        language: 'en' as const,
      };
    }

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
      ...(result.network ? { network: result.network } : {}),
      ...(result.financial ? { financial: result.financial } : {}),
      ...(result.actSection ? { actSection: result.actSection } : {}),
      ...(result.hotspots ? { hotspots: result.hotspots } : {}),
      ...(result.candidates ? { candidates: result.candidates } : {}),
      ...(result.caseIntel ? { caseId: result.caseIntel.fir.id } : {}),
    };
  });
}

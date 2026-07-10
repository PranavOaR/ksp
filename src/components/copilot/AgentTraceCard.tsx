'use client';

import { useEffect, useState } from 'react';
import type { AgentPayload } from './types';

/**
 * Vertical stepper for the investigation agent (Module A′). Steps reveal
 * sequentially, paced by each step's REAL recorded duration — a honest
 * replay of the run, capped so the whole reveal stays under ~4s.
 */
const MAX_STEP_DELAY_MS = 700;

export function AgentTraceCard({ agent }: { agent: AgentPayload }) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const isComplete = visibleCount >= agent.steps.length;

  useEffect(() => {
    if (isComplete) return;
    const nextStep = agent.steps[visibleCount];
    const delay = Math.min(Math.max(nextStep?.durationMs ?? 100, 120), MAX_STEP_DELAY_MS);
    const timer = setTimeout(() => setVisibleCount((count) => count + 1), delay);
    return () => clearTimeout(timer);
  }, [visibleCount, isComplete, agent.steps]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <span className="rounded-full bg-[var(--series-2)]/15 px-2 py-0.5 font-medium text-[var(--series-2)]">
          ⚡ Agent
        </span>
        <span>
          {agent.steps.length} steps · target: {agent.target.name}
        </span>
      </div>

      <ol className="relative space-y-0 border-l border-[var(--border-1)] pl-4">
        {agent.steps.slice(0, visibleCount).map((step) => (
          <li key={step.id} className="relative pb-3 last:pb-0">
            <span
              className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-1)] ${
                step.status === 'done' ? 'bg-[var(--series-2)]' : 'bg-slate-500'
              }`}
            />
            <button
              type="button"
              onClick={() =>
                setExpandedStep((current) => (current === step.id ? null : step.id))
              }
              className="w-full text-left"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {step.title}
                  {step.status === 'skipped' && (
                    <span className="ml-2 text-[10px] text-[var(--text-muted)]">skipped</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                  {step.tool} · {step.durationMs}ms
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{step.summary}</p>
            </button>
            {expandedStep === step.id && step.evidence.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {step.evidence.map((reference) => (
                  <span
                    key={reference}
                    className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
                  >
                    {reference}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>

      {isComplete && agent.memo && (
        <div className="rounded-lg border border-[var(--series-2)]/30 bg-[var(--series-2)]/5 p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--series-2)]">
            Lead memo
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-primary)]">
            {agent.memo}
          </p>
        </div>
      )}
    </div>
  );
}

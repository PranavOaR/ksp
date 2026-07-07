'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RiskBadge, StatusBadge } from '@/components/ui';
import { useLanguage } from '@/lib/i18n';
import type { ChatResponse } from './types';

function ConfidenceMeter({ value }: { value: number }) {
  const { t } = useLanguage();
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2" title={`Confidence ${percent}%`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--series-2)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] text-[var(--text-muted)]">{percent}{t('copilot.confidence')}</span>
    </div>
  );
}

/** Renders one copilot answer with evidence + reasoning trail (Module I). */
export function ResponseCard({ response }: { response: ChatResponse }) {
  const { t } = useLanguage();
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-primary)]">{response.answer}</p>
      <div className="flex items-center gap-3">
        <ConfidenceMeter value={response.confidence} />
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            response.engine === 'claude'
              ? 'bg-[var(--series-1)]/15 text-[var(--series-1)]'
              : 'bg-slate-500/15 text-slate-400'
          }`}
          title={
            response.engine === 'claude'
              ? 'Query understood by Claude AI'
              : 'Query understood by the offline rule engine'
          }
        >
          {response.engine === 'claude' ? '✦ Claude AI' : 'Rule engine'}
        </span>
      </div>

      {response.firs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-1)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)] text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">{t('copilot.response.fir')}</th>
                <th className="px-3 py-2 font-medium">{t('copilot.response.type')}</th>
                <th className="px-3 py-2 font-medium">{t('copilot.response.district')}</th>
                <th className="px-3 py-2 font-medium">{t('copilot.response.occurred')}</th>
                <th className="px-3 py-2 font-medium">{t('copilot.response.status')}</th>
              </tr>
            </thead>
            <tbody>
              {response.firs.slice(0, 8).map((fir) => (
                <tr key={fir.id} className="border-t border-[var(--border-1)]">
                  <td className="px-3 py-2">
                    <Link href={`/cases/${fir.id}`} className="text-[var(--series-1)] hover:underline">
                      {fir.fir_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{fir.crime_type}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{fir.district}</td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">
                    {fir.occurred_at.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={fir.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {response.totalCount > 8 && (
            <p className="px-3 py-2 text-[11px] text-[var(--text-muted)]">
              {t('copilot.response.showingOf')} {response.totalCount} {t('copilot.response.matchingFirs')}
            </p>
          )}
        </div>
      )}

      {response.offenders.length > 0 && (
        <ul className="space-y-2">
          {response.offenders.slice(0, 6).map((offender) => (
            <li
              key={offender.personId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2 text-xs"
            >
              <div>
                <span className="font-medium text-[var(--text-primary)]">{offender.name}</span>
                <span className="ml-2 text-[var(--text-muted)]">
                  {offender.caseCount} cases · {offender.crimeTypes.join(', ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">{t('copilot.response.risk')} {offender.riskScore}</span>
                <RiskBadge category={offender.riskCategory} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {response.evidence.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-muted)]">{t('copilot.response.evidence')}</span>
          {response.evidence.slice(0, 6).map((reference) => (
            <span
              key={reference}
              className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
            >
              {reference}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowReasoning((previous) => !previous)}
        className="text-[11px] text-[var(--series-1)] hover:underline"
      >
        {showReasoning ? t('copilot.response.hideReasoning') : t('copilot.response.showReasoning')}
      </button>
      {showReasoning && (
        <ol className="list-decimal space-y-1 pl-5 text-[11px] text-[var(--text-secondary)]">
          {response.isRefinement && <li>{t('copilot.response.refinement')}</li>}
          {response.reasoningTrail.map((step) => (
            <li key={step}>{step}</li>
          ))}
          <li>{t('copilot.response.executedQuery')}</li>
        </ol>
      )}
    </div>
  );
}

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
export function ResponseCard({
  response,
  onFollowUp,
}: {
  response: ChatResponse;
  /** Lets embedded suggestions (e.g. candidate names) re-ask the copilot. */
  onFollowUp?: (question: string) => void;
}) {
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

      {response.kind === 'candidates' && response.candidates && (
        <div className="flex flex-wrap gap-2">
          {response.candidates.map((candidate) => (
            <button
              key={candidate.personId}
              type="button"
              onClick={() => onFollowUp?.(`Who is ${candidate.name}?`)}
              className="rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-primary)] transition hover:border-[var(--series-1)]"
            >
              {candidate.name}
              <span className="ml-1.5 text-[var(--text-muted)]">
                {candidate.district} · {candidate.caseCount}
              </span>
            </button>
          ))}
        </div>
      )}

      {response.kind === 'caseDetail' && response.caseId != null && (
        <Link
          href={`/cases/${response.caseId}`}
          className="inline-block rounded-lg border border-[var(--series-1)]/40 px-3 py-1.5 text-xs font-medium text-[var(--series-1)] transition hover:bg-[var(--series-1)]/10"
        >
          Open full case file →
        </Link>
      )}

      {response.network && (
        <div className="space-y-2 rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)]/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">
              {response.network.nodeCount} entities · {response.network.edgeCount} links ·{' '}
              {response.network.hops}-hop
            </span>
            <Link
              href={`/network?personId=${response.network.personId}&name=${encodeURIComponent(response.network.personName)}`}
              className="text-[var(--series-1)] hover:underline"
            >
              Open full graph →
            </Link>
          </div>
          {response.network.topAssociates.length > 0 && (
            <ul className="space-y-1">
              {response.network.topAssociates.map((associate) => (
                <li
                  key={associate.personId}
                  className="flex items-center justify-between text-xs text-[var(--text-secondary)]"
                >
                  <button
                    type="button"
                    onClick={() => onFollowUp?.(`Who is ${associate.name}?`)}
                    className="text-[var(--text-primary)] hover:text-[var(--series-1)] hover:underline"
                  >
                    {associate.name}
                  </button>
                  <span className="text-[var(--text-muted)]">
                    {associate.sharedCases} shared case{associate.sharedCases === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {response.financial && (
        <div className="space-y-2 rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)]/60 p-3 text-xs">
          <div className="flex flex-wrap gap-4">
            <span>
              <span className="font-semibold text-[var(--text-primary)]">{response.financial.ringCount}</span>{' '}
              <span className="text-[var(--text-muted)]">rings</span>
            </span>
            <span>
              <span className="font-semibold text-[var(--text-primary)]">
                ₹{Math.round(response.financial.flaggedVolume).toLocaleString('en-IN')}
              </span>{' '}
              <span className="text-[var(--text-muted)]">flagged</span>
            </span>
            <span>
              <span className="font-semibold text-[var(--text-primary)]">{response.financial.transferCount}</span>{' '}
              <span className="text-[var(--text-muted)]">transactions</span>
            </span>
            <Link href="/financial" className="ml-auto text-[var(--series-1)] hover:underline">
              Open money trail →
            </Link>
          </div>
        </div>
      )}

      {response.actSection && (
        <div className="rounded-lg border-l-2 border-[var(--series-2)] bg-[var(--surface-2)]/60 p-3 text-xs">
          <span className="font-semibold text-[var(--text-primary)]">
            {response.actSection.actName} §{response.actSection.sectionCode}
          </span>
          <p className="mt-1 text-[var(--text-secondary)]">
            {response.actSection.sectionDescription}
          </p>
        </div>
      )}

      {response.hotspots && response.hotspots.length > 0 && (
        <ul className="space-y-1.5">
          {response.hotspots.slice(0, 6).map((hotspot) => (
            <li key={hotspot.region} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-primary)]">
                  {hotspot.region}
                  {hotspot.isEmerging && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-500">
                      +{hotspot.growthPercent}%
                    </span>
                  )}
                </span>
                <span className="text-[var(--text-muted)]">{hotspot.total}</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className={`h-full rounded-full ${hotspot.isEmerging ? 'bg-amber-500' : 'bg-[var(--series-1)]'}`}
                  style={{ width: `${Math.round(hotspot.intensity * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

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

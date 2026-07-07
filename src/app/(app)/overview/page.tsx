'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import type { UserRole } from '@/lib/constants';
import { Card, ErrorState, LoadingState, StatusBadge } from '@/components/ui';
import { useUser } from '@/components/UserProvider';
import { useLanguage, type MessageKey } from '@/lib/i18n';

const COUNT_UP_DURATION_MS = 900;

/** Animated counter for KPI stat tiles. */
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayed(Math.round(value * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return (
    <span>
      {displayed}
      {suffix}
    </span>
  );
}

interface OverviewData {
  kpis: {
    totalFirs: number;
    solvedRate: number;
    repeatOffenders: number;
    highRiskOffenders: number;
    crimeRings: number;
  };
  alerts: Array<{ district: string; growthPercent: number; message: string }>;
  recentFirs: Array<{
    id: number;
    fir_number: string;
    crime_type: string;
    district: string;
    occurred_at: string;
    status: string;
  }>;
}

const KPI_DEFS: Array<{ key: keyof OverviewData['kpis']; labelKey: MessageKey; suffix?: string }> = [
  { key: 'totalFirs', labelKey: 'overview.kpi.totalFirs' },
  { key: 'solvedRate', labelKey: 'overview.kpi.solvedRate', suffix: '%' },
  { key: 'repeatOffenders', labelKey: 'overview.kpi.repeatOffenders' },
  { key: 'highRiskOffenders', labelKey: 'overview.kpi.highRiskOffenders' },
  { key: 'crimeRings', labelKey: 'overview.kpi.crimeRings' },
];

type BlockKey = 'copilot' | 'alerts' | 'recent';

/** What each role sees first after signing in (role-respecting dashboard, PRD J1). */
const ROLE_FOCUS: Record<UserRole, { blocks: BlockKey[]; note: string }> = {
  Investigator: {
    blocks: ['copilot', 'recent', 'alerts'],
    note: 'Your active leads: ask the Copilot, then review the latest FIRs.',
  },
  Analyst: {
    blocks: ['alerts', 'copilot', 'recent'],
    note: 'Emerging patterns first — full trends and forecasts are in Analytics.',
  },
  Supervisor: {
    blocks: ['alerts', 'recent', 'copilot'],
    note: 'District alerts and case flow at a glance; the audit trail is one click away.',
  },
  Administrator: {
    blocks: ['alerts', 'recent', 'copilot'],
    note: 'Full oversight: all modules, audit trail and access control.',
  },
};

export default function OverviewPage() {
  const user = useUser();
  const { t } = useLanguage();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<OverviewData>('/api/overview').then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  const focus = ROLE_FOCUS[user.role];

  const isEmpty = data.kpis.totalFirs === 0;

  const blocks: Record<BlockKey, React.ReactNode> = {
    alerts: (
      <Card key="alerts" title={t('overview.alerts.title')} subtitle={t('overview.alerts.subtitle')}>
        {data.alerts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t('overview.alerts.none')}</p>
        ) : (
          <ul className="space-y-2">
            {data.alerts.map((alert) => (
              <li
                key={alert.district}
                className="flex items-start gap-2 rounded-lg border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800"
              >
                <span aria-hidden>⚠</span>
                {alert.message}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          {t('overview.alerts.more')}{' '}
          <Link href="/analytics" className="text-[var(--accent)] hover:underline">
            {t('nav.analytics')}
          </Link>
          .
        </p>
      </Card>
    ),
    recent: (
      <Card key="recent" title={t('overview.recent.title')} subtitle={t('overview.recent.subtitle')}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-muted)]">
                <th className="pb-2 pr-3 font-medium">{t('copilot.response.fir')}</th>
                <th className="pb-2 pr-3 font-medium">{t('copilot.response.type')}</th>
                <th className="pb-2 pr-3 font-medium">{t('copilot.response.district')}</th>
                <th className="pb-2 font-medium">{t('copilot.response.status')}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentFirs.slice(0, 6).map((fir) => (
                <tr key={fir.id} className="border-t border-[var(--border-1)]">
                  <td className="py-2 pr-3">
                    <Link href={`/cases/${fir.id}`} className="text-[var(--accent)] hover:underline">
                      {fir.fir_number}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-secondary)]">{fir.crime_type}</td>
                  <td className="py-2 pr-3 text-[var(--text-secondary)]">{fir.district}</td>
                  <td className="py-2">
                    <StatusBadge status={fir.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    ),
    copilot: (
      <Card key="copilot" title={t('overview.copilot.title')} subtitle={t('overview.copilot.subtitle')}>
        <div className="flex flex-wrap gap-2">
          {[
            'Show all burglary FIRs in Bengaluru during March 2026',
            'List repeat offenders involved in cybercrime',
            'How many vehicle thefts in Mysuru in 2025?',
          ].map((example) => (
            <Link
              key={example}
              href={`/copilot?q=${encodeURIComponent(example)}`}
              className="rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            >
              “{example}”
            </Link>
          ))}
        </div>
        <Link href="/copilot" className="btn-primary mt-4 inline-block px-5 py-2 text-xs">
          {t('overview.copilot.open')}
        </Link>
      </Card>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="rise-in mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text-primary)] lg:text-4xl">
          {t('overview.title')}<span className="text-[var(--accent)]">.</span>
        </h1>
        <p className="font-serif-note mt-2 text-[15px] text-[var(--text-secondary)]">{t(`overview.note.${user.role}`)}</p>
        {user.role === 'Administrator' && (
          <button
            type="button"
            onClick={() => {
              void apiFetch('/api/admin/reset-demo', { method: 'POST' }).then(() => window.location.reload());
            }}
            className="btn-ghost mt-3 px-4 py-1.5 text-xs"
            title="Restores the Demo workspace to its original seeded dataset"
          >
            {t('overview.resetDemo')}
          </button>
        )}
      </div>

      {isEmpty && (
        <Card title={t('cases.empty.title')}>
          <p className="text-sm text-[var(--text-secondary)]">{t('cases.empty.body')}</p>
          <Link href="/cases/new" className="btn-primary mt-4 inline-block px-5 py-2.5 text-xs">
            {t('cases.empty.cta')}
          </Link>
        </Card>
      )}

      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-5">
        {KPI_DEFS.map(({ key, labelKey, suffix }) => (
          <div key={key} className="card p-5">
            <div className="font-display text-4xl font-black tracking-tight text-[var(--text-primary)] tabular-nums">
              <CountUp value={data.kpis[key]} suffix={suffix ?? ''} />
            </div>
            <div className="kicker mt-2">{t(labelKey)}</div>
          </div>
        ))}
      </div>

      <div className="stagger grid gap-6 lg:grid-cols-2">
        {focus.blocks.slice(0, 2).map((blockKey) => blocks[blockKey])}
      </div>
      <div className="stagger grid gap-6">{blocks[focus.blocks[2]]}</div>
    </div>
  );
}

'use client';

export function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      {title ? (
        <header className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Solved: 'bg-emerald-500/15 text-emerald-400',
  'Under Investigation': 'bg-amber-500/15 text-amber-400',
  Open: 'bg-sky-500/15 text-sky-400',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
        STATUS_STYLES[status] ?? 'bg-slate-500/15 text-slate-300'
      }`}
    >
      {status}
    </span>
  );
}

const RISK_STYLES: Record<string, string> = {
  High: 'bg-red-500/15 text-red-400',
  Medium: 'bg-amber-500/15 text-amber-400',
  Low: 'bg-emerald-500/15 text-emerald-400',
};

export function RiskBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        RISK_STYLES[category] ?? ''
      }`}
    >
      {category === 'High' ? '▲ ' : ''}
      {category}
    </span>
  );
}

export function LoadingState({ label = 'Loading intelligence…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 p-8 text-sm text-[var(--text-muted)]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--series-1)]" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-red-500/40 p-5 text-sm text-red-400">
      {message}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

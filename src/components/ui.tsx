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
    <section className={`card p-5 lg:p-6 ${className}`}>
      {title ? (
        <header className="mb-4">
          <h2 className="font-display text-sm font-bold text-[var(--text-primary)]">{title}</h2>
          {subtitle ? (
            <p className="font-serif-note mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Solved: 'bg-emerald-600/10 text-emerald-700',
  'Under Investigation': 'bg-amber-500/15 text-amber-700',
  Open: 'bg-sky-600/10 text-sky-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        STATUS_STYLES[status] ?? 'bg-stone-500/10 text-stone-600'
      }`}
    >
      {status}
    </span>
  );
}

const RISK_STYLES: Record<string, string> = {
  High: 'bg-red-600/10 text-red-700',
  Medium: 'bg-amber-500/15 text-amber-700',
  Low: 'bg-emerald-600/10 text-emerald-700',
};

export function RiskBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
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
    <div className="fade-in flex items-center gap-3 p-8 text-sm text-[var(--text-muted)]">
      <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[var(--accent)]" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="card border-red-300 p-5 text-sm text-red-700">{message}</div>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rise-in mb-7">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--text-primary)] lg:text-4xl">
        {title}
        <span className="text-[var(--accent)]">.</span>
      </h1>
      <p className="font-serif-note mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

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
        <header className="mb-4 border-b border-[var(--border-1)]/70 pb-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-[var(--text-primary)]">
            <span aria-hidden className="h-3.5 w-1 rounded-full bg-[var(--accent)]" />
            {title}
          </h2>
          {subtitle ? (
            <p className="font-serif-note mt-1 pl-3 text-xs text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, { chip: string; dot: string }> = {
  Solved: { chip: 'bg-emerald-600/10 text-emerald-700 ring-emerald-600/25', dot: 'bg-emerald-600' },
  'Under Investigation': { chip: 'bg-amber-500/15 text-amber-700 ring-amber-500/30', dot: 'bg-amber-500' },
  Open: { chip: 'bg-sky-600/10 text-sky-700 ring-sky-600/25', dot: 'bg-sky-600' },
};

const FALLBACK_STATUS_STYLE = { chip: 'bg-stone-500/10 text-stone-600 ring-stone-500/25', dot: 'bg-stone-500' };

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? FALLBACK_STATUS_STYLE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style.chip}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

const RISK_STYLES: Record<string, string> = {
  High: 'bg-red-600/10 text-red-700 ring-red-600/25',
  Medium: 'bg-amber-500/15 text-amber-700 ring-amber-500/30',
  Low: 'bg-emerald-600/10 text-emerald-700 ring-emerald-600/25',
};

export function RiskBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
        RISK_STYLES[category] ?? 'ring-stone-500/25'
      }`}
    >
      {category === 'High' ? <span aria-hidden>▲</span> : null}
      {category}
    </span>
  );
}

export function LoadingState({ label = 'Loading intelligence…' }: { label?: string }) {
  return (
    <div className="fade-in flex items-center gap-3 p-8 text-sm text-[var(--text-muted)]">
      <span aria-hidden className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:240ms]" />
      </span>
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-l-4 border-red-400 p-5">
      <p className="flex items-start gap-2.5 text-sm text-red-700">
        <span aria-hidden className="mt-px">⚠</span>
        <span>{message}</span>
      </p>
    </div>
  );
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
      <div aria-hidden className="dot-rule mt-3 w-24" />
    </div>
  );
}

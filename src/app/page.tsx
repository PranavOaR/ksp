'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { DotField } from '@/components/landing/DotField';
import { LandingFooter, LandingNav } from '@/components/landing/LandingChrome';

function FloatCard({
  className,
  isVisible,
  children,
}: {
  className: string;
  isVisible: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`float-card absolute rounded-2xl border border-[var(--border-1)] bg-white p-4 ${className} ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-[0.22]'
      }`}
      aria-hidden={!isVisible}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();
  const [withDrishti, setWithDrishti] = useState(true);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <LandingNav />

      {/* Hero */}
      <section className="mx-auto grid w-[min(1180px,92%)] gap-12 pb-16 pt-14 lg:grid-cols-[1.02fr_1fr] lg:items-center">
        <div className="rise-in">
          <div className="mb-7 flex items-center gap-3 text-[15px]">
            <span className="flex -space-x-1.5" aria-hidden>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] text-white">✦</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1b1813] text-[10px] text-white">◆</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2a78d6] text-[10px] text-white">●</span>
            </span>
            <span className="text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">{t('landing.eyebrowStrong')}</strong>
              {t('landing.eyebrowRest')}
            </span>
          </div>

          <h1 className="font-display text-[clamp(3.2rem,7.5vw,6rem)] font-black leading-[0.98] tracking-tight text-[var(--text-primary)]">
            {t('landing.h1a')}
            <br />
            {t('landing.h1b')}
            <br />
            <span className="text-[var(--accent)]">{t('landing.h1c')}</span>
          </h1>
          <div className="dot-rule mt-4 w-[86%]" aria-hidden />

          <p className="font-serif-note mt-8 max-w-xl text-xl leading-relaxed text-[var(--text-secondary)]">
            {t('landing.sub')}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link href="/login" className="btn-primary px-7 py-3.5 text-base">
              {t('landing.ctaPrimary')}
            </Link>
            <Link
              href="/login"
              className="text-base font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-8 transition-colors hover:text-[var(--accent)]"
            >
              {t('landing.ctaSecondary')}
            </Link>
          </div>
          <p className="font-serif-note mt-6 text-sm text-[var(--text-muted)]">
            {t('landing.finePrint')}
          </p>
        </div>

        {/* Dotted Karnataka field with floating intel cards */}
        <div className="rise-in relative" style={{ animationDelay: '0.15s' }}>
          <button
            type="button"
            onClick={() => setWithDrishti((previous) => !previous)}
            className="absolute -top-1 right-0 z-10 flex items-center gap-2.5 rounded-full border border-[var(--border-1)] bg-white py-1.5 pl-2 pr-4 shadow-md transition-transform hover:scale-[1.03]"
            aria-pressed={withDrishti}
          >
            <span
              className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                withDrishti ? 'bg-[var(--accent)]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  withDrishti ? 'translate-x-5' : ''
                }`}
              />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {withDrishti ? t('landing.withDrishti') : t('landing.withoutDrishti')}
            </span>
          </button>

          <DotField isActive={withDrishti} />

          <FloatCard className="float-delay-1 left-[2%] top-[16%] w-60" isVisible={withDrishti}>
            <div className="font-display text-sm font-bold text-[var(--text-primary)]">
              FIR/2026/BEN/0219
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">Burglary · Bengaluru City</div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Night break-in MO</span>
              <span className="font-semibold text-[var(--accent)]">3 similar cases</span>
            </div>
          </FloatCard>

          <FloatCard className="float-delay-2 right-[0%] top-[38%] w-56" isVisible={withDrishti}>
            <div className="font-display text-sm font-bold text-[var(--text-primary)]">
              Crime Ring #1
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">7 members · 21 joint cases</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[var(--text-secondary)]">Network mapped in 2 hops</span>
            </div>
          </FloatCard>

          <FloatCard className="float-delay-3 bottom-[8%] left-[14%] w-64" isVisible={withDrishti}>
            <div className="flex items-center justify-between">
              <div className="font-display text-sm font-bold text-[var(--text-primary)]">
                Early warning
              </div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                ⚠ EMERGING
              </span>
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Ballari · incident volume ▲ this quarter
            </div>
            <div className="mt-2 text-xs font-medium text-[var(--accent)]">
              Forecast: hotspot next month →
            </div>
          </FloatCard>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

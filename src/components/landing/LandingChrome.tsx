'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LangToggle, useLanguage } from '@/lib/i18n';

const NAV_LINKS = [
  { key: 'nav.platform', href: '/platform' },
  { key: 'nav.modules', href: '/modules' },
  { key: 'nav.security', href: '/security' },
] as const;

/** The floating pill navbar shared by all public pages. */
export function LandingNav() {
  const { t } = useLanguage();
  const pathname = usePathname();

  return (
    <header className="fade-in sticky top-5 z-20 mx-auto mt-5 flex w-[min(1060px,92%)] items-center justify-between rounded-full border border-[var(--border-1)] bg-[var(--surface-1)]/95 py-2.5 pl-5 pr-2.5 shadow-[0_10px_34px_-18px_rgba(27,24,19,0.4)] backdrop-blur">
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/drishti-logo.png"
          alt="DRISHTI logo"
          width={32}
          height={32}
          priority
          className="h-8 w-8 rounded-lg"
        />
        <span className="font-display text-lg font-extrabold tracking-tight">DRISHTI</span>
      </Link>
      <nav className="hidden items-center gap-7 text-sm text-[var(--text-secondary)] md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`transition-colors hover:text-[var(--text-primary)] ${
              pathname === link.href ? 'font-semibold text-[var(--accent-deep)]' : ''
            }`}
          >
            {t(link.key)}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <LangToggle className="hidden sm:block" />
        <Link
          href="/login"
          className="hidden px-3 py-2 text-sm font-medium text-[var(--text-primary)] sm:block"
        >
          {t('nav.signIn')}
        </Link>
        <Link href="/login" className="btn-primary px-5 py-2.5 text-sm">
          {t('nav.getStarted')}
        </Link>
      </div>
    </header>
  );
}

/** Shared caps strip + CTA footer for public pages. */
export function LandingFooter({ showCta = false }: { showCta?: boolean }) {
  const { t } = useLanguage();
  return (
    <footer className="fade-in mx-auto w-[min(1180px,92%)] border-t border-[var(--border-1)] pb-12 pt-8 text-center">
      {showCta && (
        <div className="mb-10">
          <p className="font-display text-2xl font-extrabold text-[var(--text-primary)]">
            {t('common.getStartedCta')}
          </p>
          <Link href="/login" className="btn-primary mt-4 inline-block px-7 py-3 text-sm">
            {t('common.openApp')}
          </Link>
        </div>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
        {t('landing.footerCaps')}
      </p>
      <p className="font-serif-note mt-4 text-xs text-[var(--text-muted)]">
        {t('landing.footerNote')}
      </p>
    </footer>
  );
}

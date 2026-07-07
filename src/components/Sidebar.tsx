'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';
import { canAccess } from '@/lib/authShared';
import { useLanguage, type MessageKey } from '@/lib/i18n';
import { useUser } from './UserProvider';

const NAV_ITEMS: Array<{ href: string; labelKey: MessageKey; icon: string }> = [
  { href: '/overview', labelKey: 'nav.overview', icon: '◉' },
  { href: '/copilot', labelKey: 'nav.copilot', icon: '⌘' },
  { href: '/network', labelKey: 'nav.network', icon: '⬡' },
  { href: '/financial', labelKey: 'nav.financial', icon: '₹' },
  { href: '/analytics', labelKey: 'nav.analytics', icon: '▤' },
  { href: '/offenders', labelKey: 'nav.offenders', icon: '▲' },
  { href: '/cases', labelKey: 'nav.cases', icon: '≡' },
  { href: '/sociology', labelKey: 'nav.sociology', icon: '◈' },
  { href: '/audit', labelKey: 'nav.audit', icon: '✓' },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useUser();
  const { t } = useLanguage();
  const visibleItems = NAV_ITEMS.filter((item) => canAccess(item.href, user.role));

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--border-1)] bg-[var(--surface-1)] md:flex">
      <div className="px-5 py-6">
        <Link href="/overview" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] font-display text-lg font-black text-white shadow-[0_6px_16px_-8px_rgba(224,90,28,0.7)]">
            ದೃ
          </span>
          <span>
            <span className="block font-display text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
              {APP_NAME}
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('chrome.ksp')}
            </span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent-deep)]'
                  : 'text-[var(--text-secondary)] hover:translate-x-0.5 hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--accent)]"
                />
              ) : null}
              <span
                aria-hidden
                className={`w-4 text-center ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
              >
                {item.icon}
              </span>
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border-1)] p-5 text-[10px] leading-relaxed text-[var(--text-muted)]">
        {t('chrome.sidebarNote1')}
        <br />
        {t('chrome.sidebarNote2')}
      </div>
    </aside>
  );
}

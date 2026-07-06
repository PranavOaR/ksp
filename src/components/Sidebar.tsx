'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';

const NAV_ITEMS = [
  { href: '/', label: 'Command Overview', icon: '◉' },
  { href: '/copilot', label: 'Copilot', icon: '⌘' },
  { href: '/network', label: 'Network Intel', icon: '⬡' },
  { href: '/analytics', label: 'Analytics', icon: '▤' },
  { href: '/offenders', label: 'Offender Risk', icon: '▲' },
  { href: '/cases', label: 'Case Files', icon: '≡' },
  { href: '/audit', label: 'Audit Trail', icon: '✓' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border-1)] bg-[var(--surface-1)] md:flex">
      <div className="border-b border-[var(--border-1)] px-5 py-5">
        <div className="text-lg font-bold tracking-widest text-[var(--series-1)]">{APP_NAME}</div>
        <div className="mt-1 text-[11px] leading-tight text-[var(--text-muted)]">
          KSP Crime Intelligence Copilot
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--surface-2)] font-medium text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span aria-hidden className="w-4 text-center text-[var(--series-1)]">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border-1)] p-4 text-[10px] leading-relaxed text-[var(--text-muted)]">
        Synthetic demo data only.
        <br />
        All access is audit-logged.
      </div>
    </aside>
  );
}

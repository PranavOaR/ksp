'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser } from './UserProvider';
import { WorkspaceSwitch } from './WorkspaceSwitch';
import { LangToggle, useLanguage } from '@/lib/i18n';

function greetingKeyForHour(hour: number): 'chrome.goodMorning' | 'chrome.goodAfternoon' | 'chrome.goodEvening' {
  if (hour < 12) return 'chrome.goodMorning';
  if (hour < 17) return 'chrome.goodAfternoon';
  return 'chrome.goodEvening';
}

export function TopBar() {
  const user = useUser();
  const router = useRouter();
  const { t } = useLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border-1)] bg-[var(--surface-1)]/90 px-6 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <span className="font-display text-sm font-bold text-[var(--text-primary)]">
            {t(greetingKeyForHour(new Date().getHours()))}, {user.rank} {user.name}
          </span>
          <span className="ml-3 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-deep)]">
            {t(`role.${user.role}`)}
          </span>
          <span
            className="ml-2 hidden rounded-full border border-[var(--border-1)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)] lg:inline"
            title={
              user.jurisdictionDistrict
                ? `Data access scoped to ${user.jurisdictionDistrict}`
                : 'Statewide data access'
            }
          >
            {user.unitName} · {user.jurisdictionDistrict ?? t('chrome.statewide')}
          </span>
        </div>
        <div className="flex items-center gap-2">
        <WorkspaceSwitch />
        <span aria-hidden className="mx-1 h-5 w-px bg-[var(--border-1)]" />
        <LangToggle />
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={isSigningOut}
          className="btn-ghost px-4 py-1.5 text-xs disabled:opacity-50"
        >
          {isSigningOut ? t('chrome.signingOut') : t('chrome.signOut')}
        </button>
        </div>
      </div>
    </header>
  );
}

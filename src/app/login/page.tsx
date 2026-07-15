'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LangToggle, useLanguage } from '@/lib/i18n';

const DEMO_ACCOUNTS = [
  { username: 'investigator', label: 'Investigator', detail: 'Insp. Ravi Kumar' },
  { username: 'analyst', label: 'Analyst', detail: 'Deepa Rao' },
  { username: 'supervisor', label: 'Supervisor', detail: 'DySP Harish Gowda' },
  { username: 'admin', label: 'Administrator', detail: 'SP Anitha Shetty' },
];

const DEMO_PASSWORD = 'drishti123';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const submit = async (event?: React.FormEvent, overrideUser?: string) => {
    event?.preventDefault();
    const user = overrideUser ?? username;
    const pass = overrideUser ? DEMO_PASSWORD : password;
    if (!user || !pass) return;
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setError(body?.error ?? 'Sign in failed.');
        return;
      }
      router.replace('/overview');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="rise-in w-full max-w-md">
        <div className="mb-4 flex justify-end"><LangToggle /></div>
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image
            src="/drishti-logo.png"
            alt="DRISHTI logo"
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-xl"
          />
          <span className="font-display text-2xl font-extrabold tracking-tight">DRISHTI</span>
        </Link>

        <div className="card p-7">
          <h1 className="font-display text-xl font-extrabold text-[var(--text-primary)]">
            {t('login.title')}<span className="text-[var(--accent)]">.</span>
          </h1>
          <p className="font-serif-note mt-1 text-sm text-[var(--text-muted)]">
            {t('login.subtitle')}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t('login.username')}
              autoComplete="username"
              className="w-full rounded-xl border border-[var(--border-1)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('login.password')}
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--border-1)] bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)]"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isBusy || !username || !password}
              className="btn-primary w-full py-3 text-sm disabled:opacity-50"
            >
              {isBusy ? t('login.signingIn') : t('login.submit')}
            </button>
          </form>

          <div className="mt-6 border-t border-dashed border-[var(--border-1)] pt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {t('login.demoLabel')} {DEMO_PASSWORD}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  disabled={isBusy}
                  onClick={() => void submit(undefined, account.username)}
                  className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-2)]/60 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]"
                >
                  <span className="block text-xs font-bold text-[var(--text-primary)]">
                    {account.label}
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)]">{account.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="font-serif-note mt-5 text-center text-xs text-[var(--text-muted)]">
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}

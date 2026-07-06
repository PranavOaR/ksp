'use client';

import { useEffect, useState } from 'react';
import type { Workspace } from '@/lib/workspace';

function readWorkspaceCookie(): Workspace {
  if (typeof document === 'undefined') return 'demo';
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('drishti_ws='));
  return match?.endsWith('live') ? 'live' : 'demo';
}

/** Demo (synthetic) vs Live (the unit's own records) data switch. */
export function WorkspaceSwitch() {
  const [workspace, setWorkspace] = useState<Workspace>('demo');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setWorkspace(readWorkspaceCookie());
  }, []);

  const switchTo = async (next: Workspace) => {
    if (next === workspace || isBusy) return;
    setIsBusy(true);
    try {
      await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: next }),
      });
      // Full reload so every page refetches from the new workspace
      window.location.reload();
    } catch {
      setIsBusy(false);
    }
  };

  return (
    <div
      className="flex items-center rounded-full border border-[var(--border-1)] bg-[var(--surface-2)]/70 p-0.5 text-xs font-semibold"
      title="Demo = synthetic dataset for testing · Live = your unit's own case files"
    >
      {(['demo', 'live'] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={isBusy}
          onClick={() => void switchTo(option)}
          className={`rounded-full px-3 py-1 transition-colors ${
            workspace === option
              ? option === 'live'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-white text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {option === 'demo' ? 'Demo' : 'Live'}
        </button>
      ))}
    </div>
  );
}

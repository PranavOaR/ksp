'use client';

import { useEffect, useState } from 'react';
import { USER_ROLES } from '@/lib/constants';
import { getStoredRole, setStoredRole } from '@/lib/clientApi';

/** RBAC-lite role switcher (PRD J1) — the active role tags every audit entry. */
export function TopBar() {
  const [role, setRole] = useState('Investigator');

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  const handleChange = (nextRole: string) => {
    setRole(nextRole);
    setStoredRole(nextRole);
  };

  return (
    <header className="flex items-center justify-between border-b border-[var(--border-1)] bg-[var(--surface-1)] px-6 py-3">
      <div className="text-sm text-[var(--text-secondary)]">
        Karnataka State Police · Intelligence Division
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-muted)]">Signed in as</span>
        <select
          value={role}
          onChange={(event) => handleChange(event.target.value)}
          className="rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--series-1)]"
          aria-label="Active role"
        >
          {USER_ROLES.map((userRole) => (
            <option key={userRole} value={userRole}>
              {userRole}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}

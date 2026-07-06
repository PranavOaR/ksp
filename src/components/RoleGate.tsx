'use client';

import type { UserRole } from '@/lib/constants';
import { Card } from './ui';
import { useUser } from './UserProvider';

/** Blocks direct-URL access to role-restricted pages (PRD J1). */
export function RoleGate({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const user = useUser();
  if (!allow.includes(user.role)) {
    return (
      <Card title="Access restricted">
        <p className="text-sm text-[var(--text-secondary)]">
          This module is available to {allow.join(' and ')} roles. Your current role is{' '}
          <strong>{user.role}</strong>. This access attempt has been recorded.
        </p>
      </Card>
    );
  }
  return <>{children}</>;
}

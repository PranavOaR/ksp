import type { UserRole } from './constants';

/**
 * Client-safe role-access rules (PRD J1). Kept separate from lib/auth.ts,
 * which imports node:crypto and must stay server-only.
 */
export const ROLE_ACCESS: Record<string, UserRole[]> = {
  '/audit': ['Supervisor', 'Administrator'],
  '/financial': ['Analyst', 'Supervisor', 'Administrator'],
};

export function canAccess(pathname: string, role: UserRole): boolean {
  const restricted = Object.entries(ROLE_ACCESS).find(([prefix]) => pathname.startsWith(prefix));
  return !restricted || restricted[1].includes(role);
}

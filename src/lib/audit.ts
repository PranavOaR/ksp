import type { Database } from 'better-sqlite3';
import { USER_ROLES, type UserRole } from './constants';

export interface AuditEntry {
  id: number;
  actor_role: string;
  action: string;
  detail: string;
  created_at: string;
}

/** Every query/export/access event is recorded (PRD J2: 100% auditability). */
export function logAudit(db: Database, role: string, action: string, detail: string): void {
  const safeRole = normalizeRole(role);
  db.prepare('INSERT INTO audit_log (actor_role, action, detail) VALUES (?, ?, ?)').run(
    safeRole,
    action,
    detail.slice(0, 500)
  );
}

export function getAuditLog(db: Database, limit = 100): AuditEntry[] {
  return db
    .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?')
    .all(limit) as AuditEntry[];
}

export function normalizeRole(role: string): UserRole {
  return (USER_ROLES as readonly string[]).includes(role) ? (role as UserRole) : 'Investigator';
}

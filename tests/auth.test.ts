import { describe, expect, test } from 'vitest';
import {
  authenticate,
  canAccess,
  createSessionToken,
  DEMO_USERS,
  verifySessionToken,
} from '@/lib/auth';

const investigator = DEMO_USERS[0];

describe('authenticate', () => {
  test('accepts valid demo credentials', () => {
    expect(authenticate('investigator', 'drishti123')?.role).toBe('Investigator');
  });

  test('is case-insensitive on username but strict on password', () => {
    expect(authenticate('  INVESTIGATOR ', 'drishti123')).not.toBeNull();
    expect(authenticate('investigator', 'DRISHTI123')).toBeNull();
  });

  test('rejects unknown users and wrong passwords', () => {
    expect(authenticate('ghost', 'drishti123')).toBeNull();
    expect(authenticate('investigator', 'wrong')).toBeNull();
  });
});

describe('session tokens', () => {
  test('round-trips a valid session', () => {
    const token = createSessionToken(investigator);

    const session = verifySessionToken(token);

    expect(session?.username).toBe('investigator');
    expect(session?.role).toBe('Investigator');
    expect(session?.rank).toBe('Inspector');
  });

  test('rejects tampered payloads', () => {
    const token = createSessionToken(investigator);
    const [payload, signature] = token.split('.');
    const forged = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    forged.role = 'Administrator';
    const forgedPayload = Buffer.from(JSON.stringify(forged)).toString('base64url');

    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  test('rejects expired sessions', () => {
    const issuedAt = 1_000_000;
    const token = createSessionToken(investigator, issuedAt);

    const thirteenHoursLater = issuedAt + 13 * 60 * 60;
    expect(verifySessionToken(token, thirteenHoursLater)).toBeNull();
  });

  test('rejects garbage tokens', () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('abc')).toBeNull();
    expect(verifySessionToken('abc.def')).toBeNull();
  });
});

describe('canAccess (J1 role gating)', () => {
  test('audit trail is restricted to Supervisor and Administrator', () => {
    expect(canAccess('/audit', 'Investigator')).toBe(false);
    expect(canAccess('/audit', 'Analyst')).toBe(false);
    expect(canAccess('/audit', 'Supervisor')).toBe(true);
    expect(canAccess('/audit', 'Administrator')).toBe(true);
  });

  test('financial intel excludes Investigator', () => {
    expect(canAccess('/financial', 'Investigator')).toBe(false);
    expect(canAccess('/financial', 'Analyst')).toBe(true);
  });

  test('unrestricted pages are open to all roles', () => {
    expect(canAccess('/copilot', 'Investigator')).toBe(true);
    expect(canAccess('/overview', 'Analyst')).toBe(true);
  });
});

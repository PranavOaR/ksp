import { afterEach, describe, expect, test, vi } from 'vitest';
import { createSessionToken, DEMO_USERS, SESSION_COOKIE } from '@/lib/auth';
import { GET as getAnalytics } from '@/app/api/analytics/route';
import { GET as getAudit, POST as postAudit } from '@/app/api/audit/route';
import { GET as getCases } from '@/app/api/cases/route';
import { GET as getCaseById } from '@/app/api/cases/[id]/route';
import { GET as getFinancial } from '@/app/api/financial/route';
import { GET as getMap } from '@/app/api/map/route';
import { GET as getNetwork } from '@/app/api/network/route';
import { GET as getOffenders } from '@/app/api/offenders/route';
import { GET as getOverview } from '@/app/api/overview/route';
import { GET as getSociology } from '@/app/api/sociology/route';
import { POST as postLogin } from '@/app/api/auth/login/route';

const investigator = DEMO_USERS[0];
const analyst = DEMO_USERS[1];

function authedRequest(user: (typeof DEMO_USERS)[number], url = 'http://test.local/api'): Request {
  return new Request(url, {
    headers: { cookie: `${SESSION_COOKIE}=${createSessionToken(user)}` },
  });
}

function anonRequest(url = 'http://test.local/api'): Request {
  return new Request(url);
}

describe('API session gate', () => {
  const openGets: Array<[string, (request: Request) => Promise<Response>]> = [
    ['analytics', getAnalytics],
    ['audit', getAudit],
    ['cases', getCases],
    ['financial', getFinancial],
    ['map', getMap],
    ['network', getNetwork],
    ['offenders', getOffenders],
    ['overview', getOverview],
    ['sociology', getSociology],
  ];

  test.each(openGets)('GET /api/%s returns 401 without a session', async (_name, handler) => {
    const response = await handler(anonRequest());
    expect(response.status).toBe(401);
  });

  test('GET /api/cases/[id] returns 401 without a session', async () => {
    const response = await getCaseById(anonRequest(), {
      params: Promise.resolve({ id: '1' }),
    });
    expect(response.status).toBe(401);
  });

  test('POST /api/audit returns 401 without a session', async () => {
    const request = new Request('http://test.local/api/audit', {
      method: 'POST',
      body: JSON.stringify({ action: 'export_pdf', detail: 'x' }),
    });
    const response = await postAudit(request);
    expect(response.status).toBe(401);
  });

  test('GET /api/cases succeeds with a valid session', async () => {
    const response = await getCases(authedRequest(investigator, 'http://test.local/api/cases'));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe('API role enforcement (ROLE_ACCESS parity)', () => {
  test('GET /api/financial returns 403 for Investigator', async () => {
    const response = await getFinancial(authedRequest(investigator));
    expect(response.status).toBe(403);
  });

  test('GET /api/financial succeeds for Analyst', async () => {
    const response = await getFinancial(authedRequest(analyst));
    expect(response.status).toBe(200);
  });

  test('GET /api/audit returns 403 for Investigator', async () => {
    const response = await getAudit(authedRequest(investigator));
    expect(response.status).toBe(403);
  });
});

describe('login hardening', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('rate-limits repeated failed logins with 429', async () => {
    const attempt = () =>
      postLogin(
        new Request('http://test.local/api/auth/login', {
          method: 'POST',
          headers: { 'x-forwarded-for': '203.0.113.9' },
          body: JSON.stringify({ username: 'ratelimit-probe', password: 'wrong' }),
        })
      );

    const statuses: number[] = [];
    for (let index = 0; index < 6; index += 1) {
      statuses.push((await attempt()).status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });

  test('successful logins are never counted against the rate limit', async () => {
    const attempt = (password: string) =>
      postLogin(
        new Request('http://test.local/api/auth/login', {
          method: 'POST',
          headers: { 'x-forwarded-for': '203.0.113.20' },
          body: JSON.stringify({ username: 'investigator', password }),
        })
      );

    // 4 failures leave one attempt in the window; a correct password must
    // still work, repeatedly — demo judges sign in and out many times.
    for (let index = 0; index < 4; index += 1) {
      expect((await attempt('wrong')).status).toBe(401);
    }
    for (let index = 0; index < 8; index += 1) {
      expect((await attempt('drishti123')).status).toBe(200);
    }
  });

  test('session cookie is Secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', 'test-secret');
    vi.stubEnv('DEMO_PASSWORD', 'prod-password');
    const response = await postLogin(
      new Request('http://test.local/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.10' },
        body: JSON.stringify({ username: 'investigator', password: 'prod-password' }),
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toMatch(/Secure/i);
  });

  test('production requires DEMO_PASSWORD to be configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', 'test-secret');
    vi.stubEnv('DEMO_PASSWORD', '');
    const response = await postLogin(
      new Request('http://test.local/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.11' },
        body: JSON.stringify({ username: 'investigator', password: 'drishti123' }),
      })
    );
    // Dev fallback password must not work in production
    expect(response.status).toBeGreaterThanOrEqual(401);
  });
});

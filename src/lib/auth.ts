import crypto from 'node:crypto';
import type { UserRole } from './constants';

export const SESSION_COOKIE = 'drishti_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // one shift

/** Demo credential store for the prototype — replace with KSP identity provider in production. */
export interface DemoUser {
  username: string;
  password: string;
  name: string;
  rank: string;
  role: UserRole;
}

export const DEMO_USERS: DemoUser[] = [
  { username: 'investigator', password: 'drishti123', name: 'Ravi Kumar', rank: 'Inspector', role: 'Investigator' },
  { username: 'analyst', password: 'drishti123', name: 'Deepa Rao', rank: 'Crime Analyst', role: 'Analyst' },
  { username: 'supervisor', password: 'drishti123', name: 'Harish Gowda', rank: 'DySP', role: 'Supervisor' },
  { username: 'admin', password: 'drishti123', name: 'Anitha Shetty', rank: 'SP', role: 'Administrator' },
];

export interface SessionUser {
  username: string;
  name: string;
  rank: string;
  role: UserRole;
  exp: number;
}

export { ROLE_ACCESS, canAccess } from './authShared';

function getSecret(): string {
  // Demo fallback keeps the prototype runnable without configuration
  return process.env.AUTH_SECRET ?? 'drishti-demo-secret-rotate-in-production';
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function authenticate(username: string, password: string): DemoUser | null {
  const user = DEMO_USERS.find((candidate) => candidate.username === username.toLowerCase().trim());
  if (!user) return null;
  const expected = Buffer.from(user.password);
  const provided = Buffer.from(password);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }
  return user;
}

/** HMAC-signed session token: base64url(payload).base64url(signature). */
export function createSessionToken(user: DemoUser, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const session: SessionUser = {
    username: user.username,
    name: user.name,
    rank: user.rank,
    role: user.role,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  return `${payload}.${sign(payload, getSecret())}`;
}

export function verifySessionToken(
  token: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000)
): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload, getSecret());
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser;
    if (typeof session.exp !== 'number' || session.exp < nowSeconds) return null;
    return session;
  } catch {
    return null;
  }
}

/** Extracts the session from a request's Cookie header (for API routes). */
export function sessionFromRequest(request: Request): SessionUser | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return verifySessionToken(match?.slice(SESSION_COOKIE.length + 1));
}

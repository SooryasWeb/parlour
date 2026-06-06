import { createHmac, timingSafeEqual } from 'node:crypto';

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  tenantId: string;
  tenantName: string;
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }
  return 'sooryas-local-development-session-secret';
}

function sign(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function createSessionCookieValue(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return `session-${payload}.${sign(payload)}`;
}

export function verifySessionCookie(value?: string | null): SessionUser | null {
  if (!value?.startsWith('session-')) return null;
  const [payload, signature] = value.slice('session-'.length).split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser & { exp?: number };
  if (!parsed.exp || parsed.exp <= Date.now()) return null;
  delete parsed.exp;
  return parsed;
}

export function sessionCookieHeader(value: string) {
  const secure = process.env.VERCEL === '1' || process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  return `session_token=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure}`;
}

export function clearSessionCookieHeader() {
  return 'session_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
}

import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { adminCookieName, issueSessionValue, isValidSession } from './session';

/**
 * Password gate for the admin panel (Node runtime only).
 *
 * A single shared admin password (env var, never committed) is exchanged
 * for an HMAC-signed session cookie; verification is constant-time.
 * Swap for Supabase Auth (users.role = 'admin') later without touching the
 * pages — everything funnels through requireAdmin().
 */
export async function login(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const matches = a.length === b.length && timingSafeEqual(a, b);
  if (!matches) return false;

  const store = await cookies();
  store.set(adminCookieName(), await issueSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(adminCookieName());
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(adminCookieName())?.value);
}

/** Throws when the visitor isn't admin — callers redirect to /login. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('UNAUTHORIZED');
  }
}

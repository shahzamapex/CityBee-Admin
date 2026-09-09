import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { adminCookieName, issueSessionValue, isValidSession } from './session';

const COOKIE_NAME = adminCookieName();

/**
 * Session payload: JWT + profile, HMAC-signed in a cookie (HttpOnly).
 * Login authenticates against Supabase Auth (email + password) and
 * requires users.role = 'admin' — non-admin accounts are rejected.
 *
 * The stored JWT is reused for authenticated backend API calls
 * (POST /businesses, /businesses/bulk …).
 */
export interface AdminSession {
  userId: string;
  email: string;
  name: string;
  jwt: string;
  issuedAt: number;
}

function signPayload(payload: string): string {
  const crypto = require('crypto') as typeof import('crypto');
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? 'insecure-dev-secret';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function asyncSign(payload: string): Promise<string> {
  // Session cookie helpers are edge-compatible; signing uses the Node
  // crypto module available in server actions.
  return signPayload(payload);
}

export async function loginWithSupabase(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, error: 'Auth is not configured.' };

  // 1. Authenticate with Supabase Auth (GoTrue).
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const auth = (await res.json()) as {
    access_token?: string;
    user?: { id?: string; email?: string };
    error?: string;
    error_description?: string;
    msg?: string;
  };

  if (!res.ok || !auth.access_token || !auth.user?.id) {
    return { ok: false, error: auth.error_description ?? auth.msg ?? 'Invalid email or password.' };
  }

  // 2. Role check — only role = 'admin' may enter.
  const { getAdminClient } = await import('./supabase');
  const { data: profile } = await getAdminClient()
    .from('users')
    .select('id, role, name, email')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return { ok: false, error: 'This account does not have admin access.' };
  }

  // 3. Issue signed session cookie (12h).
  const session: AdminSession = {
    userId: auth.user.id,
    email: profile.email ?? auth.user.email ?? email,
    name: profile.name ?? 'Admin',
    jwt: auth.access_token,
    issuedAt: Math.floor(Date.now() / 1000),
  };
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const signature = await asyncSign(payload);

  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return { ok: true };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dot = raw.indexOf('.');
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);

  const expected = signPayload(payload);
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;
    // 12-hour expiry.
    if (Date.now() / 1000 - session.issuedAt > 12 * 60 * 60) return null;
    return session;
  } catch {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

// ── Legacy shared-password login (kept for migration; supersedes soon) ──
export async function login(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const matches = a.length === b.length && timingSafeEqual(a, b);
  if (!matches) return false;
  const store = await cookies();
  store.set(COOKIE_NAME, (await issueSessionValue()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function legacyIsAdmin(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value || value.includes('.')) return false; // legacy sessions have no dot
  return isValidSession(value);
}

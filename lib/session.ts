/**
 * Session cookie helpers that work in the Edge Runtime (middleware) and
 * Node (server components) — Web Crypto API only, no Node 'crypto'.
 *
 * Password verification (constant-time compare) stays in lib/auth.ts,
 * which is Node-only (route handlers / server components).
 */

const COOKIE_NAME = 'cb_admin';

function secret(): string {
  return process.env.ADMIN_PASSWORD ?? 'insecure-dev-secret';
}

async function hmac(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function adminCookieName(): string {
  return COOKIE_NAME;
}

/** Issues the signed session cookie value (12h expiry, checked server-side). */
export async function issueSessionValue(): Promise<string> {
  const payload = `issued:${Math.floor(Date.now() / 1000)}`;
  return `${payload}.${await hmac(payload)}`;
}

/** Constant-time string compare via Web Crypto (timing-safe). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode('citybee-compare'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const [sa, sb] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ]);
  const va = new Uint8Array(sa);
  const vb = new Uint8Array(sb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/** Verifies a cookie value's signature and 12h freshness. */
export async function isValidSession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const dotIndex = value.indexOf('.');
  if (dotIndex < 0) return false;
  const payload = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  if (!(await safeEqual(signature, await hmac(payload)))) return false;

  // 12-hour expiry.
  const issued = Number(payload.split(':')[1] ?? 0);
  return issued > 0 && Date.now() / 1000 - issued < 12 * 60 * 60;
}

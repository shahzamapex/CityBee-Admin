import { NextResponse } from 'next/server';
import { adminCookieName, isValidSession } from '@/lib/session';

/**
 * Edge middleware: everything public stays public (/, /api/*).
 * Only /admin/* requires a session — except /admin/login itself.
 *
 * Two cookie formats:
 *  • legacy: `issued:<epoch>.<hmac>`  → isValidSession()
 *  • v2:     `base64url(session).<hmac-sha256(payload, secret)>` (Supabase
 *    JWT session from email/password login) → v2 check below.
 *
 * Signature verification only (payload contents validated server-side in
 * requireAdmin(); the cookie is HttpOnly + signed so it can't be forged).
 */
async function isValidV2(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);

  // Re-compute HMAC with Web Crypto (edge-safe) using the same secret
  // derivation as lib/auth.ts (Node crypto there — same sha256-hmac).
  try {
      const secret =
        process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? 'insecure-dev-secret';
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const hex = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (hex.length !== signature.length) return false;
      let diff = 0;
      for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
      return diff === 0;
  } catch {
    return false;
  }
}

export async function middleware(request: Request) {
  const { pathname } = new URL(request.url);

  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
  if (!isAdminArea || pathname === '/admin/login') {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminCookieName()}=`));
  const value = match ? decodeURIComponent(match.slice(adminCookieName().length + 1)) : undefined;

  if (!value) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // v2 (payload.signature, contains a dot & base64url payload) or legacy.
  const isV2 = value.includes('.') && !value.startsWith('issued:');
  const valid = isV2 ? await isValidV2(value) : await isValidSession(value);

  if (!valid) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import { adminCookieName, isValidSession } from '@/lib/session';

/**
 * Edge middleware: everything public stays public (/, /submit, /api/*).
 * Only /admin/* requires a session — except /admin/login itself.
 * Without a session, admin pages redirect to /admin/login (no sidebar
 * is ever rendered for unauthenticated visitors).
 */
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

  if (!(await isValidSession(value))) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import { adminCookieName, isValidSession } from '@/lib/session';

/**
 * Edge middleware: protects every route except /login and static assets.
 * Runs before any server component touches the service-role client.
 */
export async function middleware(request: Request) {
  const { pathname } = new URL(request.url);
  // Login page and auth API routes must stay reachable pre-session.
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login')) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminCookieName()}=`));
  const value = match ? decodeURIComponent(match.slice(adminCookieName().length + 1)) : undefined;

  if (!(await isValidSession(value))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

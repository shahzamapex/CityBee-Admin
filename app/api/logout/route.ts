import { logout } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  await logout();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}

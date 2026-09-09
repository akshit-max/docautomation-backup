import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Session Authentication (UI & APIs) ─────────────────────────
  const isPublicRoute = 
    pathname === '/login' || 
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static');

  const session = request.cookies.get('mwu_session')?.value;

  if (!isPublicRoute && !session) {
    if (!pathname.startsWith('/api/')) {
      // Unauthenticated UI request -> redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // For API requests without a session, we let them fall through 
    // to the x-api-secret check below for server-to-server auth.
  }

  // ── 2. Existing API Protection ────────────────────────────────────
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow preview and export endpoints to be accessed directly (e.g. opened in a new tab or downloaded)
  // And allow auth routes
  if (
    pathname.includes('/preview') ||
    pathname.includes('/export') ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // Same-origin browser requests (authenticated by session logic above if it reached here, or allowed by origin)
  const origin  = request.headers.get('origin')  || '';
  const referer = request.headers.get('referer') || '';
  const host    = request.headers.get('host')    || '';

  const isSameOrigin =
    (origin  && (origin.includes(host)  || origin.includes('localhost'))) ||
    (referer && (referer.includes(host) || referer.includes('localhost')));

  if (isSameOrigin) {
    return NextResponse.next();
  }

  // Cross-origin / server-to-server requests
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret) {
    return new NextResponse(
      JSON.stringify({ error: 'Server configuration error: missing API secret' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const apiSecret = request.headers.get('x-api-secret');
  if (apiSecret !== expectedSecret) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

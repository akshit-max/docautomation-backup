import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // ── Same-origin browser requests ────────────────────────────────────────
  // Requests from the browser to the same Next.js server carry an Origin
  // or Referer header matching the server host. These are always allowed
  // without the shared secret — the browser has no way to know it and
  // the secret should never be sent to the client.
  const origin  = request.headers.get('origin')  || '';
  const referer = request.headers.get('referer') || '';
  const host    = request.headers.get('host')    || '';

  const isSameOrigin =
    (origin  && (origin.includes(host)  || origin.includes('localhost'))) ||
    (referer && (referer.includes(host) || referer.includes('localhost')));

  if (isSameOrigin) {
    return NextResponse.next();
  }

  // ── Cross-origin / server-to-server requests ────────────────────────────
  // These must supply x-api-secret (e.g. cron jobs, integrations).
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret) {
    // Secret not configured: block external requests to prevent accidental open access
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
  matcher: '/api/:path*',
};

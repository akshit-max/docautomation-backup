import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * GET /api/auth/me
 *
 * Returns { authenticated: true } when a valid mwu_session cookie is present.
 * This is used by the login page to redirect already-authenticated users away.
 *
 * Security note: This does NOT validate the session token against Firestore —
 * that level of validation is reserved for the proxy middleware that guards
 * all protected routes. This endpoint only performs the same optimistic cookie
 * check that the proxy does, so the login page can make a round-trip-free
 * redirect decision.
 */
export async function GET(request: NextRequest) {
  const session = request.cookies.get('mwu_session')?.value;
  if (session && session.trim().length > 0) {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false }, { status: 401 });
}

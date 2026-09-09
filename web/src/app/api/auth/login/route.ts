import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { timingSafeEqual, pbkdf2Sync } from 'crypto';

// ── Hardcoded default (used ONLY before the first password change) ──────────
// After the first change-password call, credentials live in Firestore only.
const DEFAULT_EMAIL    = 'admin@makewithus.in';
const DEFAULT_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'mwu@2026';

/**
 * Verifies a password against the PBKDF2-SHA512 hash format produced by
 * the change-password route: "pbkdf2:sha512:<iterations>:<salt_hex>:<hash_hex>"
 */
function verifyPbkdf2Hash(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
    const [, , iterationsStr, salt, expectedHex] = parts;
    const iterations = parseInt(iterationsStr, 10);
    if (!iterations || iterations < 1) return false;

    const derived  = pbkdf2Sync(password, salt, iterations, 64, 'sha512');
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Constant-time string comparison for plaintext fallback.
 * Prevents timing attacks even on the default credential path.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const suppliedEmail    = email.trim().toLowerCase();
    const suppliedPassword = password as string;

    // ── 1. Try Firestore credentials first ──────────────────────────────────
    let authenticated = false;
    try {
      const credSnap = await adminDb.collection('config').doc('credentials').get();
      if (credSnap.exists) {
        const creds = credSnap.data()!;
        const storedEmail = (creds.email || '').trim().toLowerCase();
        const passwordHash = creds.passwordHash as string | undefined;

        if (suppliedEmail === storedEmail && passwordHash) {
          authenticated = verifyPbkdf2Hash(suppliedPassword, passwordHash);
        }
        // If Firestore doc exists but passwordHash is missing, fall through to default
      }
    } catch (firestoreErr) {
      // Firestore unavailable — fall through to default credential
      console.warn('[login] Firestore credentials unavailable, using default:', firestoreErr);
    }

    // ── 2. Fall back to hardcoded default if Firestore didn't authenticate ──
    if (!authenticated) {
      if (
        suppliedEmail === DEFAULT_EMAIL.toLowerCase() &&
        safeCompare(suppliedPassword, DEFAULT_PASSWORD)
      ) {
        authenticated = true;
      }
    }

    if (!authenticated) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // ── 3. Issue session cookie ─────────────────────────────────────────────
    // Session value 'default_user' maps to the existing Firestore user/documents —
    // preserving all existing data accessibility.
    const response = NextResponse.json({ success: true, userId: 'default_user' });
    response.cookies.set({
      name: 'mwu_session',
      value: 'default_user',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (error) {
    console.error('[login] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

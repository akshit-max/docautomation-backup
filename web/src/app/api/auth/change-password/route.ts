import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { randomBytes, timingSafeEqual, pbkdf2Sync } from 'crypto';

/**
 * Derives a key from a password using PBKDF2 with SHA-512.
 * Returns a colon-delimited string: "pbkdf2:sha512:<iterations>:<salt_hex>:<hash_hex>"
 */
function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  const iterations = 310_000; // NIST SP 800-132 minimum for PBKDF2-SHA512
  const derivedKey = pbkdf2Sync(password, salt, iterations, 64, 'sha512');
  return `pbkdf2:sha512:${iterations}:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored hash string produced by hashPassword().
 * Uses timingSafeEqual to prevent timing attacks.
 */
function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
    const [, , iterationsStr, salt, expectedHex] = parts;
    const iterations = parseInt(iterationsStr, 10);
    if (!iterations || iterations < 1) return false;

    const derived = pbkdf2Sync(password, salt, iterations, 64, 'sha512');
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Fetches the current credentials from Firestore config/credentials.
 * Falls back to the hardcoded default if the document doesn't exist.
 */
async function getCurrentCredentials(): Promise<{ email: string; passwordHash: string | null; plaintextFallback: string | null }> {
  const docRef = adminDb.collection('config').doc('credentials');
  const snap = await docRef.get();
  if (snap.exists) {
    const data = snap.data()!;
    return {
      email: data.email || 'admin@makewithus.in',
      passwordHash: data.passwordHash || null,
      plaintextFallback: null, // Once Firestore credentials exist, no plaintext fallback
    };
  }
  // Default credential (never stored in DB — only used before first password change)
  return {
    email: 'admin@makewithus.in',
    passwordHash: null,
    plaintextFallback: process.env.DEFAULT_ADMIN_PASSWORD || 'mwu@2026',
  };
}

/** Validates whether a supplied password matches current credentials. */
async function validateCurrentPassword(supplied: string): Promise<boolean> {
  const creds = await getCurrentCredentials();
  if (creds.passwordHash) {
    return verifyPassword(supplied, creds.passwordHash);
  }
  // Fallback: compare against plaintext default using timingSafeEqual
  const a = Buffer.from(supplied);
  const b = Buffer.from(creds.plaintextFallback || '');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Minimum password requirements
const MIN_LENGTH = 8;
const PASSWORD_RULES = `Password must be at least ${MIN_LENGTH} characters.`;

function validateNewPassword(pw: string): string | null {
  if (!pw || pw.trim().length === 0) return 'New password cannot be empty.';
  if (pw.length < MIN_LENGTH) return PASSWORD_RULES;
  return null;
}

/**
 * POST /api/auth/change-password
 *
 * Body: { currentPassword: string, newPassword: string, confirmPassword: string }
 *
 * Security:
 *  - Requires active mwu_session cookie (enforced by proxy middleware)
 *  - Current password verified against stored hash (or plaintext default)
 *  - New password hashed with PBKDF2-SHA512 before storage
 *  - Hash never returned to client
 */
export async function POST(request: NextRequest) {
  try {
    // Session is already validated by the proxy for all non-public routes.
    // Double-check it here for defence in depth.
    const session = request.cookies.get('mwu_session')?.value;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // --- Input validation ---
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation do not match.' }, { status: 400 });
    }

    const validationError = validateNewPassword(newPassword);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must differ from the current password.' }, { status: 400 });
    }

    // --- Verify current password ---
    const isValid = await validateCurrentPassword(currentPassword);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    // --- Hash and store the new password ---
    const newHash = hashPassword(newPassword);
    const credRef = adminDb.collection('config').doc('credentials');
    await credRef.set({
      email: 'admin@makewithus.in',
      passwordHash: newHash,
      updatedAt: new Date().toISOString(),
    }, { merge: false }); // Overwrite completely — no partial merges on credentials

    return NextResponse.json({ success: true, message: 'Password changed successfully.' });
  } catch (error: any) {
    console.error('[change-password] Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

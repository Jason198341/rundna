import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

const SESSION_COOKIE = 'rundna_session';
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-dev-secret';

function sign(value: string): string {
  const sig = createHmac('sha256', SECRET).update(value).digest('hex').slice(0, 16);
  return `${value}.${sig}`;
}

function verify(signed: string): string | null {
  const dot = signed.lastIndexOf('.');
  if (dot === -1) return null;
  const value = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(value).digest('hex').slice(0, 16);
  if (sig !== expected) return null;
  return value;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  // Support both signed (new) and unsigned (legacy) cookies
  const verified = verify(raw);
  if (verified) return verified;
  // Legacy unsigned cookie — re-sign on next login
  if (raw.length === 36 && !raw.includes('.')) return raw;
  return null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

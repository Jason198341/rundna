import { cookies } from 'next/headers';

const SESSION_COOKIE = 'rundna_session';

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  // Simple session: store user ID in httpOnly cookie
  // For production: sign with a secret (JWT or iron-session)
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

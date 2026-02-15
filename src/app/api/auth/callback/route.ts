import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/strava';
import { createServerClient } from '@/lib/supabase';
import { setSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    const tokenData = await exchangeCode(code);
    const { athlete, access_token, refresh_token, expires_at } = tokenData;

    const db = createServerClient();

    // Upsert user
    const { data: user, error } = await db.from('users').upsert({
      strava_id: athlete.id,
      name: `${athlete.firstname} ${athlete.lastname}`.trim(),
      avatar_url: athlete.profile_medium || athlete.profile,
      city: athlete.city,
      country: athlete.country,
      strava_access_token: access_token,
      strava_refresh_token: refresh_token,
      strava_token_expires_at: expires_at,
      last_login_at: new Date().toISOString(),
    }, {
      onConflict: 'strava_id',
    }).select('id').single();

    if (error || !user) {
      console.error('User upsert failed:', error);
      return NextResponse.redirect(new URL('/?error=db_error', request.url));
    }

    await setSession(user.id);

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
}

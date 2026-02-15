import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchUserRunData } from '@/lib/strava';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await fetchUserRunData(userId);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=300' }, // 5min cache per user
    });
  } catch (err) {
    console.error('Strava data fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

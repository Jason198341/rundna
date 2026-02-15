import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchActivityStreams } from '@/lib/strava-extended';

export async function GET(request: Request) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get('activityId');
  if (!activityId) {
    return NextResponse.json({ error: 'activityId required' }, { status: 400 });
  }

  try {
    const data = await fetchActivityStreams(userId, parseInt(activityId, 10));
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=3600' }, // 1hr cache (streams don't change)
    });
  } catch (err) {
    console.error('Streams fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}

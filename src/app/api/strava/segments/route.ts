import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { exploreSegments, fetchSegmentEffortsForActivity, fetchSegmentDetail } from '@/lib/strava-extended';

export async function GET(request: Request) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'explore') {
      const swLat = parseFloat(searchParams.get('swLat') || '0');
      const swLng = parseFloat(searchParams.get('swLng') || '0');
      const neLat = parseFloat(searchParams.get('neLat') || '0');
      const neLng = parseFloat(searchParams.get('neLng') || '0');
      const data = await exploreSegments(userId, { swLat, swLng, neLat, neLng });
      return NextResponse.json(data);
    }

    if (action === 'efforts') {
      const activityId = parseInt(searchParams.get('activityId') || '0', 10);
      if (!activityId) return NextResponse.json({ error: 'activityId required' }, { status: 400 });
      const data = await fetchSegmentEffortsForActivity(userId, activityId);
      return NextResponse.json(data);
    }

    if (action === 'detail') {
      const segmentId = parseInt(searchParams.get('segmentId') || '0', 10);
      if (!segmentId) return NextResponse.json({ error: 'segmentId required' }, { status: 400 });
      const data = await fetchSegmentDetail(userId, segmentId);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'action required: explore|efforts|detail' }, { status: 400 });
  } catch (err) {
    console.error('Segments error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

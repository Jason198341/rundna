import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchAthleteGear, fetchActivitiesWithGear, enrichShoesWithActivities } from '@/lib/strava-extended';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch gear and activities in parallel (async-parallel best practice)
    const [shoes, activities] = await Promise.all([
      fetchAthleteGear(userId),
      fetchActivitiesWithGear(userId, 200),
    ]);

    const enriched = enrichShoesWithActivities(shoes, activities);
    return NextResponse.json(enriched, {
      headers: { 'Cache-Control': 'private, max-age=600' }, // 10min cache
    });
  } catch (err) {
    console.error('Gear fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch gear' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchUserRunData } from '@/lib/strava';
import { computeIntelligence } from '@/lib/strava-analytics';

export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const runData = await fetchUserRunData(userId);
    const intelligence = computeIntelligence(runData.runs, runData.stats.totalDistanceKm);
    return NextResponse.json({ ...intelligence, prs: runData.prs }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (err) {
    console.error('Intelligence fetch error:', err);
    return NextResponse.json({ error: 'Failed to compute' }, { status: 500 });
  }
}

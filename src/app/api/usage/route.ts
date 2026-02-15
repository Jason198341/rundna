import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUsage, DAILY_LIMITS, type Feature } from '@/lib/usage';

export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feature = request.nextUrl.searchParams.get('feature') as Feature | null;
  if (!feature || !DAILY_LIMITS[feature]) {
    return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
  }

  const usage = await getUsage(userId, feature);
  return NextResponse.json(usage);
}

// Extended Strava API — Streams, Segments, Gear
// Level 1-5 features: Run Film, Segment Sniper, Shoe Graveyard, Digital Twin

import { createServerClient } from './supabase';

// ── Token helper (reuse from strava.ts) ──
async function getAccessToken(userId: string): Promise<string> {
  const db = createServerClient();
  const { data: user } = await db
    .from('users')
    .select('strava_access_token, strava_refresh_token, strava_token_expires_at')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  if (user.strava_token_expires_at && Date.now() / 1000 < user.strava_token_expires_at - 60) {
    return user.strava_access_token;
  }

  // Refresh token
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: user.strava_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();

  await db.from('users').update({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_token_expires_at: data.expires_at,
  }).eq('id', userId);

  return data.access_token;
}

async function stravaGet(token: string, path: string): Promise<any> {
  const res = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Strava API ${path}: ${res.status}`);
  return res.json();
}

// ================================================================
// 1. Activity Streams (Run Film, Ghost, Digital Twin)
// ================================================================

export interface StreamPoint {
  lat: number;
  lng: number;
  altitude: number;
  time: number;        // seconds from start
  distance: number;    // meters from start
  heartrate?: number;
  cadence?: number;
  velocity: number;    // m/s
}

export interface ActivityStream {
  activityId: number;
  points: StreamPoint[];
  totalDistance: number;
  totalTime: number;
  elevationGain: number;
  startDate: string;
  name: string;
}

export async function fetchActivityStreams(
  userId: string,
  activityId: number,
): Promise<ActivityStream> {
  const token = await getAccessToken(userId);

  // Fetch activity details + streams in parallel (async-parallel best practice)
  const [activity, streams] = await Promise.all([
    stravaGet(token, `/activities/${activityId}`),
    stravaGet(token, `/activities/${activityId}/streams?keys=latlng,altitude,time,distance,heartrate,cadence,velocity_smooth&key_type=time`),
  ]);

  // Parse streams into points
  const streamMap = new Map<string, any[]>();
  for (const s of streams) {
    streamMap.set(s.type, s.data);
  }

  const latlng = streamMap.get('latlng') || [];
  const altitude = streamMap.get('altitude') || [];
  const time = streamMap.get('time') || [];
  const distance = streamMap.get('distance') || [];
  const heartrate = streamMap.get('heartrate');
  const cadence = streamMap.get('cadence');
  const velocity = streamMap.get('velocity_smooth') || [];

  const points: StreamPoint[] = latlng.map((_: any, i: number) => ({
    lat: latlng[i]?.[0] ?? 0,
    lng: latlng[i]?.[1] ?? 0,
    altitude: altitude[i] ?? 0,
    time: time[i] ?? 0,
    distance: distance[i] ?? 0,
    heartrate: heartrate?.[i],
    cadence: cadence?.[i],
    velocity: velocity[i] ?? 0,
  }));

  return {
    activityId,
    points,
    totalDistance: activity.distance,
    totalTime: activity.moving_time,
    elevationGain: activity.total_elevation_gain ?? 0,
    startDate: activity.start_date_local,
    name: activity.name,
  };
}

// ================================================================
// 2. Segments (Segment Sniper)
// ================================================================

export interface SegmentEffort {
  id: number;
  segmentId: number;
  segmentName: string;
  distance: number;
  elapsedTime: number;
  movingTime: number;
  startDate: string;
  prRank: number | null; // 1 = PR, 2 = 2nd best, etc.
  komRank: number | null;
  athleteCount: number;
  averageWatts?: number;
  averageHeartrate?: number;
}

export interface SegmentDetail {
  id: number;
  name: string;
  distance: number;
  averageGrade: number;
  maximumGrade: number;
  elevation: { high: number; low: number };
  climbCategory: number;
  city: string;
  state: string;
  country: string;
  athleteCount: number;
  effortCount: number;
  starCount: number;
  startLatlng: [number, number];
  endLatlng: [number, number];
  athleteSegmentStats?: {
    prElapsedTime: number;
    prDate: string;
    effortCount: number;
  };
}

export interface ExploreSegment {
  id: number;
  name: string;
  distance: number;
  averageGrade: number;
  climbCategory: number;
  startLatlng: [number, number];
  endLatlng: [number, number];
  athleteCount: number;
}

export async function fetchSegmentEffortsForActivity(
  userId: string,
  activityId: number,
): Promise<SegmentEffort[]> {
  const token = await getAccessToken(userId);
  const activity = await stravaGet(token, `/activities/${activityId}?include_all_efforts=true`);

  if (!activity.segment_efforts) return [];

  return activity.segment_efforts.map((e: any) => ({
    id: e.id,
    segmentId: e.segment.id,
    segmentName: e.segment.name,
    distance: e.distance,
    elapsedTime: e.elapsed_time,
    movingTime: e.moving_time,
    startDate: e.start_date_local,
    prRank: e.pr_rank,
    komRank: e.kom_rank,
    athleteCount: e.segment.athlete_count ?? 0,
    averageWatts: e.average_watts,
    averageHeartrate: e.average_heartrate,
  }));
}

export async function exploreSegments(
  userId: string,
  bounds: { swLat: number; swLng: number; neLat: number; neLng: number },
): Promise<ExploreSegment[]> {
  const token = await getAccessToken(userId);
  const { swLat, swLng, neLat, neLng } = bounds;
  const data = await stravaGet(
    token,
    `/segments/explore?bounds=${swLat},${swLng},${neLat},${neLng}&activity_type=running`,
  );

  return (data.segments || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    distance: s.distance,
    averageGrade: s.avg_grade,
    climbCategory: s.climb_category,
    startLatlng: s.start_latlng,
    endLatlng: s.end_latlng,
    athleteCount: s.athlete_count ?? 0,
  }));
}

export async function fetchSegmentDetail(
  userId: string,
  segmentId: number,
): Promise<SegmentDetail> {
  const token = await getAccessToken(userId);
  const s = await stravaGet(token, `/segments/${segmentId}`);

  return {
    id: s.id,
    name: s.name,
    distance: s.distance,
    averageGrade: s.average_grade,
    maximumGrade: s.maximum_grade,
    elevation: { high: s.elevation_high, low: s.elevation_low },
    climbCategory: s.climb_category,
    city: s.city || '',
    state: s.state || '',
    country: s.country || '',
    athleteCount: s.athlete_count,
    effortCount: s.effort_count,
    starCount: s.star_count,
    startLatlng: s.start_latlng,
    endLatlng: s.end_latlng,
    athleteSegmentStats: s.athlete_segment_stats ? {
      prElapsedTime: s.athlete_segment_stats.pr_elapsed_time,
      prDate: s.athlete_segment_stats.pr_date,
      effortCount: s.athlete_segment_stats.effort_count,
    } : undefined,
  };
}

// ================================================================
// 3. Gear (Shoe Graveyard)
// ================================================================

export interface ShoeData {
  id: string;
  name: string;
  brand: string;
  model: string;
  distance: number;     // meters
  distanceKm: number;
  primary: boolean;
  retired: boolean;
  healthPercent: number; // 0-100 (100 = new, 0 = dead)
  // Computed from activities
  runCount: number;
  avgPace: number;       // secs/km
  firstUsed: string;
  lastUsed: string;
  totalTime: number;     // seconds
}

export async function fetchAthleteGear(userId: string): Promise<ShoeData[]> {
  const token = await getAccessToken(userId);
  const athlete = await stravaGet(token, '/athlete');

  if (!athlete.shoes || athlete.shoes.length === 0) return [];

  // Fetch detailed gear info for each shoe in parallel
  const shoeDetails = await Promise.all(
    athlete.shoes.map((shoe: any) =>
      stravaGet(token, `/gear/${shoe.id}`).catch(() => shoe)
    ),
  );

  const MAX_SHOE_KM = 800; // Standard shoe lifespan

  return shoeDetails.map((s: any) => {
    const distKm = (s.distance || 0) / 1000;
    const healthPercent = Math.max(0, Math.round((1 - distKm / MAX_SHOE_KM) * 100));

    return {
      id: s.id,
      name: s.name || s.description || 'Unknown',
      brand: s.brand_name || '',
      model: s.model_name || '',
      distance: s.distance || 0,
      distanceKm: Math.round(distKm * 10) / 10,
      primary: s.primary || false,
      retired: s.retired || distKm >= MAX_SHOE_KM,
      healthPercent,
      runCount: 0,    // Will be computed from activities
      avgPace: 0,
      firstUsed: '',
      lastUsed: '',
      totalTime: 0,
    };
  });
}

// ================================================================
// 4. Activity details with gear (enriches shoe data)
// ================================================================

export interface ActivityGearInfo {
  activityId: number;
  gearId: string | null;
  distance: number;
  movingTime: number;
  startDate: string;
  averageSpeed: number;
}

export async function fetchActivitiesWithGear(
  userId: string,
  limit = 200,
): Promise<ActivityGearInfo[]> {
  const token = await getAccessToken(userId);
  const activities = await stravaGet(
    token,
    `/athlete/activities?per_page=${limit}&page=1`,
  );

  return activities
    .filter((a: any) => a.type === 'Run' || a.sport_type === 'Run')
    .map((a: any) => ({
      activityId: a.id,
      gearId: a.gear_id,
      distance: a.distance,
      movingTime: a.moving_time,
      startDate: a.start_date_local,
      averageSpeed: a.average_speed,
    }));
}

// Enrich shoes with activity data
export function enrichShoesWithActivities(
  shoes: ShoeData[],
  activities: ActivityGearInfo[],
): ShoeData[] {
  const shoeMap = new Map(shoes.map(s => [s.id, { ...s }]));

  for (const act of activities) {
    if (!act.gearId) continue;
    const shoe = shoeMap.get(act.gearId);
    if (!shoe) continue;

    shoe.runCount++;
    shoe.totalTime += act.movingTime;
    const km = act.distance / 1000;
    if (km > 0) {
      shoe.avgPace = shoe.totalTime / (shoe.distanceKm || 1);
    }
    if (!shoe.firstUsed || act.startDate < shoe.firstUsed) shoe.firstUsed = act.startDate;
    if (!shoe.lastUsed || act.startDate > shoe.lastUsed) shoe.lastUsed = act.startDate;
  }

  // Recalculate avg pace
  for (const shoe of shoeMap.values()) {
    if (shoe.distanceKm > 0 && shoe.totalTime > 0) {
      shoe.avgPace = Math.round(shoe.totalTime / shoe.distanceKm);
    }
  }

  return Array.from(shoeMap.values());
}

// ================================================================
// 5. DNA Battle — compare two athletes
// ================================================================

export interface BattleResult {
  athlete1: { name: string; scores: Record<string, number>; type: string };
  athlete2: { name: string; scores: Record<string, number>; type: string };
  advantages: { metric: string; winner: 1 | 2; diff: number }[];
  predictedWinner: { '5K': 1 | 2; '10K': 1 | 2; half: 1 | 2; full: 1 | 2 };
}

// ================================================================
// 6. Digital Twin — race simulation
// ================================================================

export interface RaceSimulation {
  targetDistance: number;    // meters
  targetName: string;
  predictedTime: number;    // seconds
  splits: {
    km: number;
    pace: number;           // secs/km
    projectedHR: number;
    elevationDelta: number;
    cumulativeTime: number;
  }[];
  scenarios: {
    strategy: 'conservative' | 'even' | 'aggressive';
    totalTime: number;
    splits: number[];       // pace per km
    riskLevel: string;
  }[];
}

export function simulateRace(
  targetDistanceM: number,
  recentBestPace: number,     // secs/km from recent best
  avgHR: number,
  elevationProfile?: number[], // elevation per km
): RaceSimulation {
  const targetKm = Math.ceil(targetDistanceM / 1000);

  const basePace = recentBestPace * Math.pow(targetDistanceM / 5000, 0.06); // Riegel adjustment
  const splits: RaceSimulation['splits'] = [];
  let cumTime = 0;

  for (let km = 1; km <= targetKm; km++) {
    // Natural fatigue: pace slows ~1-2% per 5km after halfway
    const fatigueMultiplier = km > targetKm / 2
      ? 1 + ((km - targetKm / 2) / targetKm) * 0.04
      : 1;
    const elevDelta = elevationProfile?.[km - 1] ?? 0;
    // Hill adjustment: +12s/km per 1% grade
    const hillAdjust = elevDelta > 0 ? (elevDelta / 10) * 12 : (elevDelta / 10) * -6;
    const pace = Math.round(basePace * fatigueMultiplier + hillAdjust);
    cumTime += pace;

    const hrBase = avgHR || 155;
    const projectedHR = Math.round(hrBase + (km / targetKm) * 15);

    splits.push({ km, pace, projectedHR, elevationDelta: elevDelta, cumulativeTime: cumTime });
  }

  // Generate scenarios
  const scenarios: RaceSimulation['scenarios'] = [
    {
      strategy: 'conservative',
      totalTime: Math.round(cumTime * 1.03),
      splits: splits.map((s, i) => i < targetKm / 2
        ? Math.round(s.pace * 1.05)
        : Math.round(s.pace * 1.01)),
      riskLevel: 'Low — strong finish likely',
    },
    {
      strategy: 'even',
      totalTime: cumTime,
      splits: splits.map(s => s.pace),
      riskLevel: 'Medium — requires discipline',
    },
    {
      strategy: 'aggressive',
      totalTime: Math.round(cumTime * 0.97),
      splits: splits.map((s, i) => i < targetKm / 2
        ? Math.round(s.pace * 0.95)
        : Math.round(s.pace * 1.02)),
      riskLevel: 'High — wall risk after 30K',
    },
  ];

  return {
    targetDistance: targetDistanceM,
    targetName: targetDistanceM <= 5000 ? '5K'
      : targetDistanceM <= 10000 ? '10K'
      : targetDistanceM <= 21100 ? 'Half Marathon'
      : 'Marathon',
    predictedTime: cumTime,
    splits,
    scenarios,
  };
}

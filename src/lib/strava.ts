// Strava API — multi-user OAuth + data fetching

import { createServerClient } from './supabase';

// ── Types ──

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;       // avatar URL
  profile_medium: string;
  city: string | null;
  country: string | null;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: StravaAthlete;
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain?: number;
  start_latlng?: [number, number] | null;
}

export interface RunEntry {
  id: number;           // Strava activity ID
  date: string;
  dateFull: string;
  distance: string;
  distanceKm: number;
  time: string;
  timeSeconds: number;
  pace: string;
  paceSecsPerKm: number;
  location: string;
  locationFlag: string;
  name: string;
  heartrate: number | null;
  elevation: number | null;
}

export interface RunStats {
  totalRuns: number;
  totalDistance: string;
  totalDistanceKm: number;
  avgPace: string;
}

export interface PersonalRecord {
  label: string;
  time: string;
  pace: string;
  date: string;
  distanceKm: number;
}

export interface MonthlyBar {
  month: string;
  km: number;
  count: number;
}

export interface EnrichedRunData {
  runs: RunEntry[];
  stats: RunStats;
  prs: PersonalRecord[];
  monthlyVolume: MonthlyBar[];
  locations: string[];
}

// ── OAuth URLs ──

export function getStravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    response_type: 'code',
    scope: 'read,activity:read_all',
    approval_prompt: 'auto',
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

// ── Token Exchange ──

export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json();
}

// ── Token Refresh ──

async function refreshAccessToken(userId: string): Promise<string> {
  const db = createServerClient();
  const { data: user } = await db
    .from('users')
    .select('strava_refresh_token, strava_token_expires_at')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  // Check if current token is still valid
  if (user.strava_token_expires_at && Date.now() / 1000 < user.strava_token_expires_at - 60) {
    const { data: fresh } = await db.from('users').select('strava_access_token').eq('id', userId).single();
    if (!fresh) throw new Error('User token not found');
    return fresh.strava_access_token;
  }

  // Refresh
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

  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  const data = await res.json();

  await db.from('users').update({
    strava_access_token: data.access_token,
    strava_refresh_token: data.refresh_token,
    strava_token_expires_at: data.expires_at,
  }).eq('id', userId);

  return data.access_token;
}

// ── Fetch All Activities ──

async function fetchAllActivities(token: string): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let page = 1;
  const MAX_PAGES = 50; // Safety limit: 50 pages × 200 = 10,000 activities
  while (page <= MAX_PAGES) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
    const batch: StravaActivity[] = await res.json();
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    if (batch.length < 200) break;
    page++;
  }
  return all;
}

// ── Helpers ──

function formatPace(mps: number): string {
  if (mps <= 0) return '-';
  const spk = 1000 / mps;
  const m = Math.floor(spk / 60);
  const s = Math.round(spk % 60);
  return `${m}'${s.toString().padStart(2, '0')}"/km`;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonthShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ── Location Matching (reverse geocode from lat/lng) ──

const LOCATIONS = [
  { name: 'Seoul', flag: '🇰🇷', lat: 37.5, lng: 127.0, r: 0.5 },
  { name: 'Busan', flag: '🇰🇷', lat: 35.2, lng: 129.1, r: 0.3 },
  { name: 'Hyderabad', flag: '🇮🇳', lat: 17.4, lng: 78.4, r: 0.3 },
  { name: 'Chennai', flag: '🇮🇳', lat: 13.1, lng: 80.3, r: 0.3 },
  { name: 'London', flag: '🇬🇧', lat: 51.5, lng: -0.1, r: 0.3 },
  { name: 'Lisbon', flag: '🇵🇹', lat: 38.7, lng: -9.1, r: 0.5 },
  { name: 'Porto', flag: '🇵🇹', lat: 41.1, lng: -8.6, r: 0.3 },
  { name: 'Jakarta', flag: '🇮🇩', lat: -6.2, lng: 106.8, r: 0.3 },
  { name: 'Yantai', flag: '🇨🇳', lat: 37.6, lng: 121.2, r: 0.3 },
  { name: 'New York', flag: '🇺🇸', lat: 40.7, lng: -74.0, r: 0.3 },
  { name: 'Tokyo', flag: '🇯🇵', lat: 35.7, lng: 139.7, r: 0.5 },
  { name: 'Berlin', flag: '🇩🇪', lat: 52.5, lng: 13.4, r: 0.3 },
  { name: 'Paris', flag: '🇫🇷', lat: 48.9, lng: 2.3, r: 0.3 },
  { name: 'Sydney', flag: '🇦🇺', lat: -33.9, lng: 151.2, r: 0.3 },
];

function matchLocation(latlng?: [number, number] | null): { name: string; flag: string } {
  if (!latlng || latlng.length < 2) return { name: 'Unknown', flag: '📍' };
  const [lat, lng] = latlng;
  for (const loc of LOCATIONS) {
    if (Math.abs(lat - loc.lat) <= loc.r && Math.abs(lng - loc.lng) <= loc.r) {
      return { name: loc.name, flag: loc.flag };
    }
  }
  return { name: 'Other', flag: '📍' };
}

// ── PR Thresholds ──

const PR_THRESHOLDS = [
  { label: '5K', min: 4800, max: 5500 },
  { label: '10K', min: 9500, max: 11000 },
  { label: 'Half', min: 20000, max: 22000 },
  { label: 'Full', min: 40000, max: 44000 },
];

// ── Main: fetch enriched data for a user ──

export async function fetchUserRunData(userId: string): Promise<EnrichedRunData> {
  const token = await refreshAccessToken(userId);
  const activities = await fetchAllActivities(token);
  const runs = activities.filter(a => a.type === 'Run' || a.sport_type === 'Run');

  if (runs.length === 0) {
    return {
      runs: [],
      stats: { totalRuns: 0, totalDistance: '0', totalDistanceKm: 0, avgPace: '-' },
      prs: [],
      monthlyVolume: [],
      locations: [],
    };
  }

  runs.sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime());

  const entries: RunEntry[] = runs.map(r => {
    const loc = matchLocation(r.start_latlng);
    const km = r.distance / 1000;
    const paceSpk = km > 0 ? r.moving_time / km : 0;
    return {
      id: r.id,
      date: formatDate(r.start_date_local),
      dateFull: r.start_date_local,
      distance: `${km.toFixed(2)} km`,
      distanceKm: km,
      time: formatDuration(r.moving_time),
      timeSeconds: r.moving_time,
      pace: formatPace(r.average_speed),
      paceSecsPerKm: paceSpk,
      location: loc.name,
      locationFlag: loc.flag,
      name: r.name,
      heartrate: r.average_heartrate ?? null,
      elevation: r.total_elevation_gain ?? null,
    };
  });

  const totalDistM = runs.reduce((s, r) => s + r.distance, 0);
  const totalTimeS = runs.reduce((s, r) => s + r.moving_time, 0);
  const totalDistKm = totalDistM / 1000;

  const stats: RunStats = {
    totalRuns: runs.length,
    totalDistance: totalDistKm.toFixed(1),
    totalDistanceKm: totalDistKm,
    avgPace: formatPace(totalDistM / totalTimeS),
  };

  const prs: PersonalRecord[] = [];
  for (const t of PR_THRESHOLDS) {
    const matching = runs.filter(r => r.distance >= t.min && r.distance <= t.max);
    if (matching.length === 0) continue;
    const best = matching.reduce((a, b) => a.moving_time < b.moving_time ? a : b);
    prs.push({
      label: t.label,
      time: formatDuration(best.moving_time),
      pace: formatPace(best.average_speed),
      date: formatDate(best.start_date_local),
      distanceKm: best.distance / 1000,
    });
  }

  const volMap = new Map<string, { km: number; count: number }>();
  for (const r of runs) {
    const key = formatMonthShort(r.start_date_local);
    const v = volMap.get(key) || { km: 0, count: 0 };
    v.km += r.distance / 1000;
    v.count++;
    volMap.set(key, v);
  }
  const monthlyVolume: MonthlyBar[] = Array.from(volMap.entries())
    .map(([month, v]) => ({ month, km: Math.round(v.km * 10) / 10, count: v.count }))
    .reverse();

  const locationSet = new Set<string>();
  for (const e of entries) {
    if (e.location !== 'Unknown') locationSet.add(e.location);
  }

  return { runs: entries, stats, prs, monthlyVolume, locations: Array.from(locationSet).sort() };
}

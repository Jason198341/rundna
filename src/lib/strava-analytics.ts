// Running Intelligence — analytics computation engine
// Pure functions, no UI. All computations from RunEntry[] data.

import type { RunEntry } from './strava';

// ============================================================
// Types
// ============================================================

export interface TrainingLoad {
  acute: number;
  chronic: number;
  ratio: number;
  zone: 'detraining' | 'recovery' | 'optimal' | 'overreaching' | 'danger';
  zoneLabel: string;
  zoneColor: string;
}

export interface RacePrediction {
  label: string;
  time: string;
  pace: string;
}

export interface PaceTrendPoint {
  week: string;
  weekKey: string;
  avgPace: number;   // secs per km (4-week rolling avg)
  rawPace: number;   // secs per km (that week only)
  distance: number;
}

export interface ConditionAnalysis {
  bestDay: { day: string; pace: string; count: number };
  bestHour: { hour: string; pace: string; count: number };
  sweetSpotDistance: { range: string; pace: string; count: number };
  dayOfWeekData: { day: string; avgPace: number; count: number }[];
  hourData: { hour: number; avgPace: number; count: number }[];
}

export interface RunningPersonality {
  type: string;
  description: string;
  percentile: number; // estimated "Top X%" based on score profile
  scores: {
    consistency: number;
    speed: number;
    endurance: number;
    variety: number;
    volume: number;
  };
}

export interface YearComparison {
  year: number;
  months: { month: number; cumulativeKm: number }[];
  totalKm: number;
  totalRuns: number;
}

export interface DistributionBucket {
  label: string;
  count: number;
  percentage: number;
  totalKm: number;
}

export interface RecoveryAnalysis {
  avgRestDays: number;
  avgRestAfterHard: number;
  longestStreak: number;
  longestRest: number;
}

export interface RouteFamiliarity {
  location: string;
  flag: string;
  count: number;
  firstRun: string;
  lastRun: string;
  bestPace: string;
  latestPace: string;
  improvement: string;
  improvedSecs: number;
}

export interface MilestoneCountdown {
  label: string;
  target: number;
  current: number;
  remaining: number;
  progress: number;
  estimatedDate: string;
}

export interface TodayScenario {
  label: string;
  type: 'best' | 'good' | 'caution' | 'avoid';
  activity: string;
  distance: string;
  pace: string;
  duration: string;
  projectedRatio: number;
  projectedZone: string;
  projectedColor: string;
  reason: string;
  loadDelta: number;
}

export interface TodaysPlan {
  currentRatio: number;
  currentZone: string;
  currentColor: string;
  daysSinceLastRun: number;
  lastRunSummary: string;
  safeMaxKm: number;
  dangerKm: number;
  easyPace: string;
  tempoPace: string;
  scenarios: TodayScenario[];
  recommended: TodayScenario;
  headline: string;
  advice: string[];
}

export interface IntelligenceData {
  totalRuns: number;
  totalKm: number;
  dateRange: string;
  trainingLoad: TrainingLoad;
  todaysPlan: TodaysPlan;
  racePredictions: RacePrediction[];
  paceTrend: PaceTrendPoint[];
  paceImprovement: string;
  conditions: ConditionAnalysis;
  personality: RunningPersonality;
  yearComparison: YearComparison[];
  distribution: DistributionBucket[];
  recovery: RecoveryAnalysis;
  routes: RouteFamiliarity[];
  milestones: MilestoneCountdown[];
  coachAdvice: string[];
}

// ============================================================
// Helpers
// ============================================================

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtPace(secsPerKm: number): string {
  if (!secsPerKm || !isFinite(secsPerKm) || secsPerKm <= 0) return '-';
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}'${secs.toString().padStart(2, '0')}"/km`;
}

function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ============================================================
// 1. Training Load (ACWR)
// ============================================================

function computeTrainingLoad(runs: RunEntry[]): TrainingLoad {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Daily load = km × minutes (proxy for training stress)
  const dayLoad = new Map<string, number>();
  for (const r of runs) {
    const key = toDateKey(new Date(r.dateFull));
    const load = r.distanceKm * (r.timeSeconds / 60);
    dayLoad.set(key, (dayLoad.get(key) || 0) + load);
  }

  // Acute: days 0-6 (this week)
  let acute = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    acute += dayLoad.get(toDateKey(d)) || 0;
  }

  // Chronic: days 7-34 (weeks 2-5, UNCOUPLED — excludes acute window)
  // Uncoupled ACWR avoids inflating ratio when returning from inactivity
  let chronic = 0;
  for (let i = 7; i < 35; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    chronic += dayLoad.get(toDateKey(d)) || 0;
  }

  const chronicWeekly = chronic / 4; // 4 weeks (days 7-34)
  const ratio = chronicWeekly > 0 ? acute / chronicWeekly : 0;

  // Low volume guard: if absolute load is low, ratio-based zones are misleading
  // 200 ≈ ~15km/week at casual pace — below this, ACWR injury risk isn't meaningful
  const lowVolume = acute < 200 && chronicWeekly < 200;

  let zone: TrainingLoad['zone'];
  let zoneLabel: string;
  let zoneColor: string;
  if (lowVolume && ratio >= 1.3) {
    // Absolute volume is too low for meaningful injury risk
    zone = 'recovery'; zoneLabel = 'Low Volume'; zoneColor = '#3b82f6';
  } else if (ratio < 0.8) { zone = 'detraining'; zoneLabel = 'Detraining'; zoneColor = '#9ca3af'; }
  else if (ratio < 1.0) { zone = 'recovery'; zoneLabel = 'Recovery'; zoneColor = '#3b82f6'; }
  else if (ratio < 1.3) { zone = 'optimal'; zoneLabel = 'Optimal'; zoneColor = '#22c55e'; }
  else if (ratio < 1.5) { zone = 'overreaching'; zoneLabel = 'Overreaching'; zoneColor = '#f59e0b'; }
  else { zone = 'danger'; zoneLabel = 'Injury Risk'; zoneColor = '#ef4444'; }

  return { acute, chronic: chronicWeekly, ratio: Math.round(ratio * 100) / 100, zone, zoneLabel, zoneColor };
}

// ============================================================
// 2. Race Predictor (Riegel formula)
// ============================================================

function computeRacePredictions(runs: RunEntry[]): RacePrediction[] {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recent = runs.filter(r => new Date(r.dateFull) >= threeMonthsAgo && r.distanceKm >= 3);
  if (recent.length === 0) return [];

  // Best = lowest secs/km (fastest pace) among runs ≥ 3km
  const best = recent.reduce((a, b) =>
    (a.timeSeconds / a.distanceKm) < (b.timeSeconds / b.distanceKm) ? a : b,
  );

  const refDistM = best.distanceKm * 1000;
  const refTime = best.timeSeconds;

  return [
    { label: '5K', distance: 5000 },
    { label: '10K', distance: 10000 },
    { label: 'Half', distance: 21097.5 },
    { label: 'Full', distance: 42195 },
  ].map(t => {
    const predicted = refTime * Math.pow(t.distance / refDistM, 1.06);
    const paceSpk = predicted / (t.distance / 1000);
    return { label: t.label, time: fmtDuration(Math.round(predicted)), pace: fmtPace(paceSpk) };
  });
}

// ============================================================
// 3. Pace Trend (4-week rolling average)
// ============================================================

function computePaceTrend(runs: RunEntry[]): { points: PaceTrendPoint[]; improvement: string } {
  const eligible = runs.filter(r => r.distanceKm >= 2);
  if (eligible.length < 4) return { points: [], improvement: '-' };

  const weekMap = new Map<string, { totalSec: number; totalKm: number }>();
  for (const r of eligible) {
    const monday = getMonday(new Date(r.dateFull));
    const key = toDateKey(monday);
    const existing = weekMap.get(key) || { totalSec: 0, totalKm: 0 };
    existing.totalSec += r.timeSeconds;
    existing.totalKm += r.distanceKm;
    weekMap.set(key, existing);
  }

  const sorted = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({
      weekKey: key,
      weekLabel: new Date(key + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgPace: v.totalSec / v.totalKm,
      totalSec: v.totalSec,
      totalKm: v.totalKm,
    }));

  const recent = sorted.slice(-52);

  // 4-week rolling average (distance-weighted)
  const points: PaceTrendPoint[] = recent.map((point, i, arr) => {
    const start = Math.max(0, i - 3);
    const window = arr.slice(start, i + 1);
    const tSec = window.reduce((s, p) => s + p.totalSec, 0);
    const tKm = window.reduce((s, p) => s + p.totalKm, 0);
    return {
      week: point.weekLabel,
      weekKey: point.weekKey,
      avgPace: tKm > 0 ? tSec / tKm : point.avgPace,
      rawPace: point.avgPace,
      distance: point.totalKm,
    };
  });

  // Improvement: compare first quarter avg vs last quarter avg
  const q = Math.max(1, Math.floor(points.length / 4));
  const firstQ = points.slice(0, q);
  const lastQ = points.slice(-q);
  const firstAvg = firstQ.reduce((s, p) => s + p.avgPace, 0) / firstQ.length;
  const lastAvg = lastQ.reduce((s, p) => s + p.avgPace, 0) / lastQ.length;
  const diff = Math.round(firstAvg - lastAvg);
  const improvement = diff > 0
    ? `${diff}s/km faster over the period`
    : diff < 0 ? `${Math.abs(diff)}s/km slower over the period` : 'Pace unchanged';

  return { points, improvement };
}

// ============================================================
// 4. Best Conditions
// ============================================================

function computeConditions(runs: RunEntry[]): ConditionAnalysis {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayAcc: Record<number, { totalPace: number; count: number }> = {};
  const hourAcc: Record<number, { totalPace: number; count: number }> = {};
  const distAcc: Record<string, { totalPace: number; count: number }> = {};

  for (const r of runs) {
    if (r.distanceKm < 1) continue;
    const d = new Date(r.dateFull);
    const pace = r.timeSeconds / r.distanceKm;

    const dow = d.getDay();
    if (!dayAcc[dow]) dayAcc[dow] = { totalPace: 0, count: 0 };
    dayAcc[dow].totalPace += pace;
    dayAcc[dow].count += 1;

    const hour = d.getHours();
    if (!hourAcc[hour]) hourAcc[hour] = { totalPace: 0, count: 0 };
    hourAcc[hour].totalPace += pace;
    hourAcc[hour].count += 1;

    const bucket = r.distanceKm < 5 ? '< 5 km'
      : r.distanceKm < 10 ? '5–10 km'
      : r.distanceKm < 15 ? '10–15 km'
      : r.distanceKm < 20 ? '15–20 km' : '20+ km';
    if (!distAcc[bucket]) distAcc[bucket] = { totalPace: 0, count: 0 };
    distAcc[bucket].totalPace += pace;
    distAcc[bucket].count += 1;
  }

  const dayEntries = Object.entries(dayAcc).map(([d, v]) => ({
    day: days[Number(d)], avgPace: v.totalPace / v.count, count: v.count,
  }));
  const hourEntries = Object.entries(hourAcc)
    .filter(([, v]) => v.count >= 2)
    .map(([h, v]) => ({ hour: Number(h), avgPace: v.totalPace / v.count, count: v.count }));
  const distEntries = Object.entries(distAcc)
    .filter(([, v]) => v.count >= 2)
    .map(([range, v]) => ({ range, avgPace: v.totalPace / v.count, count: v.count }));

  const bestDay = dayEntries.length > 0
    ? dayEntries.reduce((a, b) => a.avgPace < b.avgPace ? a : b)
    : { day: '-', avgPace: 0, count: 0 };
  const bestHour = hourEntries.length > 0
    ? hourEntries.reduce((a, b) => a.avgPace < b.avgPace ? a : b)
    : { hour: 0, avgPace: 0, count: 0 };
  const sweetSpot = distEntries.length > 0
    ? distEntries.reduce((a, b) => a.avgPace < b.avgPace ? a : b)
    : { range: '-', avgPace: 0, count: 0 };

  return {
    bestDay: { day: bestDay.day, pace: fmtPace(bestDay.avgPace), count: bestDay.count },
    bestHour: { hour: `${bestHour.hour}:00`, pace: fmtPace(bestHour.avgPace), count: bestHour.count },
    sweetSpotDistance: { range: sweetSpot.range, pace: fmtPace(sweetSpot.avgPace), count: sweetSpot.count },
    dayOfWeekData: dayEntries,
    hourData: hourEntries.sort((a, b) => a.hour - b.hour),
  };
}

// ============================================================
// 5. Running Personality
// ============================================================

/** Classify personality type & percentile from raw trait scores (reusable). */
export function classifyPersonality(scores: RunningPersonality['scores']): Omit<RunningPersonality, 'scores'> {
  const entries = Object.entries(scores) as [keyof typeof scores, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [top, second] = entries;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const avg = total / 5;

  type PersonalityDef = { type: string; description: string };
  let result: PersonalityDef;

  const min = Math.min(...Object.values(scores));
  const max = Math.max(...Object.values(scores));
  if (max - min <= 1 && avg >= 3) {
    result = { type: 'The Complete Runner', description: 'Balanced across every dimension — speed, endurance, consistency, variety, and volume. A true all-rounder.' };
  } else if (max - min <= 1 && avg < 3) {
    result = { type: 'The Rising Runner', description: 'Your foundation is solid and balanced. With more training, all dimensions will grow together.' };
  }
  else if (top[0] === 'speed' && second[0] === 'endurance' || top[0] === 'endurance' && second[0] === 'speed') {
    result = { type: 'The Iron Racer', description: 'Fast AND long — a rare and dangerous combo. You eat race PRs for breakfast.' };
  } else if (top[0] === 'consistency' && second[0] === 'volume' || top[0] === 'volume' && second[0] === 'consistency') {
    result = { type: 'The Mileage Machine', description: 'Relentless weekly volume with clock-like consistency. You build fitness through sheer dedication.' };
  } else if (top[0] === 'speed' && second[0] === 'consistency' || top[0] === 'consistency' && second[0] === 'speed') {
    result = { type: 'The Steady Sprinter', description: 'Consistently fast. Your discipline keeps your speed sharp week after week.' };
  } else if (top[0] === 'endurance' && second[0] === 'volume' || top[0] === 'volume' && second[0] === 'endurance') {
    result = { type: 'The Ultra Mind', description: 'Born for distance. High mileage and long runs are your comfort zone.' };
  } else if (top[0] === 'variety' && second[0] === 'speed' || top[0] === 'speed' && second[0] === 'variety') {
    result = { type: 'The Trail Blazer', description: 'Fast on different terrain. You seek new routes and conquer them at pace.' };
  } else if (top[0] === 'variety' && second[0] === 'endurance' || top[0] === 'endurance' && second[0] === 'variety') {
    result = { type: 'The Wandering Wolf', description: 'You explore far and wide on long runs. Every new path is an adventure.' };
  } else if (top[0] === 'consistency' && second[0] === 'endurance' || top[0] === 'endurance' && second[0] === 'consistency') {
    result = { type: 'The Marathon Monk', description: 'Disciplined long-distance training, week in, week out. Built for marathon glory.' };
  } else if (top[0] === 'variety' && second[0] === 'volume' || top[0] === 'volume' && second[0] === 'variety') {
    result = { type: 'The Global Runner', description: 'Massive mileage across diverse routes and locations. The world is your running track.' };
  } else if (top[0] === 'variety' && second[0] === 'consistency' || top[0] === 'consistency' && second[0] === 'variety') {
    result = { type: 'The Routine Explorer', description: 'Consistently adventurous — you never run the same route twice, but you never miss a week.' };
  }
  else {
    const singles: Record<string, PersonalityDef> = {
      consistency: { type: 'The Consistent Cruiser', description: 'You show up week after week. Consistency is the #1 predictor of running success.' },
      speed: { type: 'The Speed Demon', description: 'Your pace is impressive. You push the limits every time you lace up.' },
      endurance: { type: 'The Distance Seeker', description: 'You love going long. Marathons and beyond are your playground.' },
      variety: { type: 'The Explorer', description: 'Different cities, different routes, different distances. Every run is an adventure.' },
      volume: { type: 'The High Mileage Runner', description: 'You stack up serious weekly kilometers. Your legs are built for the long haul.' },
    };
    result = singles[top[0]];
  }

  const percentile = Math.max(1, Math.min(99, Math.round(100 - 100 / (1 + Math.exp((total - 12) / 3)))));

  return { ...result, percentile };
}

function computePersonality(runs: RunEntry[]): RunningPersonality {
  if (runs.length === 0) {
    return { type: 'The Beginner', description: 'Start running to discover your style!', percentile: 50, scores: { consistency: 1, speed: 1, endurance: 1, variety: 1, volume: 1 } };
  }

  const weeklyKm = new Map<string, number>();
  for (const r of runs) {
    const key = toDateKey(getMonday(new Date(r.dateFull)));
    weeklyKm.set(key, (weeklyKm.get(key) || 0) + r.distanceKm);
  }
  const weeklyVals = Array.from(weeklyKm.values());
  const mean = weeklyVals.reduce((a, b) => a + b, 0) / weeklyVals.length;
  const std = Math.sqrt(weeklyVals.reduce((s, v) => s + (v - mean) ** 2, 0) / weeklyVals.length);
  const cv = mean > 0 ? std / mean : 1;
  const consistency = Math.max(1, Math.min(5, Math.round(5 - cv * 2.5)));

  const avgPace = runs.reduce((s, r) => s + r.timeSeconds / r.distanceKm, 0) / runs.length;
  const speed = avgPace < 270 ? 5 : avgPace < 330 ? 4 : avgPace < 390 ? 3 : avgPace < 450 ? 2 : 1;

  const longPct = runs.filter(r => r.distanceKm >= 10).length / runs.length;
  const endurance = longPct > 0.4 ? 5 : longPct > 0.3 ? 4 : longPct > 0.2 ? 3 : longPct > 0.1 ? 2 : 1;

  const locs = new Set(runs.map(r => r.location).filter(l => l !== 'Unknown' && l !== 'Other'));
  const distRange = Math.max(...runs.map(r => r.distanceKm)) - Math.min(...runs.map(r => r.distanceKm));
  const variety = Math.max(1, Math.min(5, Math.round(locs.size / 2 + distRange / 15)));

  const weeklyAvg = mean;
  const volume = weeklyAvg > 50 ? 5 : weeklyAvg > 35 ? 4 : weeklyAvg > 20 ? 3 : weeklyAvg > 10 ? 2 : 1;

  const scores = { consistency, speed, endurance, variety, volume };

  return { ...classifyPersonality(scores), scores };
}

// ============================================================
// 6. Year-over-Year Comparison
// ============================================================

function computeYearComparison(runs: RunEntry[]): YearComparison[] {
  const yearMap = new Map<number, Map<number, number>>();
  const yearRunCount = new Map<number, number>();

  for (const r of runs) {
    const d = new Date(r.dateFull);
    const year = d.getFullYear();
    const month = d.getMonth();
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const mMap = yearMap.get(year)!;
    mMap.set(month, (mMap.get(month) || 0) + r.distanceKm);
    yearRunCount.set(year, (yearRunCount.get(year) || 0) + 1);
  }

  return Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, monthMap]) => {
      let cumulative = 0;
      const months: { month: number; cumulativeKm: number }[] = [];
      for (let m = 0; m < 12; m++) {
        cumulative += monthMap.get(m) || 0;
        months.push({ month: m, cumulativeKm: Math.round(cumulative * 10) / 10 });
      }
      return { year, months, totalKm: Math.round(cumulative * 10) / 10, totalRuns: yearRunCount.get(year) || 0 };
    });
}

// ============================================================
// 7. Distance Distribution
// ============================================================

function computeDistribution(runs: RunEntry[]): DistributionBucket[] {
  const buckets = [
    { label: '< 5 km', min: 0, max: 5 },
    { label: '5–10 km', min: 5, max: 10 },
    { label: '10–20 km', min: 10, max: 20 },
    { label: '20–30 km', min: 20, max: 30 },
    { label: '30+ km', min: 30, max: Infinity },
  ];
  const total = runs.length;
  return buckets.map(b => {
    const matching = runs.filter(r => r.distanceKm >= b.min && r.distanceKm < b.max);
    return {
      label: b.label,
      count: matching.length,
      percentage: total > 0 ? Math.round((matching.length / total) * 100) : 0,
      totalKm: Math.round(matching.reduce((s, r) => s + r.distanceKm, 0) * 10) / 10,
    };
  });
}

// ============================================================
// 8. Recovery Analysis
// ============================================================

function computeRecovery(runs: RunEntry[]): RecoveryAnalysis {
  if (runs.length < 2) return { avgRestDays: 0, avgRestAfterHard: 0, longestStreak: 0, longestRest: 0 };

  const sorted = [...runs].sort((a, b) => new Date(a.dateFull).getTime() - new Date(b.dateFull).getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((new Date(sorted[i].dateFull).getTime() - new Date(sorted[i - 1].dateFull).getTime()) / 86400000);
  }

  const avgRestDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const longestRest = Math.max(...gaps);

  // Rest after hard runs (≥10km or pace <5:30/km)
  const hardGaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const isHard = sorted[i].distanceKm >= 10 || sorted[i].timeSeconds / sorted[i].distanceKm < 330;
    if (isHard) {
      hardGaps.push((new Date(sorted[i + 1].dateFull).getTime() - new Date(sorted[i].dateFull).getTime()) / 86400000);
    }
  }
  const avgRestAfterHard = hardGaps.length > 0 ? hardGaps.reduce((a, b) => a + b, 0) / hardGaps.length : 0;

  // Longest consecutive days with a run
  const runDates = new Set(sorted.map(r => toDateKey(new Date(r.dateFull))));
  let maxStreak = 0, currentStreak = 0;
  const first = new Date(sorted[0].dateFull);
  const last = new Date(sorted[sorted.length - 1].dateFull);
  const d = new Date(first);
  d.setHours(0, 0, 0, 0);
  while (d <= last) {
    if (runDates.has(toDateKey(d))) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    d.setDate(d.getDate() + 1);
  }

  return {
    avgRestDays: Math.round(avgRestDays * 10) / 10,
    avgRestAfterHard: Math.round(avgRestAfterHard * 10) / 10,
    longestStreak: maxStreak,
    longestRest: Math.round(longestRest),
  };
}

// ============================================================
// 9. Route Familiarity
// ============================================================

function computeRoutes(runs: RunEntry[]): RouteFamiliarity[] {
  const locMap = new Map<string, RunEntry[]>();
  for (const r of runs) {
    if (r.location === 'Unknown' || r.location === 'Other') continue;
    if (!locMap.has(r.location)) locMap.set(r.location, []);
    locMap.get(r.location)!.push(r);
  }

  return Array.from(locMap.entries())
    .filter(([, locRuns]) => locRuns.length >= 2)
    .map(([location, locRuns]) => {
      const sorted = [...locRuns].sort((a, b) => new Date(a.dateFull).getTime() - new Date(b.dateFull).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const best = sorted.reduce((a, b) =>
        (a.timeSeconds / a.distanceKm) < (b.timeSeconds / b.distanceKm) ? a : b,
      );

      const firstPace = first.timeSeconds / first.distanceKm;
      const lastPace = last.timeSeconds / last.distanceKm;
      const diff = Math.round(firstPace - lastPace);

      return {
        location,
        flag: locRuns[0].locationFlag,
        count: locRuns.length,
        firstRun: first.date,
        lastRun: last.date,
        bestPace: fmtPace(best.timeSeconds / best.distanceKm),
        latestPace: fmtPace(lastPace),
        improvement: diff > 0 ? `${diff}s faster` : diff < 0 ? `${Math.abs(diff)}s slower` : 'Same',
        improvedSecs: diff,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ============================================================
// 10. Milestone Countdown
// ============================================================

function computeMilestones(runs: RunEntry[], totalKm: number): MilestoneCountdown[] {
  // Avg weekly km for projection
  const weeklyKm = new Map<string, number>();
  for (const r of runs) {
    const key = toDateKey(getMonday(new Date(r.dateFull)));
    weeklyKm.set(key, (weeklyKm.get(key) || 0) + r.distanceKm);
  }
  const weeklyVals = Array.from(weeklyKm.values());
  const avgWeeklyKm = weeklyVals.length > 0 ? weeklyVals.reduce((a, b) => a + b, 0) / weeklyVals.length : 0;
  const avgWeeklyRuns = runs.length / (weeklyVals.length || 1);

  const targets = [
    { label: '1,500 km', target: 1500, useKm: true },
    { label: '2,000 km', target: 2000, useKm: true },
    { label: '2,500 km', target: 2500, useKm: true },
    { label: '200 Runs', target: 200, useKm: false },
    { label: '250 Runs', target: 250, useKm: false },
    { label: '300 Runs', target: 300, useKm: false },
  ];

  const milestones: MilestoneCountdown[] = [];
  for (const t of targets) {
    const current = t.useKm ? totalKm : runs.length;
    if (current >= t.target) continue;
    const remaining = t.target - current;
    const rate = t.useKm ? avgWeeklyKm : avgWeeklyRuns;
    const weeksNeeded = rate > 0 ? remaining / rate : Infinity;
    const est = new Date();
    est.setDate(est.getDate() + weeksNeeded * 7);

    milestones.push({
      label: t.label,
      target: t.target,
      current: Math.round(current * 10) / 10,
      remaining: Math.round(remaining * 10) / 10,
      progress: Math.round((current / t.target) * 100),
      estimatedDate: weeksNeeded < 520 ? est.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
    });
  }
  return milestones;
}

// ============================================================
// 11. AI Coach (rule-based recommendation)
// ============================================================

function generateCoachAdvice(runs: RunEntry[], load: TrainingLoad): string[] {
  if (runs.length === 0) return ['Start your running journey! Even a short 2-3km jog is a great beginning.'];

  const today = new Date();
  const lines: string[] = [];

  const lastRun = runs[0]; // sorted newest-first
  const daysSince = Math.round((today.getTime() - new Date(lastRun.dateFull).getTime()) / 86400000);

  // Last 7 days
  const last7 = runs.filter(r => (today.getTime() - new Date(r.dateFull).getTime()) / 86400000 <= 7);
  const weekKm = last7.reduce((s, r) => s + r.distanceKm, 0);

  // Training load
  if (load.zone === 'danger') {
    lines.push('Your training load is very high. Prioritize rest or a very easy 3km jog to prevent injury.');
  } else if (load.zone === 'overreaching') {
    lines.push('Training load is elevated. An easy recovery run or cross-training day would be smart.');
  } else if (load.zone === 'detraining') {
    lines.push('You\'ve been resting a while. Time to ramp up gradually — start with a comfortable 5km.');
  } else if (load.zone === 'optimal') {
    lines.push('Training load is in the sweet spot. Keep this rhythm going!');
  }

  // Days since last run
  if (daysSince === 0) {
    lines.push('You already ran today. Rest well tonight — recovery is where gains happen.');
  } else if (daysSince === 1) {
    const wasHard = lastRun.distanceKm >= 10 || lastRun.timeSeconds / lastRun.distanceKm < 330;
    if (wasHard) {
      lines.push(`Yesterday's ${lastRun.distanceKm.toFixed(1)}km was solid work. Easy recovery run (3-5km) or rest today.`);
    } else {
      lines.push('Good to go for a moderate run today.');
    }
  } else if (daysSince >= 4) {
    lines.push(`It's been ${daysSince} days since your last run. An easy 4-5km would be a great restart.`);
  }

  // Weekly pattern
  if (last7.length >= 5) {
    lines.push(`${last7.length} runs this week (${weekKm.toFixed(0)}km). High frequency — make sure to include easy days.`);
  }

  // Long run suggestion
  const hasLongRun = last7.some(r => r.distanceKm >= 10);
  if (!hasLongRun && last7.length >= 2 && load.zone !== 'danger') {
    lines.push('No long run this week yet. Consider a 10-15km long run at easy pace this weekend.');
  }

  // 10% rule
  const last14 = runs.filter(r => {
    const diff = (today.getTime() - new Date(r.dateFull).getTime()) / 86400000;
    return diff > 7 && diff <= 14;
  });
  const prevWeekKm = last14.reduce((s, r) => s + r.distanceKm, 0);
  if (prevWeekKm > 0 && weekKm > prevWeekKm * 1.2) {
    lines.push(`Weekly volume jumped ${Math.round(((weekKm / prevWeekKm) - 1) * 100)}% vs last week. The 10% rule suggests capping increases at 10%.`);
  }

  if (lines.length === 0) {
    lines.push('Training looks balanced. Keep up the great work!');
  }

  return lines;
}

// ============================================================
// 12. Today's Plan (Injury / Training Boundary)
// ============================================================

export function computeTodaysPlan(runs: RunEntry[]): TodaysPlan {
  const sorted = [...runs].sort((a, b) =>
    new Date(b.dateFull).getTime() - new Date(a.dateFull).getTime(),
  );
  const load = computeTrainingLoad(sorted);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Last run info
  const lastRun = sorted[0];
  const daysSinceLastRun = lastRun
    ? Math.round((today.getTime() - new Date(lastRun.dateFull).getTime()) / 86400000)
    : 999;
  const lastRunSummary = lastRun
    ? `${lastRun.distanceKm.toFixed(1)}km in ${fmtDuration(lastRun.timeSeconds)} (${fmtPace(lastRun.timeSeconds / lastRun.distanceKm)})`
    : 'No recent runs';

  // Pace estimation from recent 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recent = sorted.filter(r => new Date(r.dateFull) >= threeMonthsAgo && r.distanceKm >= 2);
  const paces = recent.map(r => r.timeSeconds / r.distanceKm).sort((a, b) => a - b);
  const easyPaceSpk = paces.length > 0 ? paces[Math.floor(paces.length * 0.6)] : 420;
  const tempoPaceSpk = paces.length > 0 ? paces[Math.floor(paces.length * 0.2)] : 330;

  // Safe/danger boundaries via ACWR projection
  // load formula: km × minutes = km × (km × pace / 60) = km² × pace / 60
  // maxLoad = chronic × threshold − acute → km = sqrt(maxLoad × 60 / pace)
  const maxSafeLoad = Math.max(0, load.chronic * 1.3 - load.acute);
  const maxDangerLoad = Math.max(0, load.chronic * 1.5 - load.acute);
  const safeMaxKm = easyPaceSpk > 0 ? Math.sqrt(maxSafeLoad * 60 / easyPaceSpk) : 0;
  const dangerKm = easyPaceSpk > 0 ? Math.sqrt(maxDangerLoad * 60 / easyPaceSpk) : 0;

  // Projection helpers
  const projectLoad = (km: number, paceSpk: number) => km * (km * paceSpk / 60);
  const projectRatio = (addLoad: number) =>
    load.chronic > 0 ? (load.acute + addLoad) / load.chronic : 0;
  const classifyRatio = (r: number): { zone: string; color: string } => {
    if (r < 0.8) return { zone: 'Detraining', color: '#9ca3af' };
    if (r < 1.0) return { zone: 'Recovery', color: '#3b82f6' };
    if (r < 1.3) return { zone: 'Optimal', color: '#22c55e' };
    if (r < 1.5) return { zone: 'Overreaching', color: '#f59e0b' };
    return { zone: 'Injury Risk', color: '#ef4444' };
  };

  // Scenario definitions
  const defs = [
    { label: 'Full Rest', activity: 'Rest Day', km: 0, pace: 0 },
    { label: 'Light Walk', activity: 'Walk 30min', km: 2.5, pace: 720 },
    { label: 'Easy 3km', activity: 'Easy Run', km: 3, pace: easyPaceSpk },
    { label: 'Easy 5km', activity: 'Easy Run', km: 5, pace: easyPaceSpk },
    { label: 'Easy 8km', activity: 'Easy Run', km: 8, pace: easyPaceSpk },
    { label: 'Tempo 5km', activity: 'Tempo Run', km: 5, pace: tempoPaceSpk },
    { label: 'Long 12km', activity: 'Long Run', km: 12, pace: easyPaceSpk + 30 },
  ];

  const scenarios: TodayScenario[] = defs.map(def => {
    const addLoad = def.km > 0 ? projectLoad(def.km, def.pace) : 0;
    const newRatio = def.km > 0 ? projectRatio(addLoad) : load.ratio;
    const cls = classifyRatio(newRatio);

    let type: TodayScenario['type'];
    if (def.km === 0) {
      type = load.zone === 'danger' || load.zone === 'overreaching' ? 'best'
        : load.zone === 'detraining' ? 'caution' : 'good';
    } else if (newRatio >= 1.5) {
      type = 'avoid';
    } else if (newRatio >= 1.3) {
      type = 'caution';
    } else if (newRatio >= 0.8) {
      type = 'best';
    } else {
      type = 'good';
    }

    const reasons: Record<TodayScenario['type'], string> = {
      best: 'Keeps you in the optimal training zone',
      good: 'Safe option that supports recovery',
      caution: 'Pushes into overreaching territory',
      avoid: 'High injury risk — not recommended',
    };
    const durSecs = def.km > 0 ? Math.round(def.km * def.pace) : 0;

    return {
      label: def.label,
      type,
      activity: def.activity,
      distance: def.km > 0 ? `${def.km} km` : '-',
      pace: def.pace > 0 ? fmtPace(def.pace) : '-',
      duration: def.km > 0 ? fmtDuration(durSecs) : '-',
      projectedRatio: Math.round(newRatio * 100) / 100,
      projectedZone: cls.zone,
      projectedColor: cls.color,
      reason: reasons[type],
      loadDelta: Math.round(addLoad),
    };
  });

  // Recommended: prefer 'best' type with highest training benefit
  const bestOnes = scenarios.filter(s => s.type === 'best');
  const recommended = bestOnes.length > 0
    ? bestOnes.reduce((a, b) => a.loadDelta > b.loadDelta ? a : b)
    : scenarios[0];

  // Headline
  let headline: string;
  if (load.zone === 'danger') {
    headline = 'Rest Day — Training Load Very High';
  } else if (load.zone === 'overreaching') {
    headline = daysSinceLastRun === 0
      ? 'Recovery or Rest — You Already Ran Today'
      : 'Light Activity Only — Load Is Elevated';
  } else if (load.zone === 'detraining') {
    headline = daysSinceLastRun >= 7
      ? 'Time to Get Moving — Start Easy'
      : 'Build Back Gradually';
  } else if (load.zone === 'optimal') {
    headline = daysSinceLastRun === 0
      ? 'Great Run Today — Rest Well Tonight'
      : `Ready for ${recommended.activity} — ${recommended.distance}`;
  } else {
    headline = `Recovery Zone — ${recommended.activity} Suggested`;
  }

  // Advice
  const advice: string[] = [];
  if (daysSinceLastRun === 0) {
    advice.push('You already ran today. Focus on recovery — hydration, stretching, and quality sleep.');
  } else if (daysSinceLastRun >= 3) {
    advice.push(`${daysSinceLastRun} days since your last run. Ease back in with a comfortable effort.`);
  }
  if (load.zone === 'optimal') {
    advice.push(`Training load is in the sweet spot (ACWR ${load.ratio.toFixed(2)}). Maintain this rhythm.`);
  } else if (load.zone === 'overreaching') {
    advice.push('Load is elevated. Prioritize easy effort or complete rest.');
  } else if (load.zone === 'danger') {
    advice.push('High injury risk. Rest and active recovery are your best options today.');
  } else if (load.zone === 'detraining') {
    advice.push('Fitness may be declining. A short easy run will help rebuild momentum.');
  }
  if (safeMaxKm > 0 && safeMaxKm < 30) {
    advice.push(`Safe max: ${safeMaxKm.toFixed(1)} km at easy pace (stays in optimal zone).`);
  }

  return {
    currentRatio: load.ratio,
    currentZone: load.zoneLabel,
    currentColor: load.zoneColor,
    daysSinceLastRun,
    lastRunSummary,
    safeMaxKm: Math.round(safeMaxKm * 10) / 10,
    dangerKm: Math.round(dangerKm * 10) / 10,
    easyPace: fmtPace(easyPaceSpk),
    tempoPace: fmtPace(tempoPaceSpk),
    scenarios,
    recommended,
    headline,
    advice,
  };
}

// ============================================================
// DNA Code: encode/decode for battle sharing
// ============================================================

const TRAIT_ORDER: (keyof RunningPersonality['scores'])[] = ['consistency', 'speed', 'endurance', 'variety', 'volume'];

/** Encode trait scores into a shareable DNA code: "RD-43524" */
export function encodeDNA(scores: RunningPersonality['scores']): string {
  const digits = TRAIT_ORDER.map(k => scores[k]).join('');
  return `RD-${digits}`;
}

/** Decode a DNA code back into scores + derived personality. Returns null if invalid. */
export function decodeDNA(code: string): (RunningPersonality & { code: string }) | null {
  const match = code.trim().toUpperCase().match(/^RD-(\d{5})$/);
  if (!match) return null;

  const digits = match[1].split('').map(Number);
  if (digits.some(d => d < 1 || d > 5)) return null;

  const scores: RunningPersonality['scores'] = {
    consistency: digits[0],
    speed: digits[1],
    endurance: digits[2],
    variety: digits[3],
    volume: digits[4],
  };

  return { ...classifyPersonality(scores), scores, code: `RD-${match[1]}` };
}

// ============================================================
// DNA Codex — all 3,125 possible codes grouped by personality
// ============================================================

export interface CodexEntry {
  code: string;
  scores: RunningPersonality['scores'];
  total: number;
}

export interface CodexGroup {
  type: string;
  description: string;
  entries: CodexEntry[];
  minPercentile: number;
  maxPercentile: number;
}

let _codexCache: CodexGroup[] | null = null;

/** Generate all 3,125 DNA codes grouped by personality type. Cached after first call. */
export function generateDNACodex(): CodexGroup[] {
  if (_codexCache) return _codexCache;

  const groupMap = new Map<string, { description: string; entries: CodexEntry[]; percentiles: number[] }>();

  for (let c = 1; c <= 5; c++) {
    for (let s = 1; s <= 5; s++) {
      for (let e = 1; e <= 5; e++) {
        for (let v = 1; v <= 5; v++) {
          for (let vol = 1; vol <= 5; vol++) {
            const scores = { consistency: c, speed: s, endurance: e, variety: v, volume: vol };
            const { type, description, percentile } = classifyPersonality(scores);
            const code = `RD-${c}${s}${e}${v}${vol}`;
            const total = c + s + e + v + vol;

            if (!groupMap.has(type)) {
              groupMap.set(type, { description, entries: [], percentiles: [] });
            }
            const g = groupMap.get(type)!;
            g.entries.push({ code, scores, total });
            g.percentiles.push(percentile);
          }
        }
      }
    }
  }

  _codexCache = Array.from(groupMap.entries())
    .map(([type, { description, entries, percentiles }]) => ({
      type,
      description,
      entries: entries.sort((a, b) => b.total - a.total),
      minPercentile: Math.min(...percentiles),
      maxPercentile: Math.max(...percentiles),
    }))
    .sort((a, b) => b.entries.length - a.entries.length);

  return _codexCache;
}

// ============================================================
// Main: compute all intelligence
// ============================================================

export function computeIntelligence(runs: RunEntry[], totalKm: number): IntelligenceData {
  const sorted = [...runs].sort((a, b) =>
    new Date(b.dateFull).getTime() - new Date(a.dateFull).getTime(),
  );

  const oldest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const newest = sorted.length > 0 ? sorted[0] : null;
  const dateRange = oldest && newest
    ? `${new Date(oldest.dateFull).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} — ${new Date(newest.dateFull).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : '-';

  const trainingLoad = computeTrainingLoad(sorted);
  const { points: paceTrend, improvement: paceImprovement } = computePaceTrend(sorted);

  return {
    totalRuns: sorted.length,
    totalKm,
    dateRange,
    trainingLoad,
    todaysPlan: computeTodaysPlan(sorted),
    racePredictions: computeRacePredictions(sorted),
    paceTrend,
    paceImprovement,
    conditions: computeConditions(sorted),
    personality: computePersonality(sorted),
    yearComparison: computeYearComparison(sorted),
    distribution: computeDistribution(sorted),
    recovery: computeRecovery(sorted),
    routes: computeRoutes(sorted),
    milestones: computeMilestones(sorted, totalKm),
    coachAdvice: generateCoachAdvice(sorted, trainingLoad),
  };
}

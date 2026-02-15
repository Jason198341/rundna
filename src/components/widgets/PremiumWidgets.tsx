'use client';

import { useMemo } from 'react';
import type { IntelligenceData } from '@/lib/strava-analytics';
import type { EnrichedRunData } from '@/lib/strava';
import { t, type Lang } from '@/lib/i18n';

// ============================================================
// Shared constants
// ============================================================

const TRAIT_KEYS = ['consistency', 'speed', 'endurance', 'variety', 'volume'] as const;
const TRAIT_COLORS = ['#10b981', '#22d3ee', '#818cf8', '#f59e0b', '#ef4444'];
const TRAIT_LABELS_EN = ['Consistency', 'Speed', 'Endurance', 'Variety', 'Volume'];
const TRAIT_LABELS_KO = ['꾸준함', '속도', '지구력', '다양성', '볼륨'];

// ============================================================
// 1. DNA Helix Generator  🧬
//    Double helix SVG where each rung represents a trait
// ============================================================

export function DNAHelix({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { personality } = intel;
  const scores = TRAIT_KEYS.map(k => personality.scores[k]);
  const labels = lang === 'ko' ? TRAIT_LABELS_KO : TRAIT_LABELS_EN;

  const W = 280, H = 220;
  const CX = W / 2;
  const helixW = 80; // half-width of helix
  const startY = 30, endY = H - 10;
  const segH = (endY - startY) / 5;

  // Generate helix backbone points (sinusoidal)
  const steps = 50;
  const leftPath: string[] = [];
  const rightPath: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const y = startY + frac * (endY - startY);
    const phase = frac * Math.PI * 2.5;
    const xOff = Math.sin(phase) * helixW;
    const depth = Math.cos(phase);
    const lx = CX - xOff;
    const rx = CX + xOff;
    leftPath.push(`${i === 0 ? 'M' : 'L'}${lx.toFixed(1)},${y.toFixed(1)}`);
    rightPath.push(`${i === 0 ? 'M' : 'L'}${rx.toFixed(1)},${y.toFixed(1)}`);
  }

  // Rung positions — one per trait
  const rungs = scores.map((score, i) => {
    const frac = (i + 0.5) / 5;
    const y = startY + frac * (endY - startY);
    const phase = frac * Math.PI * 2.5;
    const xOff = Math.sin(phase) * helixW;
    const lx = CX - xOff;
    const rx = CX + xOff;
    const depth = Math.cos(phase);
    return { y, lx, rx, score, color: TRAIT_COLORS[i], label: labels[i], depth };
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[280px]">
        {/* Glow backdrop */}
        <defs>
          <linearGradient id="helix-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <rect x={CX - helixW - 20} y={startY} width={helixW * 2 + 40} height={endY - startY} rx="12" fill="url(#helix-glow)" />

        {/* Back strand (draw first so rungs overlap) */}
        <path d={rightPath.join(' ')} fill="none" stroke="var(--color-text-muted)" strokeWidth="2" opacity="0.3" />

        {/* Rungs */}
        {rungs.map((r, i) => {
          const barW = (r.score / 5) * Math.abs(r.rx - r.lx);
          const midX = (r.lx + r.rx) / 2;
          return (
            <g key={i}>
              <line x1={r.lx} y1={r.y} x2={r.rx} y2={r.y} stroke={r.color} strokeWidth="2" opacity="0.2" />
              <line
                x1={midX - barW / 2}
                y1={r.y}
                x2={midX + barW / 2}
                y2={r.y}
                stroke={r.color}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Score dot */}
              <circle cx={midX + barW / 2} cy={r.y} r="4" fill={r.color} />
              <circle cx={midX - barW / 2} cy={r.y} r="4" fill={r.color} />
              {/* Label */}
              <text
                x={r.depth > 0 ? CX + helixW + 24 : CX - helixW - 24}
                y={r.y + 4}
                textAnchor={r.depth > 0 ? 'start' : 'end'}
                className="fill-text-muted"
                fontSize="10"
              >
                {r.label} {r.score}
              </text>
            </g>
          );
        })}

        {/* Front strand */}
        <path d={leftPath.join(' ')} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
      </svg>
      <p className="text-xs text-text-muted text-center font-medium">
        {personality.type} — Top {personality.percentile}%
      </p>
    </div>
  );
}

// ============================================================
// 2. Identity Streak  🔥
//    Running streak flame visualization
// ============================================================

export function IdentityStreak({ data, lang }: { data: EnrichedRunData; lang: Lang }) {
  const { currentStreak, longestStreak, weekPattern } = useMemo(() => {
    const runs = data.runs;
    if (!runs.length) return { currentStreak: 0, longestStreak: 0, weekPattern: [] as boolean[] };

    // Build set of dates with runs
    const runDates = new Set<string>();
    for (const r of runs) {
      runDates.add(r.dateFull.slice(0, 10));
    }

    // Calculate streaks (week-based: at least 1 run per week)
    const now = new Date();
    let curr = 0;
    let longest = 0;
    let streak = 0;

    // Check last 52 weeks
    const weekHasRun: boolean[] = [];
    for (let w = 51; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - w * 7);
      let hasRun = false;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + d);
        const key = day.toISOString().slice(0, 10);
        if (runDates.has(key)) { hasRun = true; break; }
      }
      weekHasRun.push(hasRun);
      if (hasRun) {
        streak++;
        longest = Math.max(longest, streak);
      } else {
        streak = 0;
      }
    }
    // Current streak is from the end
    curr = 0;
    for (let i = weekHasRun.length - 1; i >= 0; i--) {
      if (weekHasRun[i]) curr++;
      else break;
    }

    return { currentStreak: curr, longestStreak: longest, weekPattern: weekHasRun };
  }, [data.runs]);

  const W = 260, H = 180;
  const flameH = Math.min(currentStreak / 52, 1) * 120 + 30;
  const intensity = Math.min(currentStreak / 20, 1);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[260px]">
        <defs>
          <linearGradient id="flame-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f97316" />
            <stop offset="80%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
          <filter id="flame-blur">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Flame shape */}
        <g transform={`translate(${W / 2}, ${H - 20})`}>
          {/* Outer glow */}
          <ellipse cx="0" cy={-flameH * 0.3} rx={flameH * 0.35} ry={flameH * 0.5}
            fill="#f97316" opacity={intensity * 0.15} filter="url(#flame-blur)" />
          {/* Main flame */}
          <path
            d={`M0,0 Q${-flameH * 0.35},${-flameH * 0.3} ${-flameH * 0.15},${-flameH * 0.7} Q${-flameH * 0.05},${-flameH} 0,${-flameH} Q${flameH * 0.05},${-flameH} ${flameH * 0.15},${-flameH * 0.7} Q${flameH * 0.35},${-flameH * 0.3} 0,0Z`}
            fill="url(#flame-grad)"
            opacity={0.7 + intensity * 0.3}
          />
          {/* Inner flame */}
          <path
            d={`M0,0 Q${-flameH * 0.15},${-flameH * 0.2} ${-flameH * 0.05},${-flameH * 0.5} Q0,${-flameH * 0.65} 0,${-flameH * 0.65} Q0,${-flameH * 0.65} ${flameH * 0.05},${-flameH * 0.5} Q${flameH * 0.15},${-flameH * 0.2} 0,0Z`}
            fill="#fef08a"
            opacity="0.5"
          />
          {/* Streak number */}
          <text y={-flameH * 0.35} textAnchor="middle" className="fill-text font-bold" fontSize="22">
            {currentStreak}
          </text>
          <text y={-flameH * 0.35 + 14} textAnchor="middle" className="fill-text-muted" fontSize="9">
            {lang === 'ko' ? '주 연속' : 'week streak'}
          </text>
        </g>

        {/* Week dots (last 12 weeks) */}
        {weekPattern.slice(-12).map((hasRun, i) => (
          <circle
            key={i}
            cx={W / 2 - 55 + i * 10}
            cy={H - 8}
            r="3"
            fill={hasRun ? '#f97316' : 'var(--color-border)'}
            opacity={hasRun ? 1 : 0.4}
          />
        ))}
      </svg>

      <div className="flex gap-6 text-center">
        <div>
          <p className="text-lg font-bold font-mono">{currentStreak}</p>
          <p className="text-[10px] text-text-muted uppercase">{lang === 'ko' ? '현재 스트릭' : 'Current'}</p>
        </div>
        <div>
          <p className="text-lg font-bold font-mono">{longestStreak}</p>
          <p className="text-[10px] text-text-muted uppercase">{lang === 'ko' ? '최장 스트릭' : 'Longest'}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 3. Trophy Cabinet  🏅
//    Hidden achievement badge collection
// ============================================================

interface Badge {
  id: string;
  icon: string;
  name: { en: string; ko: string };
  desc: { en: string; ko: string };
  check: (data: EnrichedRunData, intel: IntelligenceData) => boolean;
}

const BADGES: Badge[] = [
  {
    id: 'centurion', icon: '💯',
    name: { en: 'Centurion', ko: '센추리온' },
    desc: { en: '100+ total runs', ko: '총 100회 이상 러닝' },
    check: (d) => d.runs.length >= 100,
  },
  {
    id: 'marathon-club', icon: '🏅',
    name: { en: 'Marathon Club', ko: '마라톤 클럽' },
    desc: { en: 'Ran 42+ km in one run', ko: '한 번에 42km 이상' },
    check: (d) => d.runs.some(r => r.distanceKm >= 42),
  },
  {
    id: 'speed-demon', icon: '⚡',
    name: { en: 'Speed Demon', ko: '스피드 데몬' },
    desc: { en: 'Sub 4:30/km pace run', ko: '4:30/km 이하 페이스 달성' },
    check: (d) => d.runs.some(r => r.paceSecsPerKm > 0 && r.paceSecsPerKm < 270 && r.distanceKm >= 3),
  },
  {
    id: 'globe-runner', icon: '🌍',
    name: { en: 'Globe Runner', ko: '글로벌 러너' },
    desc: { en: 'Ran in 3+ countries', ko: '3개국 이상 러닝' },
    check: (d) => {
      const flags = new Set(d.runs.map(r => r.locationFlag).filter(Boolean));
      return flags.size >= 3;
    },
  },
  {
    id: 'early-bird', icon: '🌅',
    name: { en: 'Early Bird', ko: '얼리버드' },
    desc: { en: '20+ runs before 7 AM', ko: '오전 7시 이전 20회 이상' },
    check: (d) => {
      const earlyRuns = d.runs.filter(r => {
        const h = parseInt(r.date.split(' ')[0] || '12');
        return h < 7;
      });
      return earlyRuns.length >= 20;
    },
  },
  {
    id: 'iron-legs', icon: '🦿',
    name: { en: 'Iron Legs', ko: '강철 다리' },
    desc: { en: '1000+ km total distance', ko: '총 1000km 이상' },
    check: (d) => d.stats.totalDistanceKm >= 1000,
  },
  {
    id: 'consistent-king', icon: '👑',
    name: { en: 'Consistency King', ko: '꾸준함의 왕' },
    desc: { en: 'Consistency score 5/5', ko: '꾸준함 점수 5/5' },
    check: (_, i) => i.personality.scores.consistency >= 5,
  },
  {
    id: 'versatile', icon: '🎭',
    name: { en: 'Versatile', ko: '다재다능' },
    desc: { en: 'All trait scores 3+', ko: '모든 특성 3점 이상' },
    check: (_, i) => TRAIT_KEYS.every(k => i.personality.scores[k] >= 3),
  },
  {
    id: 'half-marathon', icon: '🥈',
    name: { en: 'Half Marathoner', ko: '하프 마라토너' },
    desc: { en: 'Ran 21+ km in one run', ko: '한 번에 21km 이상' },
    check: (d) => d.runs.some(r => r.distanceKm >= 21),
  },
  {
    id: 'thousand-runs', icon: '🔥',
    name: { en: '1K Runner', ko: '1천회 러너' },
    desc: { en: '1000+ total runs', ko: '총 1000회 이상 러닝' },
    check: (d) => d.runs.length >= 1000,
  },
  {
    id: 'ultra-runner', icon: '🏔️',
    name: { en: 'Ultra Runner', ko: '울트라 러너' },
    desc: { en: 'Ran 50+ km in one run', ko: '한 번에 50km 이상' },
    check: (d) => d.runs.some(r => r.distanceKm >= 50),
  },
  {
    id: 'elevation-hunter', icon: '⛰️',
    name: { en: 'Elevation Hunter', ko: '고도 사냥꾼' },
    desc: { en: '500m+ elevation in one run', ko: '한 번에 500m 이상 고도 획득' },
    check: (d) => d.runs.some(r => (r.elevation ?? 0) >= 500),
  },
];

export function TrophyCabinet({ data, intel, lang }: { data: EnrichedRunData; intel: IntelligenceData; lang: Lang }) {
  const earned = useMemo(() =>
    BADGES.map(b => ({ ...b, unlocked: b.check(data, intel) })),
    [data, intel]
  );
  const unlockedCount = earned.filter(b => b.unlocked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {unlockedCount}/{BADGES.length} {lang === 'ko' ? '획득' : 'Earned'}
        </p>
        <div className="h-1.5 flex-1 mx-3 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-warm transition-all"
            style={{ width: `${(unlockedCount / BADGES.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {earned.map(b => (
          <div
            key={b.id}
            className={`flex flex-col items-center p-2 rounded-lg text-center transition-all ${
              b.unlocked
                ? 'bg-warm/10 border border-warm/20'
                : 'bg-surface-hover/50 opacity-40 grayscale'
            }`}
            title={b.unlocked ? b.desc[lang] : '???'}
          >
            <span className="text-xl">{b.unlocked ? b.icon : '🔒'}</span>
            <span className="text-[9px] text-text-muted mt-1 leading-tight">
              {b.unlocked ? b.name[lang] : '???'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 4. Injury Risk Radar  🩺
//    5-zone body injury risk prediction based on training load
// ============================================================

export function InjuryRiskRadar({ intel, data, lang }: { intel: IntelligenceData; data: EnrichedRunData; lang: Lang }) {
  const risks = useMemo(() => {
    const runs = data.runs;
    const recent = runs.slice(0, 14); // last 14 runs
    const { trainingLoad, recovery } = intel;

    // Factors that increase injury risk
    const loadRatio = trainingLoad.ratio;
    const avgRestDays = recovery.avgRestDays;
    const recentHighIntensity = recent.filter(r => r.paceSecsPerKm < 300 && r.distanceKm > 5).length;
    const recentLongRuns = recent.filter(r => r.distanceKm > 15).length;
    const avgElevation = recent.reduce((s, r) => s + (r.elevation ?? 0), 0) / (recent.length || 1);

    // 5 risk zones (0-100 scale)
    const knees = Math.min(100, Math.round(
      (loadRatio > 1.5 ? 40 : loadRatio > 1.2 ? 20 : 5) +
      recentLongRuns * 8 +
      (avgRestDays < 1.5 ? 25 : avgRestDays < 2 ? 10 : 0)
    ));
    const ankles = Math.min(100, Math.round(
      recentHighIntensity * 7 +
      (loadRatio > 1.3 ? 25 : 5) +
      (avgElevation > 100 ? 20 : avgElevation > 50 ? 10 : 0)
    ));
    const shins = Math.min(100, Math.round(
      (loadRatio > 1.4 ? 35 : loadRatio > 1.1 ? 15 : 5) +
      (avgRestDays < 1 ? 30 : avgRestDays < 2 ? 10 : 0)
    ));
    const hips = Math.min(100, Math.round(
      recentLongRuns * 10 +
      (avgElevation > 150 ? 25 : avgElevation > 80 ? 10 : 0) +
      (loadRatio > 1.3 ? 15 : 0)
    ));
    const general = Math.min(100, Math.round(
      (loadRatio > 1.5 ? 40 : loadRatio > 1.3 ? 25 : loadRatio > 1.1 ? 10 : 0) +
      (avgRestDays < 1 ? 25 : avgRestDays < 2 ? 10 : 0) +
      recentHighIntensity * 3
    ));

    return [
      { label: lang === 'ko' ? '무릎' : 'Knees', value: knees, icon: '🦵' },
      { label: lang === 'ko' ? '발목' : 'Ankles', value: ankles, icon: '🦶' },
      { label: lang === 'ko' ? '정강이' : 'Shins', value: shins, icon: '🦴' },
      { label: lang === 'ko' ? '골반/엉덩이' : 'Hips', value: hips, icon: '🏃' },
      { label: lang === 'ko' ? '전반적 피로' : 'Fatigue', value: general, icon: '💪' },
    ];
  }, [intel, data.runs]);

  const getColor = (v: number) => v >= 60 ? '#ef4444' : v >= 35 ? '#f59e0b' : '#10b981';
  const getLabel = (v: number) => v >= 60
    ? (lang === 'ko' ? '주의' : 'Caution')
    : v >= 35
      ? (lang === 'ko' ? '보통' : 'Moderate')
      : (lang === 'ko' ? '양호' : 'Low');

  const overallRisk = Math.round(risks.reduce((s, r) => s + r.value, 0) / risks.length);

  return (
    <div className="space-y-3">
      {/* Overall risk indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColor(overallRisk) }}
          />
          <span className="text-sm font-semibold">{getLabel(overallRisk)}</span>
        </div>
        <span className="text-xs text-text-muted font-mono">{overallRisk}/100</span>
      </div>

      {/* Risk bars */}
      <div className="space-y-2">
        {risks.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm w-5">{r.icon}</span>
            <span className="text-xs text-text-muted w-16 truncate">{r.label}</span>
            <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${r.value}%`, backgroundColor: getColor(r.value) }}
              />
            </div>
            <span className="text-xs font-mono w-8 text-right" style={{ color: getColor(r.value) }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 5. Fatigue Fuel Tank  ⛽
//    Animated fuel gauge for fatigue vs recovery
// ============================================================

export function FatigueFuelTank({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { trainingLoad, recovery } = intel;

  // Fuel level: inverse of load ratio (high load = empty tank)
  const fuelLevel = useMemo(() => {
    const ratio = trainingLoad.ratio;
    // ratio 0.8 = full, 1.5+ = empty
    const pct = Math.max(0, Math.min(100, Math.round((1.6 - ratio) / 0.8 * 100)));
    return pct;
  }, [trainingLoad.ratio]);

  const restDays = recovery.avgRestDays;
  const streak = recovery.longestStreak;

  const getColor = (pct: number) =>
    pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#ef4444';
  const getLabel = (pct: number) =>
    pct >= 60
      ? (lang === 'ko' ? '충전됨' : 'Charged')
      : pct >= 30
        ? (lang === 'ko' ? '보통' : 'Moderate')
        : (lang === 'ko' ? '고갈' : 'Depleted');

  const W = 200, H = 160;
  const tankW = 80, tankH = 120;
  const tx = (W - tankW) / 2, ty = 15;
  const fillH = (fuelLevel / 100) * (tankH - 10);
  const color = getColor(fuelLevel);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[200px]">
        <defs>
          <linearGradient id="fuel-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
          <clipPath id="tank-clip">
            <rect x={tx + 3} y={ty + 3} width={tankW - 6} height={tankH - 6} rx="6" />
          </clipPath>
        </defs>

        {/* Tank outline */}
        <rect x={tx} y={ty} width={tankW} height={tankH} rx="10" fill="none"
          stroke="var(--color-border)" strokeWidth="2" />
        {/* Tank cap */}
        <rect x={tx + tankW / 2 - 12} y={ty - 6} width="24" height="8" rx="3"
          fill="var(--color-border)" />

        {/* Fuel fill */}
        <g clipPath="url(#tank-clip)">
          <rect
            x={tx + 3}
            y={ty + tankH - 3 - fillH}
            width={tankW - 6}
            height={fillH}
            fill="url(#fuel-grad)"
          />
          {/* Wave effect */}
          <path
            d={`M${tx + 3},${ty + tankH - 3 - fillH} q${tankW * 0.25},-6 ${(tankW - 6) / 2},0 t${(tankW - 6) / 2},0`}
            fill={color}
            opacity="0.3"
          />
        </g>

        {/* Percentage text */}
        <text x={W / 2} y={ty + tankH / 2 + 5} textAnchor="middle"
          className="fill-text font-bold" fontSize="24">
          {fuelLevel}%
        </text>
        <text x={W / 2} y={ty + tankH / 2 + 20} textAnchor="middle"
          className="fill-text-muted" fontSize="10">
          {getLabel(fuelLevel)}
        </text>

        {/* Side markers */}
        {[0, 25, 50, 75, 100].map(m => {
          const my = ty + tankH - 3 - (m / 100) * (tankH - 10);
          return (
            <g key={m}>
              <line x1={tx + tankW + 4} y1={my} x2={tx + tankW + 10} y2={my}
                stroke="var(--color-text-muted)" strokeWidth="1" opacity="0.4" />
              <text x={tx + tankW + 13} y={my + 3} className="fill-text-muted" fontSize="8">
                {m}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex gap-6 text-center">
        <div>
          <p className="text-sm font-bold font-mono">{restDays.toFixed(1)}</p>
          <p className="text-[10px] text-text-muted uppercase">{lang === 'ko' ? '평균 휴식일' : 'Avg Rest'}</p>
        </div>
        <div>
          <p className="text-sm font-bold font-mono">{trainingLoad.ratio.toFixed(2)}</p>
          <p className="text-[10px] text-text-muted uppercase">{lang === 'ko' ? '부하 비율' : 'Load Ratio'}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 6. City Constellation  ✨
//    Locations as stars, routes as constellation lines
// ============================================================

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Seoul: { lat: 37.5, lng: 127.0 }, Busan: { lat: 35.2, lng: 129.1 },
  Hyderabad: { lat: 17.4, lng: 78.4 }, Chennai: { lat: 13.1, lng: 80.3 },
  London: { lat: 51.5, lng: -0.1 }, Lisbon: { lat: 38.7, lng: -9.1 },
  Porto: { lat: 41.1, lng: -8.6 }, Jakarta: { lat: -6.2, lng: 106.8 },
  Yantai: { lat: 37.6, lng: 121.2 }, 'New York': { lat: 40.7, lng: -74.0 },
  Tokyo: { lat: 35.7, lng: 139.7 }, Berlin: { lat: 52.5, lng: 13.4 },
  Paris: { lat: 48.9, lng: 2.3 }, Sydney: { lat: -33.9, lng: 151.2 },
  Daejeon: { lat: 36.3, lng: 127.4 }, Incheon: { lat: 37.5, lng: 126.7 },
  Daegu: { lat: 35.9, lng: 128.6 }, Jeju: { lat: 33.5, lng: 126.5 },
};

export function CityConstellation({ data, lang }: { data: EnrichedRunData; lang: Lang }) {
  const { cities, connections } = useMemo(() => {
    const cityMap = new Map<string, { count: number; km: number; order: number }>();
    let order = 0;

    for (const run of [...data.runs].reverse()) {
      const loc = run.location || 'Unknown';
      if (!CITY_COORDS[loc]) continue;
      if (!cityMap.has(loc)) {
        cityMap.set(loc, { count: 0, km: 0, order: order++ });
      }
      const c = cityMap.get(loc)!;
      c.count++;
      c.km += run.distanceKm;
    }

    if (cityMap.size === 0) return { cities: [], connections: [] };

    // Project into widget space
    const W = 260, H = 180;
    const entries = Array.from(cityMap.entries())
      .map(([name, info]) => {
        const coord = CITY_COORDS[name]!;
        return { name, ...info, lat: coord.lat, lng: coord.lng };
      })
      .sort((a, b) => a.order - b.order);

    // Fit to bounding box
    const lats = entries.map(e => e.lat);
    const lngs = entries.map(e => e.lng);
    const latMin = Math.min(...lats), latMax = Math.max(...lats);
    const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
    const pad = 30;

    const projected = entries.map(e => {
      const x = lngs.length > 1
        ? pad + ((e.lng - lngMin) / (lngMax - lngMin || 1)) * (W - pad * 2)
        : W / 2;
      const y = lats.length > 1
        ? pad + ((latMax - e.lat) / (latMax - latMin || 1)) * (H - pad * 2)
        : H / 2;
      return { ...e, x, y };
    });

    // Connections: chronological order
    const conns: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 1; i < projected.length; i++) {
      conns.push({
        x1: projected[i - 1].x, y1: projected[i - 1].y,
        x2: projected[i].x, y2: projected[i].y,
      });
    }

    return { cities: projected, connections: conns };
  }, [data.runs]);

  if (cities.length === 0) {
    return <p className="text-xs text-text-muted text-center py-8">{lang === 'ko' ? '위치 데이터 없음' : 'No location data'}</p>;
  }

  const W = 260, H = 180;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[260px]">
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
          <filter id="star-blur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Star field background dots */}
        {Array.from({ length: 30 }, (_, i) => (
          <circle
            key={`bg-${i}`}
            cx={((i * 47 + 13) % W)}
            cy={((i * 31 + 7) % H)}
            r={0.5 + (i % 3) * 0.3}
            fill="var(--color-text-muted)"
            opacity={0.15 + (i % 5) * 0.05}
          />
        ))}

        {/* Constellation lines */}
        {connections.map((c, i) => (
          <line key={i}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke="var(--color-accent)" strokeWidth="1" opacity="0.3"
            strokeDasharray="4,3"
          />
        ))}

        {/* City stars */}
        {cities.map((c, i) => {
          const r = Math.min(3 + c.count * 0.3, 8);
          return (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r={r * 2.5} fill="url(#star-glow)" filter="url(#star-blur)" />
              <circle cx={c.x} cy={c.y} r={r} fill="var(--color-accent)" opacity="0.9" />
              <circle cx={c.x} cy={c.y} r={r * 0.4} fill="white" opacity="0.8" />
              <text
                x={c.x}
                y={c.y - r - 4}
                textAnchor="middle"
                className="fill-text-muted"
                fontSize="8"
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-text-muted mt-1">
        {cities.length} {lang === 'ko' ? '도시 — 나의 별자리' : 'cities — your constellation'}
      </p>
    </div>
  );
}

// ============================================================
// 7. Seasonal Crown  👑
//    Time-limited seasonal achievements
// ============================================================

export function SeasonalCrown({ data, intel, lang }: { data: EnrichedRunData; intel: IntelligenceData; lang: Lang }) {
  const achievements = useMemo(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    // Current season
    const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'fall';
    const seasonLabel = {
      winter: lang === 'ko' ? '겨울' : 'Winter',
      spring: lang === 'ko' ? '봄' : 'Spring',
      summer: lang === 'ko' ? '여름' : 'Summer',
      fall: lang === 'ko' ? '가을' : 'Fall',
    }[season];
    const seasonIcon = { winter: '❄️', spring: '🌸', summer: '☀️', fall: '🍂' }[season];

    // Filter runs to current season
    const seasonStart = new Date(year, month < 3 ? 0 : month < 6 ? 3 : month < 9 ? 6 : 9, 1);
    const seasonRuns = data.runs.filter(r => {
      const d = new Date(r.dateFull);
      return d >= seasonStart;
    });

    const totalKm = seasonRuns.reduce((s, r) => s + r.distanceKm, 0);
    const totalRuns = seasonRuns.length;
    const bestPace = seasonRuns.length > 0
      ? Math.min(...seasonRuns.filter(r => r.paceSecsPerKm > 0).map(r => r.paceSecsPerKm))
      : 0;
    const longestRun = seasonRuns.length > 0
      ? Math.max(...seasonRuns.map(r => r.distanceKm))
      : 0;

    // Season-specific challenges
    const challenges = [
      {
        label: lang === 'ko' ? `${seasonLabel} 100km` : `${seasonLabel} 100km`,
        target: 100, current: totalKm, icon: '🎯',
      },
      {
        label: lang === 'ko' ? '20회 러닝' : '20 Runs',
        target: 20, current: totalRuns, icon: '🏃',
      },
      {
        label: lang === 'ko' ? '10km 이상 러닝' : '10km+ Run',
        target: 1, current: seasonRuns.filter(r => r.distanceKm >= 10).length, icon: '📏',
      },
      {
        label: lang === 'ko' ? '5:00/km 이하' : 'Sub 5:00/km',
        target: 1,
        current: seasonRuns.filter(r => r.paceSecsPerKm > 0 && r.paceSecsPerKm < 300 && r.distanceKm >= 3).length,
        icon: '⚡',
      },
    ];

    return { season, seasonLabel, seasonIcon, totalKm, totalRuns, challenges };
  }, [data.runs, lang]);

  const completedCount = achievements.challenges.filter(c => c.current >= c.target).length;

  return (
    <div className="space-y-3">
      {/* Season header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{achievements.seasonIcon}</span>
          <span className="text-sm font-bold">{achievements.seasonLabel} Crown</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-warm/10 text-warm font-bold">
          {completedCount}/{achievements.challenges.length}
        </span>
      </div>

      {/* Crown visualization */}
      <div className="flex justify-center gap-1">
        {achievements.challenges.map((c, i) => {
          const done = c.current >= c.target;
          return (
            <div key={i} className={`flex flex-col items-center p-1.5 rounded-lg transition-all ${
              done ? 'bg-warm/10' : 'bg-surface-hover/50'
            }`}>
              <span className={`text-lg ${done ? '' : 'grayscale opacity-40'}`}>{done ? '👑' : c.icon}</span>
            </div>
          );
        })}
      </div>

      {/* Challenge list */}
      <div className="space-y-2">
        {achievements.challenges.map((c, i) => {
          const pct = Math.min(100, (c.current / c.target) * 100);
          const done = pct >= 100;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm">{c.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs truncate">{c.label}</span>
                  <span className={`text-[10px] font-mono ${done ? 'text-warm' : 'text-text-muted'}`}>
                    {done ? '✓' : `${Math.round(pct)}%`}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-border overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: done ? '#f59e0b' : 'var(--color-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

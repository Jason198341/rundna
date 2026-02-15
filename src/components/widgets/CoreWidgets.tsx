'use client';

import { useState, useEffect } from 'react';
import type { EnrichedRunData } from '@/lib/strava';
import type { IntelligenceData } from '@/lib/strava-analytics';
import { t, type Lang } from '@/lib/i18n';

// ── Stats Overview ──
export function StatsOverview({ data, lang }: { data: EnrichedRunData; lang: Lang }) {
  const { stats, locations, monthlyVolume } = data;
  const recentKm = monthlyVolume.slice(-8).map(m => m.km);
  const recentCount = monthlyVolume.slice(-8).map(m => m.count);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label={t('dash.totalRuns', lang)} value={stats.totalRuns.toString()} numericValue={stats.totalRuns} sparkData={recentCount} color="var(--color-primary)" />
      <Stat label={t('dash.totalDist', lang)} value={`${stats.totalDistance} km`} numericValue={stats.totalDistanceKm} sparkData={recentKm} color="var(--color-accent)" />
      <Stat label={t('dash.avgPace', lang)} value={stats.avgPace} />
      <Stat label={t('dash.locations', lang)} value={locations.length.toString()} numericValue={locations.length} />
    </div>
  );
}

// ── Personal Records ──
export function PersonalRecords({ data, lang }: { data: EnrichedRunData; lang: Lang }) {
  if (data.prs.length === 0) return <p className="text-sm text-text-muted">No PRs yet</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {data.prs.map(pr => (
        <div key={pr.label}>
          <p className="text-xs text-text-muted">{pr.label}</p>
          <p className="text-lg font-bold text-primary font-mono">{pr.time}</p>
          <p className="text-[10px] text-text-muted">{pr.pace} · {pr.date}</p>
        </div>
      ))}
    </div>
  );
}

// ── Feature Navigation ──
export function FeatureNav({ lang }: { lang: Lang }) {
  const features = [
    { icon: '🧬', title: t('dash.dna', lang), href: '/dna', color: 'primary' },
    { icon: '🤖', title: t('dash.coach', lang), href: '/coach', color: 'accent' },
    { icon: '⚔️', title: t('nav.battle', lang), href: '/battle', color: 'warm' },
    { icon: '📊', title: t('dash.report', lang), href: '/report', color: 'primary' },
    { icon: '🏁', title: t('dash.planner', lang), href: '/planner', color: 'accent' },
    { icon: '📖', title: t('nav.story', lang), href: '/story', color: 'warm' },
    { icon: '👑', title: t('nav.segments', lang), href: '/segments', color: 'primary' },
    { icon: '👟', title: t('nav.shoes', lang), href: '/shoes', color: 'accent' },
    { icon: '🏁', title: t('nav.simulation', lang), href: '/simulation', color: 'warm' },
    { icon: '🎁', title: t('dash.wrapped', lang), href: '/wrapped', color: 'primary' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {features.map(f => (
        <a key={f.href} href={f.href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
          <span className="text-lg">{f.icon}</span>
          <span className={`text-xs font-medium text-${f.color}`}>{f.title}</span>
        </a>
      ))}
    </div>
  );
}

// ── Recent Activities ──
export function RecentActivities({ data, lang }: { data: EnrichedRunData; lang: Lang }) {
  const runs = data.runs.slice(0, 10);
  return (
    <div className="space-y-0 divide-y divide-border">
      {runs.map((r, i) => (
        <div key={i} className="flex items-center justify-between py-2 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{r.name}</p>
            <p className="text-xs text-text-muted">{r.date} · {r.locationFlag} {r.location}</p>
          </div>
          <div className="flex gap-3 shrink-0 text-xs font-mono text-text-muted">
            <span>{r.distance}</span>
            <span className="hidden sm:inline">{r.pace}</span>
            <span>{r.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DNA Radar Chart ──
export function DNARadar({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { personality } = intel;
  const scores = [personality.scores.consistency, personality.scores.speed, personality.scores.endurance, personality.scores.variety, personality.scores.volume];
  const labels = ['dna.consistency', 'dna.speed', 'dna.endurance', 'dna.variety', 'dna.volume'].map(k => t(k, lang));
  const colors = ['#10b981', '#22d3ee', '#818cf8', '#f59e0b', '#ef4444'];

  const cx = 120, cy = 120, maxR = 80;
  const n = 5;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;
  const point = (i: number, val: number) => {
    const angle = startAngle + i * angleStep;
    const r = (val / 5) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };
  const dataPoints = scores.map((s, i) => point(i, s));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="text-center">
      <p className="text-sm text-text-muted mb-1">{personality.type}</p>
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
        <span className="text-[10px] font-bold text-primary">Top {personality.percentile}%</span>
      </div>
      <svg viewBox="0 0 240 240" className="mx-auto w-full max-w-[200px]">
        {[1,2,3,4,5].map(level => {
          const pts = Array.from({ length: n }, (_, i) => point(i, level));
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return <path key={level} d={path} fill="none" stroke="var(--color-border)" strokeWidth={level === 5 ? 1 : 0.5} />;
        })}
        {Array.from({ length: n }, (_, i) => {
          const p = point(i, 5);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-border)" strokeWidth={0.5} />;
        })}
        <path d={dataPath} fill="var(--color-primary-dim)" stroke="var(--color-primary)" strokeWidth={2} />
        {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={colors[i]} />)}
        {labels.map((label, i) => {
          const p = point(i, 6.2);
          return <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '9px', fill: 'var(--color-text-muted)' }}>{label}</text>;
        })}
      </svg>
    </div>
  );
}

// ── Trait Bars ──
export function TraitBars({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { personality } = intel;
  const traits = [
    { key: 'dna.consistency', score: personality.scores.consistency, color: '#10b981', icon: '📅' },
    { key: 'dna.speed', score: personality.scores.speed, color: '#22d3ee', icon: '⚡' },
    { key: 'dna.endurance', score: personality.scores.endurance, color: '#818cf8', icon: '🏔️' },
    { key: 'dna.variety', score: personality.scores.variety, color: '#f59e0b', icon: '🗺️' },
    { key: 'dna.volume', score: personality.scores.volume, color: '#ef4444', icon: '📈' },
  ];
  return (
    <div className="space-y-2">
      {traits.map(tr => (
        <div key={tr.key} className="flex items-center gap-2">
          <span className="text-sm w-5 text-center">{tr.icon}</span>
          <span className="text-xs font-medium w-16">{t(tr.key, lang)}</span>
          <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(tr.score / 5) * 100}%`, backgroundColor: tr.color }} />
          </div>
          <span className="text-xs font-mono font-bold w-4 text-right" style={{ color: tr.color }}>{tr.score}</span>
        </div>
      ))}
    </div>
  );
}

// ── Training Load ──
export function TrainingLoadWidget({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { trainingLoad } = intel;
  // Scale: max 2.5 to give headroom above 2.0
  const scaleMax = 2.5;
  const barPct = Math.min((trainingLoad.ratio / scaleMax) * 100, 100);
  // Zone line positions (proportional to scaleMax)
  const zonePct = (v: number) => `${(v / scaleMax) * 100}%`;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-text-muted">{t('dna.acwr', lang)}</span>
        <span className="text-sm font-mono font-bold" style={{ color: trainingLoad.zoneColor }}>
          {trainingLoad.ratio.toFixed(2)} — {trainingLoad.zoneLabel}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-bg overflow-hidden relative">
        <div className="absolute inset-y-0 w-px bg-border" style={{ left: zonePct(0.8) }} />
        <div className="absolute inset-y-0 w-px bg-border" style={{ left: zonePct(1.0) }} />
        <div className="absolute inset-y-0 w-px bg-border" style={{ left: zonePct(1.3) }} />
        <div className="absolute inset-y-0 w-px bg-border" style={{ left: zonePct(1.5) }} />
        <div className="absolute inset-y-0 w-px bg-border" style={{ left: zonePct(2.0) }} />
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, backgroundColor: trainingLoad.zoneColor }} />
      </div>
      <div className="flex justify-between text-[10px] text-text-muted mt-1">
        <span>0</span><span>0.8</span><span>1.0</span><span>1.3</span><span>2.0</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Stat label={t('dna.acute', lang)} value={trainingLoad.acute.toFixed(0)} />
        <Stat label={t('dna.chronic', lang)} value={trainingLoad.chronic.toFixed(0)} />
      </div>
    </div>
  );
}

// ── Race Predictions ──
export function RacePredictions({ intel }: { intel: IntelligenceData }) {
  if (intel.racePredictions.length === 0) return <p className="text-sm text-text-muted">Need 3km+ recent run</p>;
  return (
    <div className="grid grid-cols-2 gap-2">
      {intel.racePredictions.map(rp => (
        <div key={rp.label} className="text-center py-1">
          <p className="text-xs text-text-muted">{rp.label}</p>
          <p className="text-sm font-bold font-mono text-accent">{rp.time}</p>
          <p className="text-[10px] text-text-muted">{rp.pace}</p>
        </div>
      ))}
    </div>
  );
}

// ── Recovery Stats ──
export function RecoveryStats({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { recovery } = intel;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat label={t('dna.avgRest', lang)} value={`${recovery.avgRestDays}d`} />
      <Stat label={t('dna.afterHard', lang)} value={`${recovery.avgRestAfterHard}d`} />
      <Stat label={t('dna.longestStreak', lang)} value={`${recovery.longestStreak}d`} />
      <Stat label={t('dna.longestRest', lang)} value={`${recovery.longestRest}d`} />
    </div>
  );
}

// ── Coach Advice ──
export function CoachAdvice({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  return (
    <div>
      <ul className="space-y-1.5">
        {intel.coachAdvice.map((advice, i) => (
          <li key={i} className="text-sm text-text-muted flex items-start gap-2">
            <span className="text-primary shrink-0 mt-0.5">•</span>
            {advice}
          </li>
        ))}
      </ul>
      <a href="/coach" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {t('dna.chatCoach', lang)} →
      </a>
    </div>
  );
}

// ── Today's Plan ──
export function TodaysPlanWidget({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { todaysPlan } = intel;
  const rec = todaysPlan.recommended;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: todaysPlan.currentColor + '20' }}>
          {rec.type === 'best' ? '✅' : rec.type === 'caution' ? '⚠️' : rec.type === 'avoid' ? '🛑' : '👍'}
        </div>
        <div>
          <p className="text-sm font-medium">{todaysPlan.headline}</p>
          <p className="text-xs text-text-muted">
            Safe max: {todaysPlan.safeMaxKm} km · Easy: {todaysPlan.easyPace}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {todaysPlan.scenarios.slice(0, 4).map(s => (
          <div key={s.label} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${s === rec ? 'bg-primary/10 border border-primary/20' : 'bg-bg'}`}>
            <span className="font-medium">{s.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">{s.distance}</span>
              <span className="font-mono" style={{ color: s.projectedColor }}>{s.projectedRatio.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      {todaysPlan.advice.length > 0 && (
        <div className="mt-3 space-y-1">
          {todaysPlan.advice.slice(0, 2).map((a, i) => (
            <p key={i} className="text-[11px] text-text-muted">• {a}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pace Trend ──
export function PaceTrend({ intel }: { intel: IntelligenceData }) {
  const points = intel.paceTrend.slice(-12);
  if (points.length < 2) return <p className="text-sm text-text-muted">Need more data</p>;

  const fmtPace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  // --- Layout constants ---
  const svgW = 200;
  const svgH = 96;
  const padL = 30;   // left gutter for Y-axis labels
  const padR = 6;
  const padT = 12;   // top breathing room for pace label
  const padB = 14;   // bottom for week labels
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  // --- Data bounds ---
  // Y-axis: pace in secs/km. LOWER pace = FASTER = HIGHER on chart (natural Y inversion).
  // We plot with the slowest pace at the bottom and fastest at the top.
  const paces = points.map(p => p.avgPace);
  const minPace = Math.min(...paces);
  const maxPace = Math.max(...paces);
  const range = maxPace - minPace || 1;
  // Add 5% padding so bars/dots don't clip edges
  const yMin = minPace - range * 0.05;
  const yMax = maxPace + range * 0.05;
  const yRange = yMax - yMin || 1;

  const bestIdx = points.reduce((bi, p, i, arr) => p.avgPace < arr[bi].avgPace ? i : bi, 0);
  const lastIdx = points.length - 1;

  // --- Coordinate helpers ---
  // X: evenly spaced across chart width
  const xOf = (i: number) => padL + (chartW / Math.max(points.length - 1, 1)) * i;
  // Y: lower pace (faster) = smaller Y (higher on screen)
  const yOf = (pace: number) => padT + ((pace - yMin) / yRange) * chartH;

  // --- Bar width ---
  const barGap = 2;
  const barW = Math.max(Math.min((chartW / points.length) - barGap, 14), 4);

  // --- Color per bar: gradient from accent (fastest) to warm (slowest) ---
  // Normalize each point's pace: 0 = fastest (best), 1 = slowest
  const barColors = points.map(p => {
    const t = range > 0 ? (p.avgPace - minPace) / range : 0;
    // Interpolate hue: accent-ish (190 cyan-blue) -> warm-ish (35 amber)
    // We use HSL: fast=hsl(160,80%,45%) mid=hsl(200,70%,50%) slow=hsl(35,90%,55%)
    // Simpler: use 3-stop gradient via CSS. For inline SVG, compute hex.
    // green(fast) -> yellow(mid) -> orange(slow)
    const h = 160 - t * 125;       // 160 (green) -> 35 (amber)
    const s = 75 + t * 15;         // 75% -> 90%
    const l = 45 + t * 10;         // 45% -> 55%
    return `hsl(${h} ${s}% ${l}%)`;
  });

  // --- Trend line: linear regression on avgPace ---
  const n = points.length;
  const sumX = points.reduce((s, _, i) => s + i, 0);
  const sumY = points.reduce((s, p) => s + p.avgPace, 0);
  const sumXY = points.reduce((s, p, i) => s + i * p.avgPace, 0);
  const sumX2 = points.reduce((s, _, i) => s + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;
  const trendY0 = intercept;
  const trendYN = intercept + slope * (n - 1);
  // Trend direction for the arrow/label
  const isFaster = slope < -0.5;
  const isSlower = slope > 0.5;

  // --- Smoothed line path (monotone cubic interpolation via SVG cubic bezier) ---
  const linePoints = points.map((p, i) => ({ x: xOf(i), y: yOf(p.avgPace) }));
  let linePath = `M${linePoints[0].x},${linePoints[0].y}`;
  if (linePoints.length === 2) {
    // 2 points: straight line
    linePath += ` L${linePoints[1].x},${linePoints[1].y}`;
  } else {
    // 3+ points: smooth cubic bezier through each pair using midpoint control points
    for (let i = 1; i < linePoints.length; i++) {
      const prev = linePoints[i - 1];
      const curr = linePoints[i];
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpx2 = prev.x + (curr.x - prev.x) * 2 / 3;
      // Slope: use neighboring points for tangent direction
      const slopePrev = i > 1
        ? (curr.y - linePoints[i - 2].y) / (curr.x - linePoints[i - 2].x)
        : (curr.y - prev.y) / (curr.x - prev.x);
      const slopeCurr = i < linePoints.length - 1
        ? (linePoints[i + 1].y - prev.y) / (linePoints[i + 1].x - prev.x)
        : (curr.y - prev.y) / (curr.x - prev.x);
      const cpy1 = prev.y + slopePrev * (curr.x - prev.x) / 3;
      const cpy2 = curr.y - slopeCurr * (curr.x - prev.x) / 3;
      linePath += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${curr.x},${curr.y}`;
    }
  }

  // --- Area fill under curve ---
  const areaPath = linePath + ` L${linePoints[lastIdx].x},${padT + chartH} L${linePoints[0].x},${padT + chartH} Z`;

  return (
    <div>
      {/* Trend summary line */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-[10px] font-semibold ${isFaster ? 'text-[#10b981]' : isSlower ? 'text-warm' : 'text-text-muted'}`}>
          {isFaster ? '\u25B2' : isSlower ? '\u25BC' : '\u2500'}{' '}
          {intel.paceImprovement}
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
        <defs>
          {/* Gradient fill under the curve */}
          <linearGradient id="paceFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis reference lines (2 lines: fastest & slowest) */}
        <line x1={padL} y1={yOf(minPace)} x2={svgW - padR} y2={yOf(minPace)} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2,2" />
        <line x1={padL} y1={yOf(maxPace)} x2={svgW - padR} y2={yOf(maxPace)} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2,2" />

        {/* Y-axis pace labels */}
        <text x={padL - 3} y={yOf(minPace) + 1} textAnchor="end" style={{ fill: 'var(--color-accent)' }} fontSize="7" fontWeight="600" fontFamily="ui-monospace,monospace">
          {fmtPace(minPace)}
        </text>
        <text x={padL - 3} y={yOf(maxPace) + 1} textAnchor="end" style={{ fill: 'var(--color-text-muted)' }} fontSize="7" fontFamily="ui-monospace,monospace">
          {fmtPace(maxPace)}
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#paceFillGrad)" />

        {/* Bars */}
        {points.map((p, i) => {
          const cx = xOf(i);
          const cy = yOf(p.avgPace);
          const barTop = cy;
          const barBottom = padT + chartH;
          const barHeight = barBottom - barTop;
          const isBest = i === bestIdx;
          const isLast = i === lastIdx;
          return (
            <g key={p.weekKey}>
              <rect
                x={cx - barW / 2}
                y={barTop}
                width={barW}
                height={Math.max(barHeight, 1)}
                rx={barW > 6 ? 2 : 1}
                fill={barColors[i]}
                opacity={isBest || isLast ? 0.9 : 0.5}
                stroke={isBest ? 'var(--color-accent)' : isLast ? 'var(--color-primary)' : 'none'}
                strokeWidth={isBest || isLast ? 1 : 0}
              >
                <title>{`${p.week}: ${fmtPace(p.avgPace)}/km (avg) | ${fmtPace(p.rawPace)}/km (raw) | ${p.distance.toFixed(1)}km`}</title>
              </rect>

              {/* Week label on X-axis */}
              {(i === 0 || i === lastIdx || (points.length > 4 && i === Math.floor(lastIdx / 2))) && (
                <text x={cx} y={svgH - 2} textAnchor="middle" style={{ fill: 'var(--color-text-muted)' }} fontSize="7" fontFamily="ui-monospace,monospace">
                  {p.week.length > 6 ? p.week.split(' ').pop() : p.week}
                </text>
              )}
            </g>
          );
        })}

        {/* Trend line (linear regression) */}
        <line
          x1={xOf(0)} y1={yOf(trendY0)}
          x2={xOf(lastIdx)} y2={yOf(trendYN)}
          stroke={isFaster ? '#10b981' : isSlower ? '#f59e0b' : 'var(--color-text-muted)'}
          strokeWidth="1.5"
          strokeDasharray="4,3"
          opacity="0.7"
        />

        {/* Smoothed pace line */}
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />

        {/* Dots on best and last */}
        <circle cx={xOf(bestIdx)} cy={yOf(points[bestIdx].avgPace)} r="3" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="1" />
        <circle cx={xOf(lastIdx)} cy={yOf(points[lastIdx].avgPace)} r="3" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="1" />

        {/* Pace label on best week */}
        <text
          x={xOf(bestIdx)}
          y={yOf(points[bestIdx].avgPace) - 5}
          textAnchor={bestIdx < 2 ? 'start' : bestIdx > lastIdx - 2 ? 'end' : 'middle'}
          style={{ fill: 'var(--color-accent)' }}
          fontSize="7"
          fontWeight="700"
          fontFamily="ui-monospace,monospace"
        >
          {fmtPace(points[bestIdx].avgPace)}
        </text>

        {/* Pace label on most recent week (if different from best) */}
        {lastIdx !== bestIdx && (
          <text
            x={xOf(lastIdx)}
            y={yOf(points[lastIdx].avgPace) - 5}
            textAnchor="end"
            style={{ fill: 'var(--color-primary)' }}
            fontSize="7"
            fontWeight="600"
            fontFamily="ui-monospace,monospace"
          >
            {fmtPace(points[lastIdx].avgPace)}
          </text>
        )}
      </svg>
    </div>
  );
}

// ── Conditions ──
export function ConditionsWidget({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { conditions } = intel;
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <p className="text-xs text-text-muted">Best Day</p>
        <p className="text-sm font-bold">{conditions.bestDay.day}</p>
        <p className="text-[10px] text-text-muted">{conditions.bestDay.pace}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-text-muted">Best Time</p>
        <p className="text-sm font-bold">{conditions.bestHour.hour}</p>
        <p className="text-[10px] text-text-muted">{conditions.bestHour.pace}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-text-muted">Sweet Spot</p>
        <p className="text-sm font-bold">{conditions.sweetSpotDistance.range}</p>
        <p className="text-[10px] text-text-muted">{conditions.sweetSpotDistance.pace}</p>
      </div>
    </div>
  );
}

// ── Year Comparison ──
export function YearComparison({ intel }: { intel: IntelligenceData }) {
  const years = intel.yearComparison.slice(-3);
  if (years.length === 0) return <p className="text-sm text-text-muted">No year data</p>;
  const colors = ['#9ca3af', '#22d3ee', '#10b981', '#f59e0b', '#818cf8'];
  const maxKm = Math.max(...years.flatMap(y => y.months.map(mo => mo.cumulativeKm)), 1);
  return (
    <div>
      <div className="flex gap-3 mb-2 flex-wrap">
        {years.map((y, i) => (
          <span key={y.year} className="text-xs font-mono" style={{ color: colors[i % colors.length] }}>
            {y.year}: {y.totalKm.toFixed(0)} km ({y.totalRuns} runs)
          </span>
        ))}
      </div>
      <div className="h-20 flex gap-px">
        {Array.from({ length: 12 }, (_, m) => (
          <div key={m} className="flex-1 flex items-end gap-px h-full">
            {years.map((y, yi) => {
              const km = y.months[m]?.cumulativeKm ?? 0;
              const h = km > 0 ? Math.max((km / maxKm) * 100, 2) : 0;
              return <div key={y.year} className="flex-1 rounded-t self-end" style={{ height: `${h}%`, backgroundColor: colors[yi % colors.length], opacity: 0.8 }} />;
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-text-muted mt-1">
        {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => <span key={i}>{m}</span>)}
      </div>
    </div>
  );
}

// ── Distance Distribution ──
export function DistributionWidget({ intel }: { intel: IntelligenceData }) {
  const maxCount = Math.max(...intel.distribution.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {intel.distribution.map(d => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs w-16 text-text-muted">{d.label}</span>
          <div className="flex-1 h-2 rounded-full bg-bg overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(d.count / maxCount) * 100}%` }} />
          </div>
          <span className="text-xs font-mono w-8 text-right">{d.count}</span>
          <span className="text-[10px] text-text-muted w-10 text-right">{d.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Route Familiarity ──
export function RouteFamiliarityWidget({ intel }: { intel: IntelligenceData }) {
  if (intel.routes.length === 0) return <p className="text-sm text-text-muted">No route data</p>;
  return (
    <div className="space-y-2">
      {intel.routes.slice(0, 5).map(r => (
        <div key={r.location} className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{r.flag} {r.location}</span>
            <span className="text-xs text-text-muted ml-2">{r.count} runs</span>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-primary">{r.bestPace}</span>
            <span className={`text-[10px] ml-1 ${r.improvedSecs > 0 ? 'text-primary' : 'text-danger'}`}>{r.improvement}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Milestones ──
export function MilestonesWidget({ intel }: { intel: IntelligenceData }) {
  if (intel.milestones.length === 0) return <p className="text-sm text-text-muted">All milestones reached!</p>;
  return (
    <div className="space-y-3">
      {intel.milestones.slice(0, 3).map(m => (
        <div key={m.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">{m.label}</span>
            <span className="text-text-muted">{m.progress}% · ETA {m.estimatedDate}</span>
          </div>
          <div className="h-2 rounded-full bg-bg overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${m.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Weekly Challenge ──
export function WeeklyChallenge({ intel, lang }: { intel: IntelligenceData; lang: Lang }) {
  const { personality } = intel;
  const scores = personality.scores;
  // Find weakest trait
  const traits = [
    { name: t('dna.consistency', lang), score: scores.consistency, challenge: lang === 'ko' ? '이번 주 4회 이상 달리기' : 'Run 4+ times this week' },
    { name: t('dna.speed', lang), score: scores.speed, challenge: lang === 'ko' ? '이번 주 인터벌 1회' : '1 interval session this week' },
    { name: t('dna.endurance', lang), score: scores.endurance, challenge: lang === 'ko' ? '10km 이상 1회 달리기' : '1 run of 10km+' },
    { name: t('dna.variety', lang), score: scores.variety, challenge: lang === 'ko' ? '새로운 루트 달리기' : 'Run a new route' },
    { name: t('dna.volume', lang), score: scores.volume, challenge: lang === 'ko' ? '이번 주 30km 달성' : 'Hit 30km this week' },
  ];
  const weakest = traits.reduce((a, b) => a.score <= b.score ? a : b);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏅</span>
        <div>
          <p className="text-sm font-medium">{t('battle.challenge', lang)}</p>
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '약점 보완' : 'Weakness boost'}: {weakest.name} ({weakest.score}/5)</p>
        </div>
      </div>
      <div className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
        <p className="text-sm font-medium text-primary">{weakest.challenge}</p>
      </div>
    </div>
  );
}

// ── Run Heatmap (GitHub-style 52-week calendar) ──
export function RunHeatmap({ data }: { data: EnrichedRunData }) {
  // Build a map of date → total km (use dateFull ISO for YYYY-MM-DD key)
  const dayMap = new Map<string, number>();
  for (const run of data.runs) {
    const key = run.dateFull.slice(0, 10); // "2025-02-15T..." → "2025-02-15"
    dayMap.set(key, (dayMap.get(key) || 0) + run.distanceKm);
  }

  // Generate 52 weeks x 7 days grid (most recent Sunday → today)
  const today = new Date();
  const weeks: { date: string; km: number }[][] = [];

  // Go back 52 weeks, align to Sunday
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - startDay.getDay() - (52 * 7 - 1));

  let currentWeek: { date: string; km: number }[] = [];
  const cursor = new Date(startDay);

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    currentWeek.push({ date: key, km: dayMap.get(key) || 0 });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  // Max km for color scaling
  const allKms = weeks.flat().map(d => d.km);
  const maxKm = Math.max(...allKms, 1);

  function getColor(km: number): React.CSSProperties {
    if (km === 0) return { backgroundColor: 'var(--color-border)' };
    const intensity = Math.min(km / maxKm, 1);
    // Use opacity on primary color — works in all browsers
    if (intensity < 0.25) return { backgroundColor: 'var(--color-primary)', opacity: 0.2 };
    if (intensity < 0.5) return { backgroundColor: 'var(--color-primary)', opacity: 0.4 };
    if (intensity < 0.75) return { backgroundColor: 'var(--color-primary)', opacity: 0.7 };
    return { backgroundColor: 'var(--color-primary)', opacity: 1 };
  }

  const totalDaysRun = allKms.filter(k => k > 0).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-text-muted">{totalDaysRun} days in 52 weeks</span>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                className="w-[10px] h-[10px] rounded-[2px] transition-colors"
                style={getColor(day.km)}
                title={`${day.date}: ${day.km > 0 ? day.km.toFixed(1) + ' km' : 'Rest'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-text-muted">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map(i => (
          <div key={i} className="w-[10px] h-[10px] rounded-[2px]" style={getColor(i * maxKm)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Shared components ──
// ── Sparkline: tiny 40x16 SVG chart ──
function Sparkline({ data, color = 'var(--color-primary)' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 40, h = 16, pad = 1;
  const points = data.map((v, i) => `${pad + (i / (data.length - 1)) * (w - pad * 2)},${pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── AnimatedNumber: counts up from 0 ──
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

function Stat({ label, value, numericValue, sparkData, color }: {
  label: string;
  value: string;
  numericValue?: number;
  sparkData?: number[];
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold font-mono">
          {numericValue != null ? <AnimatedNumber value={numericValue} /> : value}
        </p>
        {sparkData && sparkData.length > 1 && <Sparkline data={sparkData} color={color} />}
      </div>
    </div>
  );
}

'use client';

import type { EnrichedRunData } from '@/lib/strava';
import type { IntelligenceData } from '@/lib/strava-analytics';
import { t, type Lang } from '@/lib/i18n';

// ── Stats Overview ──
export function StatsOverview({ data, lang }: { data: EnrichedRunData; lang: Lang }) {
  const { stats, locations } = data;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label={t('dash.totalRuns', lang)} value={stats.totalRuns.toString()} />
      <Stat label={t('dash.totalDist', lang)} value={`${stats.totalDistance} km`} />
      <Stat label={t('dash.avgPace', lang)} value={stats.avgPace} />
      <Stat label={t('dash.locations', lang)} value={locations.length.toString()} />
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
    { icon: '🏁', title: t('dash.planner', lang), href: '/planner', color: 'warm' },
    { icon: '📊', title: t('dash.report', lang), href: '/report', color: 'primary' },
    { icon: '🎁', title: t('dash.wrapped', lang), href: '/wrapped', color: 'accent' },
    { icon: '🎬', title: t('nav.film', lang), href: '/film', color: 'warm' },
    { icon: '👑', title: t('nav.segments', lang), href: '/segments', color: 'primary' },
    { icon: '👟', title: t('nav.shoes', lang), href: '/shoes', color: 'accent' },
    { icon: '⚔️', title: t('nav.battle', lang), href: '/battle', color: 'warm' },
    { icon: '🏁', title: t('nav.simulation', lang), href: '/simulation', color: 'primary' },
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

  const cx = 100, cy = 100, maxR = 75;
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
      <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
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
          const p = point(i, 6.5);
          return <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-text-muted">{label}</text>;
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
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-text-muted">{t('dna.acwr', lang)}</span>
        <span className="text-sm font-mono font-bold" style={{ color: trainingLoad.zoneColor }}>
          {trainingLoad.ratio.toFixed(2)} — {trainingLoad.zoneLabel}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-bg overflow-hidden relative">
        <div className="absolute inset-y-0 left-[40%] w-px bg-border" />
        <div className="absolute inset-y-0 left-[50%] w-px bg-border" />
        <div className="absolute inset-y-0 left-[65%] w-px bg-border" />
        <div className="absolute inset-y-0 left-[75%] w-px bg-border" />
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((trainingLoad.ratio / 2) * 100, 100)}%`, backgroundColor: trainingLoad.zoneColor }} />
      </div>
      <div className="flex justify-between text-[10px] text-text-muted mt-1">
        <span>0.0</span><span>0.8</span><span>1.0</span><span>1.3</span><span>1.5</span><span>2.0</span>
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

  const maxPace = Math.max(...points.map(p => p.avgPace));
  const minPace = Math.min(...points.map(p => p.avgPace));
  const range = maxPace - minPace || 1;

  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{intel.paceImprovement}</p>
      <div className="flex items-end gap-1 h-24">
        {points.map((p, i) => {
          const height = Math.max(((maxPace - p.avgPace) / range) * 100, 5);
          const isLast = i === points.length - 1;
          return (
            <div key={p.weekKey} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full relative h-full">
                <div className={`absolute bottom-0 w-full rounded-t ${isLast ? 'bg-primary' : 'bg-border'}`} style={{ height: `${height}%` }} />
              </div>
              {i % 3 === 0 && <span className="text-[8px] text-text-muted">{p.week.split(' ').pop()}</span>}
            </div>
          );
        })}
      </div>
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
  const colors = ['#9ca3af', '#22d3ee', '#10b981'];
  return (
    <div>
      <div className="flex gap-3 mb-2">
        {years.map((y, i) => (
          <span key={y.year} className="text-xs font-mono" style={{ color: colors[i] || 'var(--color-text)' }}>
            {y.year}: {y.totalKm.toFixed(0)} km ({y.totalRuns} runs)
          </span>
        ))}
      </div>
      <div className="h-20 flex items-end">
        {Array.from({ length: 12 }, (_, m) => {
          const maxKm = Math.max(...years.flatMap(y => y.months.map(mo => mo.cumulativeKm)), 1);
          return (
            <div key={m} className="flex-1 flex items-end gap-px">
              {years.map((y, yi) => {
                const km = y.months[m]?.cumulativeKm ?? 0;
                const h = (km / maxKm) * 100;
                return <div key={y.year} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: colors[yi] || 'var(--color-text)', opacity: 0.7 }} />;
              })}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-text-muted mt-1">
        {['J','F','M','A','M','J','J','A','S','O','N','D'].map(m => <span key={m}>{m}</span>)}
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

// ── Shared components ──
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import type { IntelligenceData } from '@/lib/strava-analytics';
import type { EnrichedRunData } from '@/lib/strava';

interface Props {
  userId: string;
  userName: string;
  avatarUrl: string | null;
}

interface WeekStats {
  distance: number;
  runs: number;
  avgPace: number; // secs per km
  totalTime: number; // seconds
  longestRun: number;
}

function getWeekStats(runs: EnrichedRunData['runs'], weeksAgo: number): WeekStats {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() - weeksAgo * 7);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const weekRuns = runs.filter(r => {
    const d = new Date(r.dateFull);
    return d >= startOfWeek && d < endOfWeek;
  });

  const distance = weekRuns.reduce((s, r) => s + r.distanceKm, 0);
  const totalTime = weekRuns.reduce((s, r) => s + r.timeSeconds, 0);
  const longestRun = weekRuns.reduce((m, r) => Math.max(m, r.distanceKm), 0);
  const avgPace = distance > 0 ? totalTime / distance : 0;

  return { distance, runs: weekRuns.length, avgPace, totalTime, longestRun };
}

function fmtPace(spk: number): string {
  if (!spk || !isFinite(spk) || spk <= 0) return '-';
  const m = Math.floor(spk / 60);
  const s = Math.round(spk % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pctChange(curr: number, prev: number): { value: string; positive: boolean } {
  if (prev === 0) return { value: curr > 0 ? '+100%' : '—', positive: curr > 0 };
  const pct = ((curr - prev) / prev) * 100;
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`,
    positive: pct >= 0,
  };
}

export default function ReportClient({ userName, avatarUrl }: Props) {
  const [data, setData] = useState<(IntelligenceData & { prs: any[] }) | null>(null);
  const [runData, setRunData] = useState<EnrichedRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 10, 90));
    }, 200);

    Promise.all([
      fetch('/api/strava/intelligence').then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
      fetch('/api/strava/data').then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
    ])
      .then(([intel, rd]) => {
        setData(intel);
        setRunData(rd);
        setProgress(100);
      })
      .catch(e => setError(e.message))
      .finally(() => {
        clearInterval(interval);
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-5xl mb-6 animate-bounce">📊</div>
        <p className="text-lg font-semibold mb-2">Generating Weekly Report...</p>
        <p className="text-sm text-text-muted mb-6">Crunching this week&apos;s numbers</p>
        <div className="w-64 h-2 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  if (error || !data || !runData) {
    return (
      <div className="text-center py-32">
        <p className="text-danger mb-4">Failed to generate report</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
          Retry
        </button>
      </div>
    );
  }

  const thisWeek = getWeekStats(runData.runs, 0);
  const lastWeek = getWeekStats(runData.runs, 1);
  const distChange = pctChange(thisWeek.distance, lastWeek.distance);
  const { trainingLoad, todaysPlan, paceTrend, personality, coachAdvice } = data;

  // Last 8 weeks for mini chart
  const recentTrend = paceTrend.slice(-8);
  const maxDist = Math.max(...recentTrend.map(p => p.distance), 1);

  const weekLabel = (() => {
    const now = new Date();
    const sun = new Date(now);
    sun.setDate(now.getDate() - now.getDay());
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${fmt(sun)} — ${fmt(sat)}`;
  })();

  return (
    <div>
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text mb-6 flex items-center gap-1 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </a>

      {/* Report Card */}
      <div ref={cardRef} className="rounded-2xl border border-border bg-surface overflow-hidden mb-6">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-primary/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">🏃</div>
            )}
            <div>
              <p className="text-sm font-bold">{userName}</p>
              <p className="text-xs text-text-muted">Weekly Running Report</p>
            </div>
          </div>
          <h1 className="text-xl font-bold">{weekLabel}</h1>
          <p className="text-xs text-text-muted mt-1">Personality: {personality.type}</p>
        </div>

        {/* This Week Stats */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div>
              <p className="text-xs text-text-muted">Distance</p>
              <p className="text-lg font-bold font-mono">{thisWeek.distance.toFixed(1)}<span className="text-xs font-normal text-text-muted ml-0.5">km</span></p>
              <p className={`text-[10px] font-medium ${distChange.positive ? 'text-primary' : 'text-danger'}`}>
                {distChange.value} vs last wk
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Runs</p>
              <p className="text-lg font-bold font-mono">{thisWeek.runs}</p>
              <p className="text-[10px] text-text-muted">{lastWeek.runs} last wk</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Avg Pace</p>
              <p className="text-lg font-bold font-mono">{fmtPace(thisWeek.avgPace)}</p>
              <p className="text-[10px] text-text-muted">{fmtPace(lastWeek.avgPace)} last wk</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Time</p>
              <p className="text-lg font-bold font-mono">{fmtDuration(thisWeek.totalTime)}</p>
              <p className="text-[10px] text-text-muted">{fmtDuration(lastWeek.totalTime)} last wk</p>
            </div>
          </div>

          {/* Training Load Gauge */}
          <div className="rounded-xl bg-bg p-4 mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Training Load (ACWR)</span>
              <span className="text-sm font-mono font-bold" style={{ color: trainingLoad.zoneColor }}>
                {trainingLoad.ratio.toFixed(2)} — {trainingLoad.zoneLabel}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-surface overflow-hidden relative">
              <div className="absolute inset-y-0 left-[40%] w-px bg-border" />
              <div className="absolute inset-y-0 left-[50%] w-px bg-border" />
              <div className="absolute inset-y-0 left-[65%] w-px bg-border" />
              <div className="absolute inset-y-0 left-[75%] w-px bg-border" />
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((trainingLoad.ratio / 2) * 100, 100)}%`,
                  backgroundColor: trainingLoad.zoneColor,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-text-muted mt-1">
              <span>Detraining</span>
              <span>Recovery</span>
              <span>Optimal</span>
              <span>Overreach</span>
              <span>Danger</span>
            </div>
          </div>

          {/* Volume Trend (mini bar chart) */}
          {recentTrend.length > 1 && (
            <div className="rounded-xl bg-bg p-4 mb-5">
              <p className="text-sm font-medium mb-3">8-Week Volume Trend</p>
              <div className="flex items-end gap-1.5 h-20">
                {recentTrend.map((w, i) => {
                  const isLast = i === recentTrend.length - 1;
                  const height = Math.max((w.distance / maxDist) * 100, 4);
                  return (
                    <div key={w.weekKey} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative" style={{ height: '100%' }}>
                        <div
                          className={`absolute bottom-0 w-full rounded-t ${isLast ? 'bg-primary' : 'bg-border'}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-[8px] text-text-muted truncate w-full text-center">
                        {w.week.split(' ').pop()}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-text-muted mt-1">
                <span>{recentTrend[0]?.distance.toFixed(0)} km</span>
                <span className="text-primary font-bold">{recentTrend[recentTrend.length - 1]?.distance.toFixed(0)} km</span>
              </div>
            </div>
          )}

          {/* Today's Plan */}
          <div className="rounded-xl bg-bg p-4 mb-5">
            <p className="text-sm font-medium mb-2">Today&apos;s Recommendation</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: todaysPlan.currentColor + '20' }}
              >
                {todaysPlan.recommended.type === 'best' ? '✅' :
                 todaysPlan.recommended.type === 'caution' ? '⚠️' :
                 todaysPlan.recommended.type === 'avoid' ? '🛑' : '👍'}
              </div>
              <div>
                <p className="text-sm font-medium">{todaysPlan.headline}</p>
                <p className="text-xs text-text-muted">
                  Safe max: {todaysPlan.safeMaxKm} km · Easy pace: {todaysPlan.easyPace}
                </p>
              </div>
            </div>
          </div>

          {/* Coach Advice */}
          {coachAdvice.length > 0 && (
            <div className="rounded-xl bg-bg p-4">
              <p className="text-sm font-medium mb-2">🤖 Coach Notes</p>
              <ul className="space-y-1.5">
                {coachAdvice.slice(0, 3).map((a, i) => (
                  <li key={i} className="text-xs text-text-muted flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Branding */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-between">
          <p className="text-[10px] text-text-muted">
            <span className="text-primary">🧬</span> RunDNA — AI Running Intelligence
          </p>
          <p className="text-[10px] text-text-muted font-mono">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <a
          href="/coach"
          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/30 hover:text-primary transition-all"
        >
          Chat with Coach
        </a>
        <a
          href="/dna"
          className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:border-accent/30 hover:text-accent transition-all"
        >
          View Full DNA
        </a>
      </div>
    </div>
  );
}

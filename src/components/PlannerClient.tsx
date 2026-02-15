'use client';

import { useState } from 'react';

interface Props {
  userId: string;
  userName: string;
}

interface DayPlan {
  day: string;
  type: 'easy' | 'tempo' | 'interval' | 'long' | 'rest' | 'cross';
  description: string;
  km: number;
}

interface WeekPlan {
  week: number;
  phase: string;
  totalKm: number;
  days: DayPlan[];
  notes: string;
}

interface PhaseSummary {
  name: string;
  weeks: string;
  focus: string;
  weeklyKm: string;
}

interface RaceDayPlan {
  strategy: string;
  targetPace: string;
  warmup: string;
  nutrition: string;
}

interface TrainingPlan {
  summary: string;
  totalWeeks: number;
  phases: PhaseSummary[];
  weeks: WeekPlan[];
  raceDay: RaceDayPlan;
  warnings: string[];
}

const RACE_OPTIONS = [
  { value: '5K', label: '5K', icon: '🏃' },
  { value: '10K', label: '10K', icon: '🏃‍♂️' },
  { value: 'Half Marathon', label: 'Half', icon: '🏅' },
  { value: 'Marathon', label: 'Full', icon: '🏆' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: 'bg-primary/15', text: 'text-primary', label: 'Easy' },
  tempo: { bg: 'bg-warm/15', text: 'text-warm', label: 'Tempo' },
  interval: { bg: 'bg-danger/15', text: 'text-danger', label: 'Interval' },
  long: { bg: 'bg-accent/15', text: 'text-accent', label: 'Long' },
  rest: { bg: 'bg-border/30', text: 'text-text-muted', label: 'Rest' },
  cross: { bg: 'bg-[#a78bfa]/15', text: 'text-[#a78bfa]', label: 'Cross' },
};

export default function PlannerClient({ userName }: Props) {
  const [step, setStep] = useState<'form' | 'loading' | 'result'>('form');
  const [raceDistance, setRaceDistance] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [raceGoal, setRaceGoal] = useState('');
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const minDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  async function generatePlan() {
    if (!raceDistance || !raceDate) return;

    setStep('loading');
    setError(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 6, 90));
    }, 300);

    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceDistance, raceDate, raceGoal }),
      });

      if (!res.ok) throw new Error('Failed to generate plan');
      const { plan: p } = await res.json();
      setPlan(p);
      setProgress(100);
      setTimeout(() => setStep('result'), 400);
    } catch {
      setError('Failed to generate your plan. Please try again.');
      setStep('form');
    } finally {
      clearInterval(interval);
    }
  }

  // ── Form ──
  if (step === 'form') {
    return (
      <div>
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text mb-6 flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </a>

        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🏁</div>
          <h1 className="text-2xl sm:text-3xl font-bold">Race Planner</h1>
          <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
            Tell us about your upcoming race and we&apos;ll create a personalized training plan based on your Strava data.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 max-w-lg mx-auto space-y-6">
          {/* Distance */}
          <div>
            <label className="block text-sm font-medium mb-3">Race Distance</label>
            <div className="grid grid-cols-4 gap-2">
              {RACE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRaceDistance(opt.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${
                    raceDistance === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Race Date</label>
            <input
              type="date"
              value={raceDate}
              min={minDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-primary"
            />
            {raceDate && (
              <p className="text-xs text-text-muted mt-1">
                {Math.round((new Date(raceDate).getTime() - Date.now()) / (7 * 86400000))} weeks away
              </p>
            )}
          </div>

          {/* Goal (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Goal <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={raceGoal}
              onChange={(e) => setRaceGoal(e.target.value)}
              placeholder="e.g. Sub 25 minutes, Finish without walking..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            onClick={generatePlan}
            disabled={!raceDistance || !raceDate}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            Generate My Plan
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-warm/30 animate-dna-spin" />
          <div className="absolute inset-3 rounded-full border-2 border-primary/30 animate-dna-spin" style={{ animationDirection: 'reverse', animationDuration: '15s' }} />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🏁</div>
        </div>
        <p className="text-lg font-semibold mb-2">Building your training plan...</p>
        <p className="text-sm text-text-muted mb-6">
          Analyzing {raceDistance} preparation for {userName.split(' ')[0]}
        </p>
        <div className="w-64 h-2 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full bg-warm transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  // ── Result ──
  if (!plan) return null;

  return (
    <div>
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text mb-6 flex items-center gap-1 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </a>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🏁</div>
        <h1 className="text-2xl font-bold">{raceDistance} Training Plan</h1>
        <p className="text-sm text-text-muted mt-1">{plan.totalWeeks} weeks · Race Day: {raceDate}</p>
        <p className="text-sm text-text-muted mt-2 max-w-lg mx-auto">{plan.summary}</p>
      </div>

      {/* Warnings */}
      {plan.warnings?.length > 0 && (
        <div className="rounded-xl border border-warm/30 bg-warm/5 p-4 mb-6">
          <p className="text-sm font-medium text-warm mb-2">⚠️ Heads Up</p>
          {plan.warnings.map((w, i) => (
            <p key={i} className="text-sm text-text-muted">{w}</p>
          ))}
        </div>
      )}

      {/* Phase Overview */}
      <div className="rounded-xl border border-border bg-surface p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3 text-text-muted uppercase tracking-wider">Training Phases</h2>
        <div className="space-y-3">
          {plan.phases?.map((phase, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{phase.name}</span>
                  <span className="text-xs text-text-muted">Wk {phase.weeks}</span>
                </div>
                <p className="text-xs text-text-muted">{phase.focus} · {phase.weeklyKm} km/wk</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Weekly Plan</h2>
        <div className="space-y-3">
          {plan.weeks?.map((week) => {
            const isExpanded = expandedWeek === week.week;
            return (
              <div key={week.week} className="rounded-xl border border-border bg-surface overflow-hidden">
                {/* Week header */}
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-warm/15 flex items-center justify-center text-warm text-xs font-bold shrink-0">
                      W{week.week}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{week.phase}</p>
                      <p className="text-xs text-text-muted">{week.totalKm} km total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mini km bar */}
                    <div className="hidden sm:block w-24 h-1.5 rounded-full bg-bg overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min((week.totalKm / (plan.weeks.reduce((m, w) => Math.max(m, w.totalKm), 0) || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <svg
                      className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Day details */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="divide-y divide-border">
                      {week.days?.map((day, di) => {
                        const style = TYPE_COLORS[day.type] || TYPE_COLORS.rest;
                        return (
                          <div key={di} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-xs font-medium text-text-muted w-8">{day.day}</span>
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                            <span className="text-sm flex-1">{day.description}</span>
                            {day.km > 0 && (
                              <span className="text-xs font-mono text-text-muted">{day.km}km</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {week.notes && (
                      <div className="px-4 py-2.5 bg-bg/50 text-xs text-text-muted">
                        💡 {week.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Race Day Strategy */}
      {plan.raceDay && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🏆 Race Day Strategy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-bg/50 p-3">
              <p className="text-xs text-text-muted mb-1">Pacing Strategy</p>
              <p className="text-sm">{plan.raceDay.strategy}</p>
            </div>
            <div className="rounded-lg bg-bg/50 p-3">
              <p className="text-xs text-text-muted mb-1">Target Pace</p>
              <p className="text-sm font-mono font-bold text-primary">{plan.raceDay.targetPace}</p>
            </div>
            <div className="rounded-lg bg-bg/50 p-3">
              <p className="text-xs text-text-muted mb-1">Warm-up</p>
              <p className="text-sm">{plan.raceDay.warmup}</p>
            </div>
            <div className="rounded-lg bg-bg/50 p-3">
              <p className="text-xs text-text-muted mb-1">Nutrition</p>
              <p className="text-sm">{plan.raceDay.nutrition}</p>
            </div>
          </div>
        </div>
      )}

      {/* New Plan button */}
      <div className="text-center">
        <button
          onClick={() => { setStep('form'); setPlan(null); setExpandedWeek(null); }}
          className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/30 hover:text-primary transition-all"
        >
          Create Another Plan
        </button>
      </div>
    </div>
  );
}

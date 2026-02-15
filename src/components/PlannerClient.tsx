'use client';

import { useState, useRef, useEffect } from 'react';
import { downloadCard } from '@/lib/share';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBanner from '@/components/AdBanner';

interface Props {
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
  const [lang] = useLang();
  const [step, setStep] = useState<'form' | 'loading' | 'result'>('form');
  const [raceDistance, setRaceDistance] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [raceGoal, setRaceGoal] = useState('');
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const minDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  useEffect(() => {
    fetch('/api/usage?feature=planner')
      .then(r => r.json())
      .then(d => setRemaining(d.remaining ?? 3))
      .catch(() => {});
  }, []);

  async function generatePlan() {
    if (!raceDistance || !raceDate) return;
    if (remaining !== null && remaining <= 0) {
      setError(lang === 'ko' ? '오늘 3회 플랜 생성을 모두 사용했습니다. UTC 자정에 초기화됩니다.' : "You've used all 3 plan generations today. Resets at midnight UTC.");
      return;
    }

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
        body: JSON.stringify({ raceDistance, raceDate, raceGoal, lang }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setRemaining(0);
        setError(data.message || 'Daily limit reached.');
        setStep('form');
        return;
      }
      if (!res.ok) throw new Error('Failed to generate plan');
      const { plan: p } = await res.json();
      setPlan(p);
      setProgress(100);
      if (remaining !== null) setRemaining(remaining - 1);
      setTimeout(() => setStep('result'), 400);
    } catch {
      setError(lang === 'ko' ? '플랜 생성에 실패했습니다. 다시 시도해주세요.' : 'Failed to generate your plan. Please try again.');
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
          {t('nav.back', lang)}
        </a>

        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🏁</div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('plan.title', lang)}</h1>
          <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">{t('plan.sub', lang)}</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 max-w-lg mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">{t('plan.distance', lang)}</label>
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

          <div>
            <label className="block text-sm font-medium mb-2">{t('plan.date', lang)}</label>
            <input
              type="date"
              value={raceDate}
              min={minDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-primary"
            />
            {raceDate && (
              <p className="text-xs text-text-muted mt-1">
                {Math.round((new Date(raceDate).getTime() - Date.now()) / (7 * 86400000))} {t('plan.weeksAway', lang)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('plan.goal', lang)} <span className="text-text-muted font-normal">({t('plan.goalHint', lang)})</span>
            </label>
            <input
              type="text"
              value={raceGoal}
              onChange={(e) => setRaceGoal(e.target.value)}
              placeholder={t('plan.goalPlaceholder', lang)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            onClick={generatePlan}
            disabled={!raceDistance || !raceDate || (remaining !== null && remaining <= 0)}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {remaining !== null && remaining <= 0 ? t('plan.limitReached', lang) : t('plan.generate', lang)}
          </button>
          {remaining !== null && (
            <p className="text-[10px] text-text-muted text-center mt-2">
              {remaining} {t('plan.remaining', lang)}
            </p>
          )}
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
        <p className="text-lg font-semibold mb-2">{t('plan.generating', lang)}</p>
        <p className="text-sm text-text-muted mb-6">
          {raceDistance} {t('plan.analyzing', lang)} {userName.split(' ')[0]}
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
        {t('nav.back', lang)}
      </a>

      {/* Shareable Plan Summary */}
      <div ref={shareRef} className="rounded-2xl border border-border bg-surface overflow-hidden mb-6">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🏁</div>
            <h1 className="text-2xl font-bold">{raceDistance} {t('plan.trainingPlan', lang)}</h1>
            <p className="text-sm text-text-muted mt-1">{plan.totalWeeks} weeks · Race Day: {raceDate}</p>
            <p className="text-sm text-text-muted mt-2 max-w-lg mx-auto">{plan.summary}</p>
          </div>

          {plan.warnings?.length > 0 && (
            <div className="rounded-xl border border-warm/30 bg-warm/5 p-4 mb-6">
              <p className="text-sm font-medium text-warm mb-2">⚠️ {t('plan.headsUp', lang)}</p>
              {plan.warnings.map((w, i) => (
                <p key={i} className="text-sm text-text-muted">{w}</p>
              ))}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3 text-text-muted uppercase tracking-wider">{t('plan.phases', lang)}</h2>
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

          {plan.raceDay && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
              <p className="text-sm font-semibold mb-2">🏆 {t('plan.raceDay', lang)}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-text-muted">{t('plan.pace', lang)}: </span><span className="font-mono font-bold text-primary">{plan.raceDay.targetPace}</span></div>
                <div><span className="text-text-muted">{t('plan.strategy', lang)}: </span>{plan.raceDay.strategy}</div>
              </div>
            </div>
          )}

          {plan.weeks?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-text-muted mb-2">{t('plan.weeklyVolume', lang)}</p>
              <div className="flex items-end gap-1 h-16">
                {plan.weeks.map((w) => {
                  const maxKm = plan.weeks.reduce((m, wk) => Math.max(m, wk.totalKm), 1);
                  return (
                    <div key={w.week} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t bg-primary/60"
                        style={{ height: `${Math.max((w.totalKm / maxKm) * 100, 4)}%` }}
                      />
                      <span className="text-[7px] text-text-muted">W{w.week}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-3 text-center">
            <p className="text-[10px] text-text-muted">
              <img src="/logo.png" alt="" className="inline w-4 h-4 rounded-sm align-text-bottom" /> RunDNA — AI Running Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Download Plan Card */}
      <div className="flex justify-center mb-6">
        <button
          onClick={async () => {
            if (!shareRef.current || saving) return;
            setSaving(true);
            try { await downloadCard(shareRef.current, `rundna-plan-${raceDistance.toLowerCase()}`); }
            finally { setSaving(false); }
          }}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {saving ? t('common.saving', lang) : t('plan.download', lang)}
        </button>
      </div>

      {/* Weekly Breakdown */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('plan.weeklyPlan', lang)}</h2>
        <div className="space-y-3">
          {plan.weeks?.map((week) => {
            const isExpanded = expandedWeek === week.week;
            return (
              <div key={week.week} className="rounded-xl border border-border bg-surface overflow-hidden">
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

      {/* Ad */}
      <AdBanner format="rectangle" className="mb-6" />

      <div className="text-center">
        <button
          onClick={() => { setStep('form'); setPlan(null); setExpandedWeek(null); }}
          className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/30 hover:text-primary transition-all"
        >
          {t('plan.another', lang)}
        </button>
      </div>
    </div>
  );
}

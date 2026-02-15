'use client';

import { useState, useEffect } from 'react';
import type { EnrichedRunData } from '@/lib/strava';
import type { IntelligenceData } from '@/lib/strava-analytics';
import { encodeDNA } from '@/lib/strava-analytics';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBreak from '@/components/AdBreak';

interface Props {
  userName: string;
  avatarUrl: string | null;
}

const TRAIT_COLORS = ['#10b981', '#22d3ee', '#818cf8', '#f59e0b', '#ef4444'];
const TRAIT_LABELS_EN = ['Consistency', 'Speed', 'Endurance', 'Variety', 'Volume'];
const TRAIT_LABELS_KO = ['일관성', '속도', '지구력', '다양성', '볼륨'];

export default function StoryClient({ userName, avatarUrl }: Props) {
  const [lang] = useLang();
  const [runData, setRunData] = useState<EnrichedRunData | null>(null);
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 6, 90));
    }, 200);

    Promise.all([
      fetch('/api/strava/data').then(r => r.ok ? r.json() : null),
      fetch('/api/strava/intelligence').then(r => r.ok ? r.json() : null),
    ])
      .then(([rd, id]) => {
        setRunData(rd);
        setIntel(id);
        setProgress(100);
      })
      .finally(() => {
        clearInterval(interval);
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-dna-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">📖</div>
        </div>
        <div className="w-48 h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-text-muted mt-3">{t('story.loading', lang)}</p>
      </div>
    );
  }

  if (!runData || !intel) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <span className="text-5xl mb-4">📖</span>
        <p className="text-text-muted">{t('story.noData', lang)}</p>
      </div>
    );
  }

  const { runs, stats, prs } = runData;
  const firstRun = runs.length > 0 ? runs[runs.length - 1] : null;
  const { personality, totalRuns, totalKm } = intel;
  const scores = personality.scores;
  const dnaCode = encodeDNA(scores);
  const traitLabels = lang === 'ko' ? TRAIT_LABELS_KO : TRAIT_LABELS_EN;
  const traitValues = [scores.consistency, scores.speed, scores.endurance, scores.variety, scores.volume];
  const totalHours = Math.round(runs.reduce((s, r) => s + r.timeSeconds, 0) / 3600);

  // Find PRs
  const pr5k = prs.find(p => p.label.includes('5K') || p.label.includes('5k'));
  const pr10k = prs.find(p => p.label.includes('10K') || p.label.includes('10k'));
  const longestRun = runs.length > 0 ? runs.reduce((a, b) => a.distanceKm > b.distanceKm ? a : b) : null;

  return (
    <div className="space-y-0">
      {/* ── Chapter 1: The Origin ── */}
      <section className="px-6 py-20 sm:py-28 text-center animate-fade-in-up">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Chapter 1</p>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">{t('story.ch1', lang)}</h2>
        <p className="text-text-muted text-lg mb-12">{t('story.ch1sub', lang)}</p>

        {firstRun && (
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-surface p-8">
            <p className="text-xs uppercase tracking-wider text-text-muted mb-4">{t('story.firstRun', lang)}</p>
            <p className="text-4xl font-mono font-bold text-primary mb-2">{firstRun.distance}</p>
            <p className="text-sm text-text-muted">{firstRun.dateFull}</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-text-muted">
              <span>{firstRun.time}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{firstRun.pace}/km</span>
              {firstRun.location && (
                <>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{firstRun.locationFlag} {firstRun.location}</span>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Chapter 2: The Journey ── */}
      <section className="px-6 py-20 sm:py-28 border-t border-border/50">
        <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">Chapter 2</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">{t('story.ch2', lang)}</h2>
          <p className="text-text-muted text-lg mb-16">{t('story.ch2sub', lang)}</p>

          <div className="grid grid-cols-3 gap-6 sm:gap-12">
            <div>
              <p className="text-4xl sm:text-[56px] font-mono font-bold text-primary leading-none">
                {Math.round(totalKm).toLocaleString()}
              </p>
              <p className="text-xs uppercase tracking-wider text-text-muted mt-2">km</p>
            </div>
            <div>
              <p className="text-4xl sm:text-[56px] font-mono font-bold text-accent leading-none">
                {totalRuns.toLocaleString()}
              </p>
              <p className="text-xs uppercase tracking-wider text-text-muted mt-2">{t('story.totalRuns', lang)}</p>
            </div>
            <div>
              <p className="text-4xl sm:text-[56px] font-mono font-bold text-warm leading-none">
                {totalHours}
              </p>
              <p className="text-xs uppercase tracking-wider text-text-muted mt-2">{t('story.totalHours', lang)}</p>
            </div>
          </div>

          {/* Monthly volume bars */}
          {runData.monthlyVolume.length > 0 && (
            <div className="mt-16">
              <div className="flex items-end justify-center gap-1 h-32">
                {runData.monthlyVolume.slice(-12).map((m, i) => {
                  const max = Math.max(...runData.monthlyVolume.slice(-12).map(v => v.km));
                  const h = max > 0 ? (m.km / max) * 100 : 0;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1 max-w-[40px]">
                      <div
                        className="w-full rounded-t bg-primary/60 transition-all duration-500"
                        style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }}
                      />
                      <span className="text-[9px] text-text-muted">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <AdBreak />

      {/* ── Chapter 3: The DNA ── */}
      <section className="px-6 py-20 sm:py-28 border-t border-border/50">
        <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Chapter 3</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">{t('story.ch3', lang)}</h2>
          <p className="text-text-muted text-lg mb-12">{t('story.ch3sub', lang)}</p>

          {/* Personality type */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 mb-12">
            <p className="text-5xl mb-3">{personality.type.split(' ')[0]}</p>
            <h3 className="text-2xl font-bold mb-2">{personality.type}</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">{personality.description}</p>
            <p className="text-xs font-mono text-primary mt-4">{dnaCode} &middot; Top {personality.percentile}%</p>
          </div>

          {/* Trait bars */}
          <div className="space-y-4 max-w-md mx-auto text-left">
            {traitLabels.map((label, i) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{label}</span>
                  <span className="font-mono text-text-muted">{traitValues[i]}/5</span>
                </div>
                <div className="h-2.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(traitValues[i] / 5) * 100}%`,
                      backgroundColor: TRAIT_COLORS[i],
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chapter 4: The Records ── */}
      <section className="px-6 py-20 sm:py-28 border-t border-border/50">
        <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-warm mb-4">Chapter 4</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">{t('story.ch4', lang)}</h2>
          <p className="text-text-muted text-lg mb-16">{t('story.ch4sub', lang)}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {pr5k && (
              <div className="rounded-2xl border border-border bg-surface p-6">
                <p className="text-xs uppercase tracking-wider text-text-muted mb-2">{t('story.fastest5k', lang)}</p>
                <p className="text-3xl font-mono font-bold text-primary">{pr5k.time}</p>
                <p className="text-xs text-text-muted mt-1">{pr5k.pace}/km &middot; {pr5k.date}</p>
              </div>
            )}
            {pr10k && (
              <div className="rounded-2xl border border-border bg-surface p-6">
                <p className="text-xs uppercase tracking-wider text-text-muted mb-2">{t('story.fastest10k', lang)}</p>
                <p className="text-3xl font-mono font-bold text-accent">{pr10k.time}</p>
                <p className="text-xs text-text-muted mt-1">{pr10k.pace}/km &middot; {pr10k.date}</p>
              </div>
            )}
            {longestRun && (
              <div className="rounded-2xl border border-border bg-surface p-6">
                <p className="text-xs uppercase tracking-wider text-text-muted mb-2">{t('story.longestRun', lang)}</p>
                <p className="text-3xl font-mono font-bold text-warm">{longestRun.distance}</p>
                <p className="text-xs text-text-muted mt-1">{longestRun.pace}/km &middot; {longestRun.dateFull}</p>
              </div>
            )}
          </div>

          {/* All PRs */}
          {prs.length > 3 && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {prs.filter(p => p !== pr5k && p !== pr10k).slice(0, 4).map(pr => (
                <div key={pr.label} className="rounded-xl border border-border bg-surface p-4 text-left">
                  <p className="text-xs text-text-muted mb-1">{pr.label}</p>
                  <p className="text-lg font-mono font-bold">{pr.time}</p>
                  <p className="text-[10px] text-text-muted">{pr.pace}/km</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AdBreak />

      {/* ── Chapter 5: The Future ── */}
      <section className="px-6 py-20 sm:py-28 border-t border-border/50">
        <div className="mx-auto max-w-3xl text-center animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Chapter 5</p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">{t('story.ch5', lang)}</h2>
          <p className="text-text-muted text-lg mb-12">{t('story.ch5sub', lang)}</p>

          {/* Race predictions */}
          {intel.racePredictions.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {intel.racePredictions.map(rp => (
                <div key={rp.label} className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs text-text-muted mb-1">{rp.label}</p>
                  <p className="text-xl font-mono font-bold text-primary">{rp.time}</p>
                </div>
              ))}
            </div>
          )}

          {/* Coach advice */}
          {intel.coachAdvice.length > 0 && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-left max-w-lg mx-auto mb-12">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">AI Coach</p>
              <ul className="space-y-2">
                {intel.coachAdvice.slice(0, 3).map((a, i) => (
                  <li key={i} className="text-sm text-text-muted flex gap-2">
                    <span className="text-primary shrink-0">-</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/dashboard"
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors"
            >
              {t('story.explore', lang)}
            </a>
            <a
              href="/dna"
              className="px-6 py-3 rounded-xl border border-border hover:border-primary/30 font-semibold transition-colors"
            >
              {t('report.viewDNA', lang)}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

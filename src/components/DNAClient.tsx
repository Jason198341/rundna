'use client';

import { useState, useEffect, useRef } from 'react';
import type { IntelligenceData } from '@/lib/strava-analytics';
import { downloadCard } from '@/lib/share';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';

interface Props {
  userName: string;
}

const TRAIT_KEYS = ['dna.consistency', 'dna.speed', 'dna.endurance', 'dna.variety', 'dna.volume'];
const TRAIT_COLORS = ['#10b981', '#22d3ee', '#818cf8', '#f59e0b', '#ef4444'];
const TRAIT_ICONS = ['📅', '⚡', '🏔️', '🗺️', '📈'];

export default function DNAClient({ userName }: Props) {
  const [lang] = useLang();
  const [data, setData] = useState<IntelligenceData & { prs: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 8, 90));
    }, 200);

    fetch('/api/strava/intelligence')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => {
        setData(d);
        setProgress(100);
        setTimeout(() => setRevealed(true), 600);
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        clearInterval(interval);
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-dna-spin" />
          <div className="absolute inset-3 rounded-full border-2 border-accent/30 animate-dna-spin" style={{ animationDirection: 'reverse', animationDuration: '15s' }} />
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🧬</div>
        </div>
        <p className="text-lg font-semibold mb-2">{t('dna.loading', lang)}</p>
        <p className="text-sm text-text-muted mb-6">
          {progress > 50 ? t('dna.loadingPatterns', lang) : t('dna.loadingActivities', lang)}
        </p>
        <div className="w-64 h-2 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-32">
        <p className="text-danger mb-4">{t('dna.failed', lang)}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
          {t('common.retry', lang)}
        </button>
      </div>
    );
  }

  const { personality, trainingLoad, racePredictions, recovery, totalRuns, totalKm } = data;
  const scores = personality.scores;
  const scoreArr = [scores.consistency, scores.speed, scores.endurance, scores.variety, scores.volume];
  const traitLabels = TRAIT_KEYS.map((k) => t(k, lang));

  return (
    <div>
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text mb-6 flex items-center gap-1 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('nav.back', lang)}
      </a>

      {/* DNA Result Card */}
      <div ref={cardRef} className={`rounded-2xl border border-border bg-surface p-6 sm:p-8 mb-6 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧬</div>
          <p className="text-sm text-text-muted mb-2">{userName}&apos;s {t('dna.title', lang)}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">{personality.type}</h1>
          <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">{personality.description}</p>
        </div>

        {/* Radar Chart */}
        <div className="flex justify-center mb-8">
          <RadarChart scores={scoreArr} labels={traitLabels} />
        </div>

        {/* Trait Bars */}
        <div className="space-y-3 mb-8">
          {traitLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center">{TRAIT_ICONS[i]}</span>
              <span className="text-sm font-medium w-24">{label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: revealed ? `${(scoreArr[i] / 5) * 100}%` : '0%',
                    backgroundColor: TRAIT_COLORS[i],
                    transitionDelay: `${i * 150}ms`,
                  }}
                />
              </div>
              <span className="text-sm font-mono font-bold w-6 text-right" style={{ color: TRAIT_COLORS[i] }}>
                {scoreArr[i]}
              </span>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <MiniStat label={t('dna.totalRuns', lang)} value={totalRuns.toString()} />
          <MiniStat label={t('dna.totalKm', lang)} value={totalKm.toFixed(0)} />
          <MiniStat label="ACWR" value={trainingLoad.ratio.toFixed(2)} color={trainingLoad.zoneColor} />
        </div>

        {/* Race Predictions */}
        {racePredictions.length > 0 && (
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold mb-3">{t('dna.predictions', lang)}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {racePredictions.map((rp) => (
                <div key={rp.label} className="rounded-lg bg-bg p-3 text-center">
                  <p className="text-xs text-text-muted">{rp.label}</p>
                  <p className="text-sm font-bold font-mono text-accent">{rp.time}</p>
                  <p className="text-[10px] text-text-muted">{rp.pace}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recovery */}
        <div className="border-t border-border pt-5 mt-5">
          <h3 className="text-sm font-semibold mb-3">{t('dna.recovery', lang)}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniStat label={t('dna.avgRest', lang)} value={`${recovery.avgRestDays}d`} />
            <MiniStat label={t('dna.afterHard', lang)} value={`${recovery.avgRestAfterHard}d`} />
            <MiniStat label={t('dna.longestStreak', lang)} value={`${recovery.longestStreak}d`} />
            <MiniStat label={t('dna.longestRest', lang)} value={`${recovery.longestRest}d`} />
          </div>
        </div>

        {/* Branding */}
        <div className="border-t border-border pt-4 mt-6 text-center">
          <p className="text-xs text-text-muted">
            <img src="/logo.png" alt="" className="inline w-4 h-4 rounded-sm align-text-bottom" /> RunDNA — AI Running Intelligence
          </p>
        </div>
      </div>

      {/* Share Button */}
      <div className={`flex justify-center mb-6 transition-all duration-700 delay-200 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        <ShareButton
          targetRef={cardRef}
          filename={`rundna-${userName.replace(/\s+/g, '-').toLowerCase()}`}
          label={t('dna.download', lang)}
          savingLabel={t('common.saving', lang)}
        />
      </div>

      {/* Training Load Detail */}
      <div className={`rounded-xl border border-border bg-surface p-5 mb-6 transition-all duration-700 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="text-lg font-semibold mb-4">{t('dna.trainingLoad', lang)}</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-muted">{t('dna.acwr', lang)}</span>
              <span className="font-mono font-bold" style={{ color: trainingLoad.zoneColor }}>
                {trainingLoad.ratio.toFixed(2)} — {trainingLoad.zoneLabel}
              </span>
            </div>
            <div className="h-3 rounded-full bg-bg overflow-hidden relative">
              <div className="absolute inset-y-0 left-[40%] w-px bg-border" />
              <div className="absolute inset-y-0 left-[50%] w-px bg-border" />
              <div className="absolute inset-y-0 left-[65%] w-px bg-border" />
              <div className="absolute inset-y-0 left-[75%] w-px bg-border" />
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min((trainingLoad.ratio / 2) * 100, 100)}%`,
                  backgroundColor: trainingLoad.zoneColor,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>0.0</span><span>0.8</span><span>1.0</span><span>1.3</span><span>1.5</span><span>2.0</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-bg p-3">
            <p className="text-xs text-text-muted">{t('dna.acute', lang)}</p>
            <p className="text-lg font-bold font-mono">{trainingLoad.acute.toFixed(0)}</p>
          </div>
          <div className="rounded-lg bg-bg p-3">
            <p className="text-xs text-text-muted">{t('dna.chronic', lang)}</p>
            <p className="text-lg font-bold font-mono">{trainingLoad.chronic.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Coach Advice */}
      {data.coachAdvice.length > 0 && (
        <div className={`rounded-xl border border-border bg-surface p-5 mb-6 transition-all duration-700 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>🤖</span> {t('dna.coachSays', lang)}
          </h2>
          <ul className="space-y-2">
            {data.coachAdvice.map((advice, i) => (
              <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5">•</span>
                {advice}
              </li>
            ))}
          </ul>
          <a href="/coach" className="inline-block mt-4 text-sm text-primary hover:text-primary-hover transition-colors">
            {t('dna.chatCoach', lang)} →
          </a>
        </div>
      )}
    </div>
  );
}

// ── Radar Chart (SVG) ──

function RadarChart({ scores, labels }: { scores: number[]; labels: string[] }) {
  const cx = 120, cy = 120, maxR = 90;
  const n = 5;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  function point(i: number, val: number) {
    const angle = startAngle + i * angleStep;
    const r = (val / 5) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const gridLevels = [1, 2, 3, 4, 5];
  const dataPoints = scores.map((s, i) => point(i, s));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg width="240" height="240" viewBox="0 0 240 240">
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => point(i, level));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="#1e2a3a" strokeWidth={level === 5 ? 1.5 : 0.5} />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const p = point(i, 5);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1e2a3a" strokeWidth={0.5} />;
      })}
      <path d={dataPath} fill="#10b98125" stroke="#10b981" strokeWidth={2} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={TRAIT_COLORS[i]} />
      ))}
      {labels.map((label, i) => {
        const p = point(i, 6.2);
        return (
          <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[11px] fill-text-muted">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-bg p-3 text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-bold font-mono" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

function ShareButton({ targetRef, filename, label, savingLabel }: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  label: string;
  savingLabel: string;
}) {
  const [saving, setSaving] = useState(false);

  async function handleDownload() {
    if (!targetRef.current || saving) return;
    setSaving(true);
    try {
      await downloadCard(targetRef.current, filename);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {saving ? savingLabel : label}
    </button>
  );
}

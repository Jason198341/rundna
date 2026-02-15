'use client';

import { useState, useEffect } from 'react';
import type { EnrichedRunData } from '@/lib/strava';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBanner from '@/components/AdBanner';

interface Props {
  userName: string;
}

export default function DashboardClient({ userName }: Props) {
  const [lang] = useLang();
  const [data, setData] = useState<EnrichedRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 200);

    fetch('/api/strava/data')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => {
        setData(d);
        setProgress(100);
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
        <div className="text-5xl mb-6 animate-bounce">🏃</div>
        <p className="text-lg font-semibold mb-2">{t('dash.loading', lang)}</p>
        <p className="text-sm text-text-muted mb-6">{t('dash.loadingSub', lang)}</p>
        <div className="w-64 h-2 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2 font-mono">{Math.round(progress)}%</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <p className="text-danger text-lg mb-2">{t('common.error', lang)}</p>
        <p className="text-text-muted text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
        >
          {t('common.retry', lang)}
        </button>
      </div>
    );
  }

  if (!data || data.runs.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl mb-2">🏃‍♂️</p>
        <p className="text-lg font-semibold">{t('common.noRuns', lang)}</p>
        <p className="text-sm text-text-muted mt-2">{t('dash.noRunsSub', lang)}</p>
      </div>
    );
  }

  const { runs, stats, prs } = data;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {t('dash.welcome', lang)} {userName.split(' ')[0]}
        </h1>
        <p className="text-text-muted mt-1">{t('dash.overview', lang)}</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('dash.totalRuns', lang)} value={stats.totalRuns.toString()} />
        <StatCard label={t('dash.totalDist', lang)} value={`${stats.totalDistance} km`} />
        <StatCard label={t('dash.avgPace', lang)} value={stats.avgPace} />
        <StatCard label={t('dash.locations', lang)} value={data.locations.length.toString()} />
      </div>

      {/* Personal Records */}
      {prs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">{t('dash.prs', lang)}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {prs.map((pr) => (
              <div key={pr.label} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-text-muted mb-1">{pr.label}</p>
                <p className="text-lg font-bold text-primary font-mono">{pr.time}</p>
                <p className="text-xs text-text-muted">{pr.pace} · {pr.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <FeatureCard icon="🧬" title={t('dash.dna', lang)} desc={t('dash.dnaDesc', lang)} href="/dna" color="primary" />
        <FeatureCard icon="🤖" title={t('dash.coach', lang)} desc={t('dash.coachDesc', lang)} href="/coach" color="accent" />
        <FeatureCard icon="🏁" title={t('dash.planner', lang)} desc={t('dash.plannerDesc', lang)} href="/planner" color="warm" />
        <FeatureCard icon="📊" title={t('dash.report', lang)} desc={t('dash.reportDesc', lang)} href="/report" color="primary" />
        <FeatureCard icon="🎁" title={t('dash.wrapped', lang)} desc={t('dash.wrappedDesc', lang)} href="/wrapped" color="accent" />
      </div>

      {/* Ad */}
      <AdBanner format="horizontal" />

      {/* Recent Activities */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('dash.recent', lang)}</h2>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-text-muted uppercase tracking-wider">
            <span>{t('dash.activity', lang)}</span>
            <span className="w-16 sm:w-20 text-right">{t('dash.distance', lang)}</span>
            <span className="w-16 sm:w-20 text-right hidden sm:block">{t('dash.pace', lang)}</span>
            <span className="w-16 sm:w-20 text-right">{t('dash.time', lang)}</span>
          </div>
          {runs.slice(0, 15).map((r, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 text-sm ${
                i < Math.min(runs.length, 15) - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-xs text-text-muted truncate">{r.date} · {r.locationFlag} {r.location}</p>
              </div>
              <span className="w-16 sm:w-20 text-right font-mono text-text-muted">{r.distance}</span>
              <span className="w-16 sm:w-20 text-right font-mono text-text-muted hidden sm:block">{r.pace}</span>
              <span className="w-16 sm:w-20 text-right font-mono text-text-muted">{r.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold font-mono">{value}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc, href, color }: {
  icon: string; title: string; desc: string; href: string; color: string;
}) {
  return (
    <a
      href={href}
      className="rounded-xl border border-border bg-surface p-5 hover:border-primary/30 transition-all group block"
    >
      <span className="text-2xl mb-2 block">{icon}</span>
      <h3 className={`font-semibold mb-1 transition-colors ${
        color === 'primary' ? 'text-primary group-hover:text-primary-hover' :
        color === 'accent' ? 'text-accent group-hover:text-accent' :
        color === 'warm' ? 'text-warm group-hover:text-warm' : 'text-primary group-hover:text-primary-hover'
      }`}>
        {title}
      </h3>
      <p className="text-sm text-text-muted">{desc}</p>
    </a>
  );
}

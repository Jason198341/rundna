'use client';

import { useState, useEffect } from 'react';
import type { EnrichedRunData } from '@/lib/strava';

interface Props {
  userName: string;
}

export default function DashboardClient({ userName }: Props) {
  const [data, setData] = useState<EnrichedRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animated progress bar
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
        <p className="text-lg font-semibold mb-2">Analyzing your runs...</p>
        <p className="text-sm text-text-muted mb-6">Fetching data from Strava</p>
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
        <p className="text-danger text-lg mb-2">Failed to load data</p>
        <p className="text-text-muted text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.runs.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl mb-2">🏃‍♂️</p>
        <p className="text-lg font-semibold">No runs found</p>
        <p className="text-sm text-text-muted mt-2">
          Start running with Strava and come back to see your DNA!
        </p>
      </div>
    );
  }

  const { runs, stats, prs } = data;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome back, {userName.split(' ')[0]}
        </h1>
        <p className="text-text-muted mt-1">Here&apos;s your running overview</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Runs" value={stats.totalRuns.toString()} />
        <StatCard label="Total Distance" value={`${stats.totalDistance} km`} />
        <StatCard label="Avg Pace" value={stats.avgPace} />
        <StatCard label="Locations" value={data.locations.length.toString()} />
      </div>

      {/* Personal Records */}
      {prs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Personal Records</h2>
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

      {/* Feature Cards — coming soon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <FeatureCard
          icon="🧬"
          title="Your Running DNA"
          desc="Discover your 5-axis runner personality"
          href="/dna"
          color="primary"
        />
        <FeatureCard
          icon="🤖"
          title="AI Coach"
          desc="Chat with your personal running coach"
          href="/coach"
          color="accent"
        />
        <FeatureCard
          icon="🏁"
          title="Race Planner"
          desc="Get an AI-generated training plan"
          href="/planner"
          color="warm"
        />
        <FeatureCard
          icon="📊"
          title="Weekly Report"
          desc="Your shareable weekly running card"
          href="/report"
          color="primary"
        />
      </div>

      {/* Recent Activities */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Runs</h2>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-text-muted uppercase tracking-wider">
            <span>Activity</span>
            <span className="w-20 text-right">Distance</span>
            <span className="w-20 text-right hidden sm:block">Pace</span>
            <span className="w-20 text-right">Time</span>
          </div>
          {runs.slice(0, 15).map((r, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 text-sm ${
                i < Math.min(runs.length, 15) - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-xs text-text-muted">{r.date} · {r.locationFlag} {r.location}</p>
              </div>
              <span className="w-20 text-right font-mono text-text-muted">{r.distance}</span>
              <span className="w-20 text-right font-mono text-text-muted hidden sm:block">{r.pace}</span>
              <span className="w-20 text-right font-mono text-text-muted">{r.time}</span>
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
      <h3 className={`font-semibold mb-1 text-${color} group-hover:text-${color}-hover transition-colors`}>
        {title}
      </h3>
      <p className="text-sm text-text-muted">{desc}</p>
    </a>
  );
}

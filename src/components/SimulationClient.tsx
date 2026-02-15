'use client';

import { useState, useEffect } from 'react';
import type { IntelligenceData } from '@/lib/strava-analytics';
import { simulateRace, type RaceSimulation } from '@/lib/strava-extended';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPace(secsPerKm: number): string {
  if (!secsPerKm || secsPerKm <= 0) return '--:--';
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const DISTANCES = [
  { label: '5K', meters: 5000 },
  { label: '10K', meters: 10000 },
  { label: 'Half', meters: 21097 },
  { label: 'Full', meters: 42195 },
];

export default function SimulationClient() {
  const [lang] = useLang();
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDist, setSelectedDist] = useState(0); // index into DISTANCES
  const [sim, setSim] = useState<RaceSimulation | null>(null);
  const [activeStrategy, setActiveStrategy] = useState(1); // 0=conservative, 1=even, 2=aggressive

  useEffect(() => {
    fetch('/api/strava/intelligence')
      .then(r => r.json())
      .then(d => { setIntel(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const runSimulation = (distIdx: number) => {
    if (!intel || intel.racePredictions.length === 0) return;
    setSelectedDist(distIdx);

    // Use best recent pace as base
    const bestPrediction = intel.racePredictions[0];
    // Parse pace string like "5:30 /km" → seconds
    const paceParts = bestPrediction.pace.replace(' /km', '').split(':');
    const basePace = parseInt(paceParts[0]) * 60 + parseInt(paceParts[1] || '0');

    // Average HR from training load data
    const avgHR = 155; // Default assumption

    const result = simulateRace(DISTANCES[distIdx].meters, basePace, avgHR);
    setSim(result);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-5xl mb-4 animate-bounce">🏁</div>
        <p className="text-base font-semibold">{t('dash.loading', lang)}</p>
      </div>
    );
  }

  if (!intel) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl mb-2">🏁</p>
        <p className="text-lg font-semibold">{t('common.noRuns', lang)}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🏁 {t('widget.raceSimulation', lang)}</h1>
        <p className="text-text-muted text-sm mt-1">{t('twin.simulate', lang)}</p>
      </div>

      {/* Distance selector */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {DISTANCES.map((d, i) => (
          <button
            key={d.label}
            onClick={() => runSimulation(i)}
            className={`py-3 rounded-xl border text-center transition-all ${
              selectedDist === i && sim
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface hover:border-primary/30'
            }`}
          >
            <p className="text-lg font-bold">{d.label}</p>
            <p className="text-[10px] text-text-muted">{(d.meters / 1000).toFixed(1)} km</p>
          </button>
        ))}
      </div>

      {!sim && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-3xl mb-3">🏁</p>
          <p className="text-sm text-text-muted">
            {lang === 'ko' ? '거리를 선택하면 레이스를 시뮬레이션합니다' : 'Pick a distance to simulate your race'}
          </p>
        </div>
      )}

      {sim && (
        <>
          {/* Predicted finish */}
          <div className="rounded-2xl border border-primary/20 bg-surface p-5 mb-4 text-center">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">{t('twin.predicted', lang)}</p>
            <p className="text-4xl font-bold font-mono text-primary">{formatTime(sim.predictedTime)}</p>
            <p className="text-sm text-text-muted mt-1">{sim.targetName}</p>
          </div>

          {/* Strategy selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {sim.scenarios.map((sc, i) => (
              <button
                key={sc.strategy}
                onClick={() => setActiveStrategy(i)}
                className={`py-3 rounded-xl border text-center transition-all ${
                  activeStrategy === i
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface hover:border-primary/30'
                }`}
              >
                <p className="text-xs font-bold">
                  {sc.strategy === 'conservative' ? t('twin.conservative', lang)
                    : sc.strategy === 'even' ? t('twin.even', lang)
                    : t('twin.aggressive', lang)}
                </p>
                <p className="text-sm font-bold font-mono mt-1">{formatTime(sc.totalTime)}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{sc.riskLevel}</p>
              </button>
            ))}
          </div>

          {/* Pacing Card */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-bold flex items-center gap-2">📋 {t('twin.paceCard', lang)}</h2>
            </div>
            <div className="divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-5 px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                <span>KM</span>
                <span>{t('dash.pace', lang)}</span>
                <span>HR</span>
                <span>⛰️</span>
                <span>{t('dash.time', lang)}</span>
              </div>
              {sim.splits.map(split => {
                const stratPace = sim.scenarios[activeStrategy].splits[split.km - 1] || split.pace;
                return (
                  <div key={split.km} className="grid grid-cols-5 px-4 py-2 text-xs">
                    <span className="font-bold">{split.km}</span>
                    <span className="font-mono text-primary">{formatPace(stratPace)}</span>
                    <span className="font-mono text-danger">{split.projectedHR}</span>
                    <span className="font-mono text-text-muted">{split.elevationDelta > 0 ? '+' : ''}{split.elevationDelta}m</span>
                    <span className="font-mono text-text-muted">{formatTime(split.cumulativeTime)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-[10px] text-text-muted">{lang === 'ko' ? '평균 페이스' : 'Avg Pace'}</p>
              <p className="text-sm font-bold font-mono text-primary">
                {formatPace(sim.scenarios[activeStrategy].totalTime / Math.ceil(sim.targetDistance / 1000))}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-[10px] text-text-muted">{lang === 'ko' ? '총 거리' : 'Distance'}</p>
              <p className="text-sm font-bold font-mono">{(sim.targetDistance / 1000).toFixed(1)} km</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-[10px] text-text-muted">{lang === 'ko' ? '완주 시간' : 'Finish'}</p>
              <p className="text-sm font-bold font-mono text-accent">{formatTime(sim.scenarios[activeStrategy].totalTime)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

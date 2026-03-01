'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { EnrichedRunData } from '@/lib/strava';
import type { ActivityStream, StreamPoint } from '@/lib/strava-extended';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBreak from '@/components/AdBreak';
import { safeFetch } from '@/lib/api-error';

// ── Mercator projection ──
function projectPoints(points: StreamPoint[], width: number, height: number, padding = 40) {
  if (points.length === 0) return [];

  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const drawW = width - padding * 2;
  const drawH = height - padding * 2;
  const scale = Math.min(drawW / lngRange, drawH / latRange);

  const cx = width / 2;
  const cy = height / 2;
  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;

  return points.map(p => ({
    x: cx + (p.lng - midLng) * scale,
    y: cy - (p.lat - midLat) * scale, // flip Y for screen coords
  }));
}

function formatPace(secsPerKm: number): string {
  if (!secsPerKm || secsPerKm <= 0 || !isFinite(secsPerKm)) return '--:--';
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FilmClient() {
  const [lang] = useLang();
  const [runs, setRuns] = useState<EnrichedRunData | null>(null);
  const [stream, setStream] = useState<ActivityStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [filmLoading, setFilmLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  // Animation state
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const [speed, setSpeed] = useState(1);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  // Fetch recent runs
  useEffect(() => {
    safeFetch('/api/strava/data')
      .then(r => r.json())
      .then(d => { setRuns(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Fetch stream when run selected
  const loadFilm = useCallback(async (activityId: number) => {
    setFilmLoading(true);
    setSelectedRunId(activityId);
    setProgress(0);
    setPlaying(false);

    try {
      const params = new URLSearchParams({ activityId: activityId.toString() });
      const r = await safeFetch(`/api/strava/streams?${params.toString()}`);
      const data: ActivityStream = await r.json();
      setStream(data);
    } catch {
      setStream(null);
    } finally {
      setFilmLoading(false);
    }
  }, []);

  // Animation loop
  useEffect(() => {
    if (!playing || !stream) return;

    const duration = stream.totalTime / speed; // real seconds of animation
    const startProgress = progress;
    const startTs = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTs) / 1000;
      const newProgress = Math.min(startProgress + elapsed / duration, 1);
      setProgress(newProgress);

      if (newProgress >= 1) {
        setPlaying(false);
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, speed, stream]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-5xl mb-4 animate-bounce">🎬</div>
        <p className="text-base font-semibold">{t('dash.loading', lang)}</p>
      </div>
    );
  }

  if (!runs || runs.runs.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl mb-2">🎬</p>
        <p className="text-lg font-semibold">{t('common.noRuns', lang)}</p>
      </div>
    );
  }

  // ── Run selector (before film loaded) ──
  if (!stream) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🎬 {t('widget.runFilm', lang)}
          </h1>
          <p className="text-text-muted text-sm mt-1">{t('film.selectRun', lang)}</p>
        </div>

        {filmLoading && (
          <div className="text-center py-12">
            <div className="text-3xl animate-bounce mb-3">🎬</div>
            <p className="text-sm text-text-muted">{lang === 'ko' ? '런 필름 로딩 중...' : 'Loading Run Film...'}</p>
          </div>
        )}

        <div className="space-y-2">
          {runs.runs.slice(0, 20).map((r, i) => (
            <button
              key={i}
              onClick={() => loadFilm(r.id)}
              disabled={filmLoading}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-surface hover:border-primary/30 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{r.name}</p>
                <p className="text-xs text-text-muted">{r.date} · {r.locationFlag} {r.location}</p>
              </div>
              <div className="flex gap-4 shrink-0 text-xs font-mono text-text-muted">
                <span>{r.distance}</span>
                <span>{r.pace}</span>
                <span>{r.time}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Film Player ──
  const points = stream.points;
  const currentIdx = Math.floor(progress * (points.length - 1));
  const currentPoint = points[currentIdx] || points[0];

  // rerender-memo: memoize Mercator projection (only recalc when stream changes)
  const projectedPoints = useMemo(() => projectPoints(points, 600, 400), [points]);

  // rerender-memo: memoize full ghost path (never changes for same stream)
  const fullPath = useMemo(() =>
    projectedPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' '),
    [projectedPoints]
  );

  const visibleCount = currentIdx + 1;

  // Trail path updates with progress but projection is cached
  const trailPath = projectedPoints
    .slice(0, visibleCount)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Current stats
  const currentKm = (currentPoint.distance / 1000).toFixed(2);
  const currentPace = currentPoint.velocity > 0
    ? formatPace(1000 / currentPoint.velocity)
    : '--:--';
  const currentElev = Math.round(currentPoint.altitude);
  const currentTime = formatTime(currentPoint.time);
  const currentHR = currentPoint.heartrate ?? '--';

  // rerender-memo: elevation profile sampling (only recalc when stream changes)
  const elevProfile = useMemo(() => {
    const step = Math.max(1, Math.floor(points.length / 80));
    const sampled = points.filter((_, i) => i % step === 0);
    const maxElev = Math.max(...sampled.map(p => p.altitude));
    const minElev = Math.min(...sampled.map(p => p.altitude));
    const range = maxElev - minElev || 1;
    return sampled.map((p, i) => ({
      height: Math.max(((p.altitude - minElev) / range) * 100, 2),
      sampleIdx: i * step,
    }));
  }, [points]);

  // Runner position
  const runnerPos = projectedPoints[currentIdx];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">🎬 {stream.name}</h1>
          <p className="text-xs text-text-muted">{stream.startDate?.split('T')[0]}</p>
        </div>
        <button
          onClick={() => { setStream(null); setSelectedRunId(null); }}
          className="text-xs text-text-muted hover:text-text px-3 py-1.5 rounded-lg border border-border transition-colors"
        >
          ← {lang === 'ko' ? '다른 런 선택' : 'Pick another run'}
        </button>
      </div>

      {/* Film Canvas */}
      <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
        <svg
          viewBox="0 0 600 400"
          className="w-full h-auto"
          style={{ background: 'radial-gradient(ellipse at center, var(--color-surface) 0%, var(--color-bg) 100%)' }}
        >
          {/* Grid lines */}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 67} x2={600} y2={i * 67} stroke="var(--color-border)" strokeWidth={0.3} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`v${i}`} x1={i * 67} y1={0} x2={i * 67} y2={400} stroke="var(--color-border)" strokeWidth={0.3} />
          ))}

          {/* Ghost trail (full route) */}
          <path d={fullPath} fill="none" stroke="var(--color-border)" strokeWidth={2} strokeLinecap="round" />

          {/* Active trail (neon glow) */}
          <path d={trailPath} fill="none" stroke="var(--color-primary)" strokeWidth={3} strokeLinecap="round" filter="url(#glow)" />
          <path d={trailPath} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />

          {/* Start marker */}
          {projectedPoints.length > 0 && (
            <circle cx={projectedPoints[0].x} cy={projectedPoints[0].y} r={5} fill="var(--color-primary)" opacity={0.8} />
          )}

          {/* Runner dot */}
          {runnerPos && (
            <>
              <circle cx={runnerPos.x} cy={runnerPos.y} r={8} fill="var(--color-primary)" opacity={0.2}>
                <animate attributeName="r" from="6" to="14" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={runnerPos.x} cy={runnerPos.y} r={5} fill="var(--color-primary)" stroke="white" strokeWidth={1.5} />
            </>
          )}

          {/* Glow filter */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Stats HUD overlay */}
        <div className="absolute top-3 left-3 right-3 flex justify-between pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-[10px] text-text-muted uppercase">{t('dash.distance', lang)}</p>
            <p className="text-lg font-bold font-mono text-primary">{currentKm} km</p>
          </div>
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-right">
            <p className="text-[10px] text-text-muted uppercase">{t('dash.pace', lang)}</p>
            <p className="text-lg font-bold font-mono text-accent">{currentPace}</p>
          </div>
        </div>

        <div className="absolute bottom-14 left-3 right-3 flex justify-between pointer-events-none">
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">⏱️</p>
              <p className="text-xs font-bold font-mono">{currentTime}</p>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
              <p className="text-[9px] text-text-muted">⛰️</p>
              <p className="text-xs font-bold font-mono">{currentElev}m</p>
            </div>
            {currentPoint.heartrate && (
              <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                <p className="text-[9px] text-text-muted">❤️</p>
                <p className="text-xs font-bold font-mono text-danger">{currentHR}</p>
              </div>
            )}
          </div>
        </div>

        {/* Playback controls */}
        <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? 'Pause' : 'Play'}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            <span aria-hidden="true">{playing ? '⏸' : '▶️'}</span>
          </button>

          {/* Progress bar */}
          <div
            className="flex-1 h-1.5 rounded-full bg-border cursor-pointer relative"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setProgress((e.clientX - rect.left) / rect.width);
            }}
          >
            <div
              className="h-full rounded-full bg-primary transition-none"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Speed control */}
          <div className="flex gap-1">
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                  speed === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Elevation Profile */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          {t('film.elevation', lang)}
        </h3>
        <div className="h-20 flex items-end gap-px">
          {elevProfile.map((ep, i) => {
            const isActive = ep.sampleIdx <= currentIdx;
            return (
              <div
                key={i}
                className="flex-1 rounded-t transition-colors"
                style={{
                  height: `${ep.height}%`,
                  backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                  opacity: isActive ? 0.8 : 0.4,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-text-muted mt-1 font-mono">
          <span>0 km</span>
          <span>{(stream.totalDistance / 1000).toFixed(1)} km</span>
        </div>
      </div>

      <AdBreak />

      {/* Run Summary */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        {[
          { label: t('dash.distance', lang), value: `${(stream.totalDistance / 1000).toFixed(2)} km` },
          { label: t('dash.time', lang), value: formatTime(stream.totalTime) },
          { label: t('film.elevation', lang), value: `${stream.elevationGain}m ↑` },
          { label: t('dash.pace', lang), value: formatPace(stream.totalTime / (stream.totalDistance / 1000)) },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-[10px] text-text-muted">{s.label}</p>
            <p className="text-sm font-bold font-mono mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

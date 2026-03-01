'use client';

import { useState, useEffect } from 'react';
import type { EnrichedRunData } from '@/lib/strava';
import type { SegmentEffort } from '@/lib/strava-extended';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBreak from '@/components/AdBreak';
import { safeFetch } from '@/lib/api-error';

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SegmentsClient() {
  const [lang] = useLang();
  const [runs, setRuns] = useState<EnrichedRunData | null>(null);
  const [segments, setSegments] = useState<SegmentEffort[]>([]);
  const [loading, setLoading] = useState(true);
  const [segLoading, setSegLoading] = useState(false);

  // Fetch runs list
  useEffect(() => {
    safeFetch('/api/strava/data')
      .then(r => r.json())
      .then(d => { setRuns(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadSegments = async (activityId: number) => {
    setSegLoading(true);
    try {
      const params = new URLSearchParams({ action: 'efforts', activityId: activityId.toString() });
      const r = await safeFetch(`/api/strava/segments?${params.toString()}`);
      const data = await r.json();
      setSegments(Array.isArray(data) ? data : []);
    } catch {
      setSegments([]);
    } finally {
      setSegLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-5xl mb-4 animate-bounce">👑</div>
        <p className="text-base font-semibold">{t('dash.loading', lang)}</p>
      </div>
    );
  }

  // Crown analysis: segments with rank = 1 or top 10
  const crowns = segments.filter(s => s.prRank === 1);
  const nearCrowns = segments.filter(s => s.komRank && s.komRank <= 10 && s.prRank !== 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">👑 {t('widget.hiddenCrowns', lang)}</h1>
        <p className="text-text-muted text-sm mt-1">{t('segment.explore', lang)}</p>
      </div>

      {/* Run selector */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
          {lang === 'ko' ? '러닝 선택 → 세그먼트 분석' : 'Pick a Run → Analyze Segments'}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {runs?.runs.slice(0, 10).map((r, i) => (
            <button
              key={i}
              onClick={() => loadSegments(r.id)}
              disabled={segLoading}
              className="shrink-0 px-3 py-2 rounded-lg border border-border bg-surface text-xs hover:border-primary/30 transition-all disabled:opacity-50"
            >
              <p className="font-medium truncate max-w-32">{r.name}</p>
              <p className="text-text-muted">{r.distance} · {r.date}</p>
            </button>
          ))}
        </div>
      </div>

      {segLoading && (
        <div className="text-center py-8">
          <div className="text-3xl animate-bounce mb-2">🔍</div>
          <p className="text-sm text-text-muted">{lang === 'ko' ? '세그먼트 분석 중...' : 'Analyzing segments...'}</p>
        </div>
      )}

      {/* Crowns */}
      {!segLoading && segments.length > 0 && (
        <>
          {crowns.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-primary flex items-center gap-2">
                👑 {t('segment.crown', lang)} ({crowns.length})
              </h2>
              <div className="space-y-2">
                {crowns.map(s => <SegmentRow key={s.id} seg={s} highlight lang={lang} />)}
              </div>
            </div>
          )}

          {nearCrowns.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-warm flex items-center gap-2">
                🎯 {t('widget.snipeMissions', lang)} ({nearCrowns.length})
              </h2>
              <div className="space-y-2">
                {nearCrowns.map(s => <SegmentRow key={s.id} seg={s} lang={lang} />)}
              </div>
            </div>
          )}

          {/* All segments */}
          <div>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
              {lang === 'ko' ? '모든 세그먼트' : 'All Segments'} ({segments.length})
            </h2>
            <div className="space-y-2">
              {segments.map(s => <SegmentRow key={s.id} seg={s} lang={lang} />)}
            </div>
          </div>
        </>
      )}

      {!segLoading && segments.length === 0 && runs && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-2xl mb-2">🏃</p>
          <p className="text-sm text-text-muted">
            {lang === 'ko' ? '위에서 러닝을 선택하면 세그먼트를 분석합니다' : 'Pick a run above to see its segments'}
          </p>
        </div>
      )}

      <AdBreak />
    </div>
  );
}

function SegmentRow({ seg, highlight, lang }: { seg: SegmentEffort; highlight?: boolean; lang: 'en' | 'ko' }) {
  const rankBadge = seg.prRank === 1 ? '🥇'
    : seg.prRank === 2 ? '🥈'
    : seg.prRank === 3 ? '🥉'
    : null;

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
      highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface'
    }`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate flex items-center gap-2">
          {rankBadge && <span>{rankBadge}</span>}
          {seg.segmentName}
        </p>
        <p className="text-xs text-text-muted">
          {(seg.distance / 1000).toFixed(2)} km · {formatTime(seg.movingTime)}
          {seg.komRank && ` · ${lang === 'ko' ? '전체' : 'Overall'} #${seg.komRank}/${seg.athleteCount}`}
        </p>
      </div>
      {seg.averageHeartrate && (
        <span className="text-xs font-mono text-danger">❤️ {Math.round(seg.averageHeartrate)}</span>
      )}
    </div>
  );
}

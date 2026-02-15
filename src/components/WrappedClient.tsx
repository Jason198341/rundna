'use client';

import { useState, useEffect, useRef } from 'react';
import type { IntelligenceData } from '@/lib/strava-analytics';
import type { EnrichedRunData } from '@/lib/strava';
import { shareCard } from '@/lib/share';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBanner from '@/components/AdBanner';

interface Props {
  userName: string;
  avatarUrl: string | null;
}

interface YearStats {
  year: number;
  totalRuns: number;
  totalKm: number;
  totalHours: number;
  longestRun: number;
  fastestPace: string;
  avgPace: string;
  topMonth: string;
  topMonthKm: number;
  uniqueLocations: number;
  runsPerWeek: number;
}

function computeYearStats(runs: EnrichedRunData['runs'], year: number): YearStats {
  const yearRuns = runs.filter(r => new Date(r.dateFull).getFullYear() === year);

  const totalRuns = yearRuns.length;
  const totalKm = yearRuns.reduce((s, r) => s + r.distanceKm, 0);
  const totalSeconds = yearRuns.reduce((s, r) => s + r.timeSeconds, 0);
  const totalHours = totalSeconds / 3600;
  const longestRun = yearRuns.reduce((m, r) => Math.max(m, r.distanceKm), 0);

  const paces = yearRuns.map(r => r.timeSeconds / r.distanceKm).filter(p => isFinite(p) && p > 0);
  const fastestPaceSec = paces.length > 0 ? Math.min(...paces) : 0;
  const avgPaceSec = paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : 0;

  const fmtPace = (spk: number) => {
    if (!spk || !isFinite(spk)) return '-';
    const m = Math.floor(spk / 60);
    const s = Math.round(spk % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Top month
  const monthKm = new Map<number, number>();
  for (const r of yearRuns) {
    const m = new Date(r.dateFull).getMonth();
    monthKm.set(m, (monthKm.get(m) || 0) + r.distanceKm);
  }
  const topMonthEntry = [...monthKm.entries()].sort((a, b) => b[1] - a[1])[0];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const locations = new Set(yearRuns.map(r => r.location).filter(l => l !== 'Unknown' && l !== 'Other'));

  // Weeks in the year with runs
  const weeks = new Set(yearRuns.map(r => {
    const d = new Date(r.dateFull);
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  }));
  const runsPerWeek = weeks.size > 0 ? totalRuns / weeks.size : 0;

  return {
    year,
    totalRuns,
    totalKm,
    totalHours,
    longestRun,
    fastestPace: fmtPace(fastestPaceSec),
    avgPace: fmtPace(avgPaceSec),
    topMonth: topMonthEntry ? monthNames[topMonthEntry[0]] : '-',
    topMonthKm: topMonthEntry ? topMonthEntry[1] : 0,
    uniqueLocations: locations.size,
    runsPerWeek,
  };
}

const SLIDE_GRADIENTS = [
  'from-[#10b981]/20 to-[#060a0e]',
  'from-[#22d3ee]/20 to-[#060a0e]',
  'from-[#818cf8]/20 to-[#060a0e]',
  'from-[#f59e0b]/20 to-[#060a0e]',
  'from-[#ef4444]/20 to-[#060a0e]',
  'from-[#10b981]/20 to-[#818cf8]/10',
];

export default function WrappedClient({ userName, avatarUrl }: Props) {
  const [lang] = useLang();
  const [data, setData] = useState<(IntelligenceData & { prs: any[] }) | null>(null);
  const [runData, setRunData] = useState<EnrichedRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/strava/intelligence').then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
      fetch('/api/strava/data').then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
    ])
      .then(([intel, rd]) => { setData(intel); setRunData(rd); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="text-5xl mb-4 animate-pulse">🎁</div>
        <p className="text-lg font-semibold">{lang === 'ko' ? '러닝 기록 분석 중...' : 'Unwrapping your year...'}</p>
      </div>
    );
  }

  if (error || !data || !runData) {
    return (
      <div className="text-center py-32">
        <p className="text-danger mb-4">{lang === 'ko' ? '데이터 로딩 실패' : 'Failed to load'}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
          {t('common.retry', lang)}
        </button>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const stats = computeYearStats(runData.runs, currentYear);
  const { personality } = data;

  // Slides
  const slides = [
    // 0: Intro
    <div key="intro" className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-7xl mb-6">🏃</div>
      <p className="text-sm text-text-muted mb-3">{userName}</p>
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
        {lang === 'ko' ? `${currentYear}년 러닝 돌아보기` : `Your ${currentYear} Running Wrapped`}
      </h1>
      <p className="text-text-muted">{lang === 'ko' ? '탭하여 시작' : 'Tap to begin'}</p>
    </div>,

    // 1: Total runs & distance
    <div key="distance" className="flex flex-col items-center justify-center h-full text-center px-8">
      <p className="text-sm text-text-muted mb-6">{lang === 'ko' ? '올해 당신은' : 'This year you ran'}</p>
      <div className="text-7xl font-extrabold font-mono text-primary mb-2">{stats.totalKm.toFixed(0)}</div>
      <p className="text-2xl font-bold mb-8">kilometers</p>
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-3xl font-bold font-mono">{stats.totalRuns}</p>
          <p className="text-xs text-text-muted">{lang === 'ko' ? '회 러닝' : 'runs'}</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold font-mono">{stats.totalHours.toFixed(0)}</p>
          <p className="text-xs text-text-muted">{lang === 'ko' ? '시간' : 'hours'}</p>
        </div>
      </div>
    </div>,

    // 2: Speed
    <div key="speed" className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-6xl mb-6">⚡</div>
      <p className="text-sm text-text-muted mb-4">{lang === 'ko' ? '가장 빠른 페이스' : 'Your fastest pace'}</p>
      <div className="text-6xl font-extrabold font-mono text-accent mb-2">{stats.fastestPace}</div>
      <p className="text-lg text-text-muted mb-8">/km</p>
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold font-mono">{stats.avgPace}</p>
          <p className="text-xs text-text-muted">{lang === 'ko' ? '평균 페이스' : 'avg pace'}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold font-mono">{stats.longestRun.toFixed(1)}</p>
          <p className="text-xs text-text-muted">{lang === 'ko' ? '최장 거리 (km)' : 'longest run (km)'}</p>
        </div>
      </div>
    </div>,

    // 3: Top month
    <div key="month" className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-6xl mb-6">📅</div>
      <p className="text-sm text-text-muted mb-4">{lang === 'ko' ? '가장 많이 뛴 달' : 'Your best month'}</p>
      <div className="text-5xl font-extrabold text-warm mb-2">{stats.topMonth}</div>
      <p className="text-lg text-text-muted">{stats.topMonthKm.toFixed(0)} km</p>
      <div className="mt-8 flex gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold font-mono">{stats.uniqueLocations}</p>
          <p className="text-xs text-text-muted">{lang === 'ko' ? '장소' : 'locations'}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold font-mono">{stats.runsPerWeek.toFixed(1)}</p>
          <p className="text-xs text-text-muted">{lang === 'ko' ? '주당 러닝' : 'runs/week'}</p>
        </div>
      </div>
    </div>,

    // 4: Personality
    <div key="personality" className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="text-7xl mb-6">🧬</div>
      <p className="text-sm text-text-muted mb-4">{lang === 'ko' ? '당신의 러닝 DNA' : 'Your Running DNA'}</p>
      <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-3">{personality.type}</div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
        <span className="text-xs font-bold text-primary">Top {personality.percentile}%</span>
      </div>
      <p className="text-sm text-text-muted max-w-md">{personality.description}</p>
    </div>,

    // 5: Outro
    <div key="outro" className="flex flex-col items-center justify-center h-full text-center px-8">
      {avatarUrl && <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full border-2 border-primary/30 mb-4" />}
      <h2 className="text-2xl font-bold mb-2">{userName}</h2>
      <p className="text-sm text-text-muted mb-6">{lang === 'ko' ? `${currentYear}년도 잘 뛰었습니다!` : `Great running in ${currentYear}!`}</p>
      <div className="flex gap-3">
        <button
          onClick={async () => {
            if (!cardRef.current || saving) return;
            setSaving(true);
            try { await shareCard(cardRef.current, `rundna-wrapped-${currentYear}`, `My ${currentYear} Running Wrapped`, 'https://rundna.online'); }
            finally { setSaving(false); }
          }}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? '...' : lang === 'ko' ? '공유하기' : 'Share'}
        </button>
        <a href="/dna" className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/30 hover:text-primary transition-all">
          {lang === 'ko' ? 'DNA 보기' : 'View DNA'}
        </a>
      </div>
      <div className="mt-8">
        <AdBanner format="rectangle" />
      </div>
    </div>,
  ];

  const totalSlides = slides.length;
  const canNext = slide < totalSlides - 1;
  const canPrev = slide > 0;

  return (
    <div className="relative h-[calc(100vh-56px)] overflow-hidden select-none">
      {/* Progress dots */}
      <div className="absolute top-4 left-0 right-0 z-10 flex justify-center gap-1.5 px-6">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full flex-1 max-w-12 transition-all duration-300 ${
              i <= slide ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div
        ref={cardRef}
        className={`h-full bg-gradient-to-b ${SLIDE_GRADIENTS[slide % SLIDE_GRADIENTS.length]} transition-all duration-500`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x > rect.width / 2 && canNext) setSlide(slide + 1);
          else if (x <= rect.width / 2 && canPrev) setSlide(slide - 1);
        }}
      >
        {slides[slide]}
      </div>

      {/* Navigation hint */}
      {slide > 0 && slide < totalSlides - 1 && (
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '탭하여 이동' : 'Tap to navigate'}</p>
        </div>
      )}
    </div>
  );
}

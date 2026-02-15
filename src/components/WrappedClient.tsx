'use client';

import { useState, useEffect, useRef, useMemo, createRef } from 'react';
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

  const monthKm = new Map<number, number>();
  for (const r of yearRuns) {
    const m = new Date(r.dateFull).getMonth();
    monthKm.set(m, (monthKm.get(m) || 0) + r.distanceKm);
  }
  const topMonthEntry = [...monthKm.entries()].sort((a, b) => b[1] - a[1])[0];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const locations = new Set(yearRuns.map(r => r.location).filter(l => l !== 'Unknown' && l !== 'Other'));

  const weeks = new Set(yearRuns.map(r => {
    const d = new Date(r.dateFull);
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  }));
  const runsPerWeek = weeks.size > 0 ? totalRuns / weeks.size : 0;

  return {
    year, totalRuns, totalKm, totalHours, longestRun,
    fastestPace: fmtPace(fastestPaceSec), avgPace: fmtPace(avgPaceSec),
    topMonth: topMonthEntry ? monthNames[topMonthEntry[0]] : '-',
    topMonthKm: topMonthEntry ? topMonthEntry[1] : 0,
    uniqueLocations: locations.size, runsPerWeek,
  };
}

const CARD_GRADIENTS = [
  'from-[#10b981]/20 via-[#060a0e] to-[#060a0e]',
  'from-[#22d3ee]/20 via-[#060a0e] to-[#060a0e]',
  'from-[#818cf8]/20 via-[#060a0e] to-[#060a0e]',
  'from-[#f59e0b]/20 via-[#060a0e] to-[#060a0e]',
  'from-[#ef4444]/20 via-[#060a0e] to-[#060a0e]',
  'from-[#10b981]/20 via-[#818cf8]/10 to-[#060a0e]',
];

export default function WrappedClient({ userName, avatarUrl }: Props) {
  const [lang] = useLang();
  const [data, setData] = useState<(IntelligenceData & { prs: any[] }) | null>(null);
  const [runData, setRunData] = useState<EnrichedRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const stats = useMemo(() => computeYearStats(runData.runs, currentYear), [runData.runs, currentYear]);
  const { personality } = data;

  return (
    <WrappedCards
      lang={lang}
      userName={userName}
      avatarUrl={avatarUrl}
      currentYear={currentYear}
      stats={stats}
      personality={personality}
    />
  );
}

// ── Card Gallery ──

interface CardDef {
  id: string;
  emoji: string;
  gradient: string;
  content: React.ReactNode;
  shareText: string;
}

function WrappedCards({
  lang, userName, avatarUrl, currentYear, stats, personality,
}: {
  lang: 'en' | 'ko';
  userName: string;
  avatarUrl: string | null;
  currentYear: number;
  stats: YearStats;
  personality: { type: string; percentile: number; description: string };
}) {
  const cards: CardDef[] = [
    {
      id: 'distance',
      emoji: '🏃',
      gradient: CARD_GRADIENTS[0],
      shareText: `I ran ${stats.totalKm.toFixed(0)}km in ${currentYear}!`,
      content: (
        <>
          <p className="text-sm text-[#7d8590] mb-4">{lang === 'ko' ? `${currentYear}년 총 거리` : `${currentYear} Total Distance`}</p>
          <div className="text-6xl sm:text-7xl font-extrabold font-mono text-[#10b981] mb-1">{stats.totalKm.toFixed(0)}</div>
          <p className="text-xl font-bold text-[#e6edf3] mb-6">kilometers</p>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-[#e6edf3]">{stats.totalRuns}</p>
              <p className="text-xs text-[#7d8590]">{lang === 'ko' ? '회 러닝' : 'runs'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-[#e6edf3]">{stats.totalHours.toFixed(0)}</p>
              <p className="text-xs text-[#7d8590]">{lang === 'ko' ? '시간' : 'hours'}</p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'speed',
      emoji: '⚡',
      gradient: CARD_GRADIENTS[1],
      shareText: `My fastest pace: ${stats.fastestPace}/km`,
      content: (
        <>
          <p className="text-sm text-[#7d8590] mb-4">{lang === 'ko' ? '최고 페이스' : 'Fastest Pace'}</p>
          <div className="text-6xl font-extrabold font-mono text-[#22d3ee] mb-1">{stats.fastestPace}</div>
          <p className="text-lg text-[#7d8590] mb-6">/km</p>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-xl font-bold font-mono text-[#e6edf3]">{stats.avgPace}</p>
              <p className="text-xs text-[#7d8590]">{lang === 'ko' ? '평균 페이스' : 'avg pace'}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold font-mono text-[#e6edf3]">{stats.longestRun.toFixed(1)}</p>
              <p className="text-xs text-[#7d8590]">{lang === 'ko' ? '최장 km' : 'longest km'}</p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'month',
      emoji: '📅',
      gradient: CARD_GRADIENTS[3],
      shareText: `My best running month: ${stats.topMonth} (${stats.topMonthKm.toFixed(0)}km)`,
      content: (
        <>
          <p className="text-sm text-[#7d8590] mb-4">{lang === 'ko' ? '최고의 달' : 'Best Month'}</p>
          <div className="text-5xl font-extrabold text-[#f59e0b] mb-1">{stats.topMonth}</div>
          <p className="text-lg text-[#7d8590] mb-6">{stats.topMonthKm.toFixed(0)} km</p>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-xl font-bold font-mono text-[#e6edf3]">{stats.uniqueLocations}</p>
              <p className="text-xs text-[#7d8590]">{lang === 'ko' ? '장소' : 'locations'}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold font-mono text-[#e6edf3]">{stats.runsPerWeek.toFixed(1)}</p>
              <p className="text-xs text-[#7d8590]">{lang === 'ko' ? '주당 러닝' : 'runs/week'}</p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'dna',
      emoji: '🧬',
      gradient: CARD_GRADIENTS[2],
      shareText: `My Running DNA: ${personality.type} (Top ${personality.percentile}%)`,
      content: (
        <>
          <p className="text-sm text-[#7d8590] mb-4">{lang === 'ko' ? '러닝 DNA' : 'Running DNA'}</p>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#10b981] mb-3">{personality.type}</div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 mb-4">
            <span className="text-xs font-bold text-[#10b981]">Top {personality.percentile}%</span>
          </div>
          <p className="text-sm text-[#7d8590] max-w-xs">{personality.description}</p>
        </>
      ),
    },
  ];

  const cardRefs = useRef(cards.map(() => createRef<HTMLDivElement>()));

  return (
    <div className="px-4 sm:px-6 py-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        {avatarUrl && <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full border-2 border-primary/30 mx-auto mb-3" />}
        <h1 className="text-2xl sm:text-3xl font-extrabold">
          {lang === 'ko' ? `${currentYear}년 러닝 돌아보기` : `${currentYear} Running Wrapped`}
        </h1>
        <p className="text-sm text-text-muted mt-1">{userName}</p>
      </div>

      {/* All cards, stacked vertically */}
      <div className="space-y-4">
        {cards.map((card, i) => (
          <div key={card.id}>
            {/* Shareable card */}
            <div
              ref={cardRefs.current[i]}
              className={`rounded-2xl border border-[#1e2a3a] bg-gradient-to-b ${card.gradient} p-8 flex flex-col items-center text-center`}
            >
              <div className="text-5xl mb-4">{card.emoji}</div>
              {card.content}
              {/* Branding footer */}
              <div className="mt-6 pt-4 border-t border-[#1e2a3a] w-full flex items-center justify-center gap-2">
                <img src="/logo.png" alt="" className="w-4 h-4 rounded-sm" />
                <span className="text-[10px] text-[#7d8590]">RunDNA — rundna.online</span>
              </div>
            </div>

            {/* Share button for this card */}
            <div className="flex justify-center mt-2">
              <CardShareButton
                cardRef={cardRefs.current[i]}
                filename={`rundna-wrapped-${currentYear}-${card.id}`}
                shareText={card.shareText}
                lang={lang}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Ad between cards and CTA */}
      <AdBanner format="rectangle" className="mt-6" />

      {/* Bottom CTA */}
      <div className="text-center mt-8 mb-12">
        <p className="text-sm text-text-muted mb-4">
          {lang === 'ko' ? `${currentYear}년도 잘 뛰었습니다! 🎉` : `Great running in ${currentYear}! 🎉`}
        </p>
        <div className="flex justify-center gap-3">
          <a href="/dna" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors">
            {lang === 'ko' ? 'DNA 보기' : 'View DNA'}
          </a>
          <a href="/dashboard" className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:border-primary/30 hover:text-primary transition-all">
            {lang === 'ko' ? '대시보드' : 'Dashboard'}
          </a>
        </div>
      </div>
    </div>
  );
}

function CardShareButton({ cardRef, filename, shareText, lang }: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareText: string;
  lang: 'en' | 'ko';
}) {
  const [saving, setSaving] = useState(false);

  async function handleShare() {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      await shareCard(cardRef.current, filename, shareText, 'https://rundna.online');
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={saving}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {saving ? '...' : lang === 'ko' ? '공유' : 'Share'}
    </button>
  );
}

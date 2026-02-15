'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { EnrichedRunData } from '@/lib/strava';
import type { IntelligenceData } from '@/lib/strava-analytics';
import type { WidgetId } from '@/lib/widget-types';
import { getWidgetDef } from '@/lib/widget-types';
import type { WidgetPreferences } from '@/lib/widget-store';
import { loadPreferences, savePreferences } from '@/lib/widget-store';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import WidgetShell from '@/components/widgets/WidgetShell';
import AdBreak from '@/components/AdBreak';
import {
  StatsOverview, PersonalRecords, FeatureNav, RecentActivities,
  DNARadar, TraitBars, TrainingLoadWidget, RacePredictions,
  RecoveryStats, CoachAdvice, TodaysPlanWidget, PaceTrend,
  ConditionsWidget, YearComparison, DistributionWidget,
  RouteFamiliarityWidget, MilestonesWidget, WeeklyChallenge, RunHeatmap,
} from '@/components/widgets/CoreWidgets';

const CustomizePanel = dynamic(() => import('@/components/widgets/CustomizePanel'), {
  ssr: false,
});

interface Props {
  userName: string;
}

interface DataSources {
  runData: EnrichedRunData | null;
  intelligence: IntelligenceData | null;
}

export default function DashboardClient({ userName }: Props) {
  const [lang] = useLang();
  const [prefs, setPrefs] = useState<WidgetPreferences>(() => loadPreferences());
  const [showCustomize, setShowCustomize] = useState(false);
  const [data, setData] = useState<DataSources>({ runData: null, intelligence: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // ── Drag & Drop (unified mouse + touch) ──
  const [dragWidgetId, setDragWidgetId] = useState<WidgetId | null>(null);
  const [tempOrder, setTempOrder] = useState<WidgetId[] | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number } | undefined>(undefined);

  // ── Widget Expansion ──
  const [expandedWidget, setExpandedWidget] = useState<WidgetId | null>(null);
  const expandedRef = useRef<HTMLDivElement | null>(null);

  const handleToggleExpand = useCallback((id: WidgetId) => {
    if (dragWidgetId) return;
    setExpandedWidget(prev => prev === id ? null : id);
  }, [dragWidgetId]);

  useEffect(() => {
    if (expandedWidget && expandedRef.current) {
      requestAnimationFrame(() => {
        expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [expandedWidget]);

  const orderedWidgets = prefs.widgetOrder.filter(id => prefs.enabledWidgets.includes(id));
  const displayOrder = tempOrder ?? orderedWidgets;

  // Compute data deps
  const neededDeps = new Set(
    prefs.widgetOrder
      .filter(id => prefs.enabledWidgets.includes(id))
      .flatMap(id => getWidgetDef(id)?.dataDeps ?? [])
  );

  // Fetch data (async-parallel best practice)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 200);

    const needsRun = neededDeps.has('runData') || neededDeps.has('intelligence');
    const fetches: Promise<void>[] = [];

    if (needsRun) {
      const runPromise = fetch('/api/strava/data').then(r => {
        if (!r.ok) throw new Error('Failed to load run data');
        return r.json();
      });
      const intelPromise = fetch('/api/strava/intelligence').then(r => {
        if (!r.ok) throw new Error('Failed to load intelligence');
        return r.json();
      });

      fetches.push(
        Promise.all([runPromise, intelPromise]).then(([runData, intelligence]) => {
          setData({ runData, intelligence });
        })
      );
    }

    Promise.all(fetches)
      .then(() => setProgress(100))
      .catch(e => setError(e.message))
      .finally(() => {
        clearInterval(interval);
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrefsUpdate = useCallback((next: WidgetPreferences) => {
    setPrefs(next);
    savePreferences(next);
  }, []);

  const handleRemoveWidget = useCallback((id: WidgetId) => {
    setPrefs(prev => {
      const next: WidgetPreferences = {
        ...prev,
        enabledWidgets: prev.enabledWidgets.filter(w => w !== id),
        widgetOrder: prev.widgetOrder.filter(w => w !== id),
        preset: 'custom',
      };
      savePreferences(next);
      return next;
    });
  }, []);

  // ── Unified drag helpers ──
  const startDrag = useCallback((widgetId: WidgetId) => {
    setExpandedWidget(null);
    setDragWidgetId(widgetId);
    setTempOrder([...orderedWidgets]);
    if (navigator.vibrate) navigator.vibrate(30);
  }, [orderedWidgets]);

  const moveToIdx = useCallback((targetIdx: number) => {
    setTempOrder(prev => {
      if (!prev || !dragWidgetId) return prev;
      const fromIdx = prev.indexOf(dragWidgetId);
      if (fromIdx === targetIdx || fromIdx === -1) return prev;
      const arr = [...prev];
      arr.splice(fromIdx, 1);
      arr.splice(targetIdx, 0, dragWidgetId);
      return arr;
    });
  }, [dragWidgetId]);

  const commitDrag = useCallback(() => {
    // Use functional setTempOrder to read current tempOrder
    setTempOrder(currentTemp => {
      if (currentTemp) {
        setPrefs(currentPrefs => {
          const next: WidgetPreferences = {
            ...currentPrefs,
            widgetOrder: currentTemp,
            preset: 'custom',
          };
          savePreferences(next);
          return next;
        });
      }
      return null;
    });
    setDragWidgetId(null);
  }, []);

  const cancelDrag = useCallback(() => {
    setTempOrder(null);
    setDragWidgetId(null);
  }, []);

  // ── Touch: long-press detection ──
  const handleTouchStart = useCallback((widgetId: WidgetId, e: React.TouchEvent) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    longPressRef.current = setTimeout(() => {
      longPressRef.current = undefined;
      startDrag(widgetId);
    }, 400);
  }, [startDrag]);

  const handleWidgetTouchEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = undefined;
    }
  }, []);

  // ── Touch: cancel long-press on scroll ──
  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!longPressRef.current || !touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);
      if (dx > 8 || dy > 8) {
        clearTimeout(longPressRef.current);
        longPressRef.current = undefined;
      }
    };
    document.addEventListener('touchmove', onMove, { passive: true });
    return () => document.removeEventListener('touchmove', onMove);
  }, []);

  // ── Touch: drag tracking (non-passive to prevent scroll) ──
  // dragWidgetId is stable during a single drag session
  useEffect(() => {
    if (!dragWidgetId) return;

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const wrapper = el?.closest('[data-widget-idx]') as HTMLElement | null;
      if (!wrapper) return;
      const targetIdx = Number(wrapper.dataset.widgetIdx);

      setTempOrder(prev => {
        if (!prev) return prev;
        const fromIdx = prev.indexOf(dragWidgetId);
        if (fromIdx === targetIdx || fromIdx === -1) return prev;
        const arr = [...prev];
        arr.splice(fromIdx, 1);
        arr.splice(targetIdx, 0, dragWidgetId);
        return arr;
      });
    };

    const onEnd = () => {
      setTempOrder(currentTemp => {
        if (currentTemp) {
          setPrefs(currentPrefs => {
            const next: WidgetPreferences = {
              ...currentPrefs,
              widgetOrder: currentTemp,
              preset: 'custom',
            };
            savePreferences(next);
            return next;
          });
        }
        return null;
      });
      setDragWidgetId(null);
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, [dragWidgetId]);

  // ── Desktop DnD: real-time magnetic reorder ──
  const handleDragStart = useCallback((widgetId: WidgetId, e: React.DragEvent) => {
    // Set minimal drag image (transparent)
    const ghost = document.createElement('div');
    ghost.style.opacity = '0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => ghost.remove(), 0);
    startDrag(widgetId);
  }, [startDrag]);

  const handleDragOver = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    moveToIdx(targetIdx);
  }, [moveToIdx]);

  const handleDragEnd = useCallback(() => {
    commitDrag();
  }, [commitDrag]);

  // ── Loading State ──
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

  if (!data.runData || data.runData.runs.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl mb-2">🏃‍♂️</p>
        <p className="text-lg font-semibold">{t('common.noRuns', lang)}</p>
        <p className="text-sm text-text-muted mt-2">{t('dash.noRunsSub', lang)}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome + Customize Button */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t('dash.welcome', lang)} {userName.split(' ')[0]}
          </h1>
          <p className="text-text-muted mt-1.5 text-sm">{t('dash.overview', lang)}</p>
        </div>
        <button
          onClick={() => setShowCustomize(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:border-primary/30 bg-surface text-sm font-medium transition-all hover:bg-primary/5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="hidden sm:inline">{t('widget.customize', lang)}</span>
        </button>
      </div>

      {/* Widget Grid — Flexbox + Magnetic Drag-and-Drop */}
      <div
        className="flex flex-wrap gap-5 items-stretch"
        style={dragWidgetId ? { touchAction: 'none' } : undefined}
        onContextMenu={dragWidgetId ? e => e.preventDefault() : undefined}
      >
        {displayOrder.map((id, idx) => {
          const isExpanded = expandedWidget === id;
          const expContent = renderExpandedWidget(id, data, lang);
          return (
            <React.Fragment key={id}>
              <div
                data-widget-idx={idx}
                ref={isExpanded ? expandedRef : undefined}
                className={[
                  'transition-[flex-basis,min-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                  isExpanded
                    ? 'basis-full min-w-0'
                    : 'flex-1 basis-[calc(50%-0.625rem)] min-w-[280px]',
                  dragWidgetId === id ? 'z-10 relative' : '',
                ].join(' ')}
                draggable={!isExpanded}
                onDragStart={isExpanded ? undefined : e => handleDragStart(id, e)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onTouchStart={isExpanded ? undefined : e => handleTouchStart(id, e)}
                onTouchEnd={handleWidgetTouchEnd}
              >
                <WidgetShell
                  id={id}
                  lang={lang}
                  index={idx}
                  onRemove={handleRemoveWidget}
                  isDragging={dragWidgetId === id}
                  expanded={isExpanded}
                  onToggleExpand={handleToggleExpand}
                  expandedContent={expContent}
                >
                  {renderWidget(id, data, lang)}
                </WidgetShell>
              </div>
              {(idx + 1) % 8 === 0 && idx + 1 < displayOrder.length && (
                <div className="w-full basis-full"><AdBreak className="my-4" /></div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <AdBreak />

      {/* Empty state */}
      {orderedWidgets.length === 0 && (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="text-3xl mb-3">🎨</p>
          <p className="text-base font-semibold mb-1">{t('widget.customize', lang)}</p>
          <p className="text-sm text-text-muted mb-4">
            {lang === 'ko' ? '위젯을 추가하여 나만의 대시보드를 만드세요' : 'Add widgets to build your perfect dashboard'}
          </p>
          <button
            onClick={() => setShowCustomize(true)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
          >
            {t('widget.addWidget', lang)}
          </button>
        </div>
      )}

      {/* Customize Panel */}
      {showCustomize && (
        <CustomizePanel
          lang={lang}
          prefs={prefs}
          onUpdate={handlePrefsUpdate}
          onClose={() => setShowCustomize(false)}
        />
      )}
    </div>
  );
}

// ── Widget Renderer ──
function renderWidget(id: WidgetId, data: DataSources, lang: 'en' | 'ko'): React.ReactNode {
  const { runData, intelligence } = data;

  switch (id) {
    case 'stats-overview':
      return runData ? <StatsOverview data={runData} lang={lang} /> : null;
    case 'personal-records':
      return runData ? <PersonalRecords data={runData} lang={lang} /> : null;
    case 'feature-nav':
      return <FeatureNav lang={lang} />;
    case 'recent-activities':
      return runData ? <RecentActivities data={runData} lang={lang} /> : null;
    case 'dna-radar':
      return intelligence ? <DNARadar intel={intelligence} lang={lang} /> : null;
    case 'trait-bars':
      return intelligence ? <TraitBars intel={intelligence} lang={lang} /> : null;
    case 'training-load':
      return intelligence ? <TrainingLoadWidget intel={intelligence} lang={lang} /> : null;
    case 'race-predictions':
      return intelligence ? <RacePredictions intel={intelligence} /> : null;
    case 'recovery-stats':
      return intelligence ? <RecoveryStats intel={intelligence} lang={lang} /> : null;
    case 'coach-advice':
      return intelligence ? <CoachAdvice intel={intelligence} lang={lang} /> : null;
    case 'todays-plan':
      return intelligence ? <TodaysPlanWidget intel={intelligence} lang={lang} /> : null;
    case 'pace-trend':
      return intelligence ? <PaceTrend intel={intelligence} /> : null;
    case 'conditions':
      return intelligence ? <ConditionsWidget intel={intelligence} lang={lang} /> : null;
    case 'year-comparison':
      return intelligence ? <YearComparison intel={intelligence} /> : null;
    case 'distance-distribution':
      return intelligence ? <DistributionWidget intel={intelligence} /> : null;
    case 'route-familiarity':
      return intelligence ? <RouteFamiliarityWidget intel={intelligence} /> : null;
    case 'milestones':
      return intelligence ? <MilestonesWidget intel={intelligence} /> : null;
    case 'weekly-challenge':
      return intelligence ? <WeeklyChallenge intel={intelligence} lang={lang} /> : null;

    case 'run-heatmap':
      return runData ? <RunHeatmap data={runData} /> : null;

    // ── Level 1: Run Film ──
    case 'ghost-comparison':
      return <GhostComparisonWidget lang={lang} />;
    case 'monthly-highlight':
      return runData ? <MonthlyHighlightWidget data={runData} lang={lang} /> : null;

    // ── Level 2: Segment Sniper ──
    case 'snipe-missions':
      return <SnipeMissionsWidget lang={lang} />;
    case 'segment-xray':
      return <SegmentXrayWidget lang={lang} />;

    // ── Level 3: Shoe Graveyard ──
    case 'shoe-health':
      return <ShoeHealthWidget lang={lang} />;
    case 'shoe-graveyard':
      return <ShoeGraveyardWidget lang={lang} />;

    // ── Level 4: DNA Battle ──
    case 'dna-battle':
      return intelligence ? <DNABattleWidget intel={intelligence} lang={lang} /> : null;
    case 'training-twin':
      return intelligence ? <TrainingTwinWidget intel={intelligence} lang={lang} /> : null;

    // ── Level 5: Digital Twin ──
    case 'race-simulation':
      return intelligence ? <RaceSimWidget intel={intelligence} lang={lang} /> : null;
    case 'pacing-card':
      return intelligence ? <PacingCardWidget intel={intelligence} lang={lang} /> : null;
    case 'what-if':
      return intelligence ? <WhatIfWidget intel={intelligence} lang={lang} /> : null;

    default:
      return null;
  }
}

// ── Expanded Widget Renderer ──
function renderExpandedWidget(id: WidgetId, data: DataSources, lang: 'en' | 'ko'): React.ReactNode | null {
  const { runData, intelligence } = data;
  switch (id) {
    case 'stats-overview':
      return runData ? <StatsOverviewExpanded data={runData} lang={lang} /> : null;
    case 'recent-activities':
      return runData ? <RecentActivitiesExpanded data={runData} lang={lang} /> : null;
    case 'dna-radar':
      return intelligence ? <DNARadarExpanded intel={intelligence} lang={lang} /> : null;
    case 'pace-trend':
      return intelligence ? <PaceTrendExpanded intel={intelligence} lang={lang} /> : null;
    case 'year-comparison':
      return intelligence ? <YearComparisonExpanded intel={intelligence} lang={lang} /> : null;
    case 'run-heatmap':
      return runData ? <RunHeatmapExpanded data={runData} lang={lang} /> : null;
    case 'personal-records':
      return runData ? <PersonalRecordsExpanded data={runData} lang={lang} /> : null;
    case 'trait-bars':
      return intelligence ? <TraitBarsExpanded intel={intelligence} lang={lang} /> : null;
    case 'training-load':
      return intelligence ? <TrainingLoadExpanded intel={intelligence} lang={lang} /> : null;
    case 'race-predictions':
      return intelligence ? <RacePredictionsExpanded intel={intelligence} lang={lang} /> : null;
    case 'recovery-stats':
      return intelligence ? <RecoveryExpanded intel={intelligence} lang={lang} /> : null;
    case 'conditions':
      return intelligence ? <ConditionsExpanded intel={intelligence} lang={lang} /> : null;
    case 'distance-distribution':
      return intelligence ? <DistributionExpanded intel={intelligence} lang={lang} /> : null;
    case 'route-familiarity':
      return intelligence ? <RouteFamiliarityExpanded intel={intelligence} lang={lang} /> : null;
    case 'milestones':
      return intelligence ? <MilestonesExpanded intel={intelligence} lang={lang} /> : null;
    case 'todays-plan':
      return intelligence ? <TodaysPlanExpanded intel={intelligence} lang={lang} /> : null;
    case 'coach-advice':
      return intelligence ? <CoachAdviceExpanded intel={intelligence} lang={lang} /> : null;
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════
// Level 1-5 Widgets (previously Coming Soon)
// ═══════════════════════════════════════════════

function GhostComparisonWidget({ lang }: { lang: 'en' | 'ko' }) {
  return (
    <div className="text-center py-2">
      <span className="text-3xl">👻</span>
      <p className="text-sm font-medium mt-2">{lang === 'ko' ? '고스트 비교' : 'Ghost Comparison'}</p>
      <p className="text-xs text-text-muted mt-1">{lang === 'ko' ? '과거 나 vs 현재 나' : 'Past you vs Present you'}</p>
      <a href="/film" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '필름에서 비교' : 'Compare in Film'} →
      </a>
    </div>
  );
}

function MonthlyHighlightWidget({ data, lang }: { data: EnrichedRunData; lang: 'en' | 'ko' }) {
  const thisMonth = data.runs.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const best = thisMonth.length > 0
    ? thisMonth.reduce((a, b) => a.distanceKm > b.distanceKm ? a : b)
    : null;
  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '이번 달 하이라이트' : 'This Month\'s Highlight'}</p>
      {best ? (
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
          <p className="text-sm font-medium">{best.name}</p>
          <div className="flex gap-3 mt-1 text-xs text-text-muted font-mono">
            <span className="text-primary font-bold">{best.distance}</span>
            <span>{best.pace}/km</span>
            <span>{best.time}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">{lang === 'ko' ? '이번 달 러닝 없음' : 'No runs this month'}</p>
      )}
    </div>
  );
}

function SnipeMissionsWidget({ lang }: { lang: 'en' | 'ko' }) {
  const [targets, setTargets] = useState<Array<{ segmentName: string; prRank: number | null; komRank: number | null }>>([]);
  useEffect(() => {
    fetch('/api/strava/segments').then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setTargets(d.filter((s: any) => s.prRank && s.prRank <= 5 && s.prRank > 1).slice(0, 5));
    }).catch(() => {});
  }, []);
  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '저격 미션 (왕관 근접)' : 'Snipe Missions (Near Crown)'}</p>
      {targets.length > 0 ? targets.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-1.5">
          <span className="text-sm truncate flex-1">🎯 {s.segmentName}</span>
          <span className="text-[10px] font-mono text-warm">#{s.prRank}</span>
        </div>
      )) : (
        <p className="text-sm text-text-muted">{lang === 'ko' ? '목표 세그먼트 없음' : 'No targets found'}</p>
      )}
      <a href="/segments" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '전체 세그먼트' : 'All Segments'} →
      </a>
    </div>
  );
}

function SegmentXrayWidget({ lang }: { lang: 'en' | 'ko' }) {
  const [top, setTop] = useState<Array<{ segmentName: string; elapsedTime: number; distance: number }>>([]);
  useEffect(() => {
    fetch('/api/strava/segments').then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setTop(d.slice(0, 5));
    }).catch(() => {});
  }, []);
  const fmtTime = (s: number) => { const m = Math.floor(s / 60); return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`; };
  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '세그먼트 X-Ray' : 'Segment X-Ray'}</p>
      {top.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-1.5 text-sm">
          <span className="truncate flex-1">{s.segmentName}</span>
          <span className="text-xs font-mono text-accent">{fmtTime(s.elapsedTime)}</span>
        </div>
      ))}
      <a href="/segments" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '상세 분석' : 'Deep Analysis'} →
      </a>
    </div>
  );
}

function ShoeHealthWidget({ lang }: { lang: 'en' | 'ko' }) {
  const [shoes, setShoes] = useState<Array<{ name: string; distanceKm: number; healthPercent: number; retired: boolean }>>([]);
  useEffect(() => {
    fetch('/api/strava/gear').then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setShoes(d.filter((s: any) => !s.retired).slice(0, 3));
    }).catch(() => {});
  }, []);
  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '활성 신발 상태' : 'Active Shoe Health'}</p>
      {shoes.length > 0 ? shoes.map((s, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium truncate">👟 {s.name}</span>
            <span className="text-xs text-text-muted font-mono">{s.distanceKm.toFixed(0)} km</span>
          </div>
          <div className="h-2 rounded-full bg-bg overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${s.healthPercent}%`,
              backgroundColor: s.healthPercent > 50 ? 'var(--color-primary)' : s.healthPercent > 20 ? 'var(--color-warm)' : 'var(--color-danger)',
            }} />
          </div>
        </div>
      )) : (
        <p className="text-sm text-text-muted">{lang === 'ko' ? '신발 데이터 로딩...' : 'Loading shoe data...'}</p>
      )}
      <a href="/shoes" className="inline-block mt-2 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '신발 관리' : 'Manage Shoes'} →
      </a>
    </div>
  );
}

function ShoeGraveyardWidget({ lang }: { lang: 'en' | 'ko' }) {
  const [retired, setRetired] = useState<Array<{ name: string; distanceKm: number }>>([]);
  useEffect(() => {
    fetch('/api/strava/gear').then(r => r.ok ? r.json() : []).then(d => {
      if (Array.isArray(d)) setRetired(d.filter((s: any) => s.retired).slice(0, 5));
    }).catch(() => {});
  }, []);
  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '은퇴한 신발' : 'Retired Shoes'}</p>
      {retired.length > 0 ? retired.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-1.5 text-sm">
          <span className="truncate">🪦 {s.name}</span>
          <span className="text-xs text-text-muted font-mono">{s.distanceKm.toFixed(0)} km</span>
        </div>
      )) : (
        <p className="text-sm text-text-muted">{lang === 'ko' ? '은퇴 신발 없음' : 'No retired shoes yet'}</p>
      )}
      <a href="/shoes" className="inline-block mt-2 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '신발 묘지' : 'Shoe Graveyard'} →
      </a>
    </div>
  );
}

function DNABattleWidget({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { personality } = intel;
  const scores = personality.scores;
  const code = `RD-${scores.consistency}${scores.speed}${scores.endurance}${scores.variety}${scores.volume}`;
  return (
    <div className="text-center">
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '나의 DNA 코드' : 'My DNA Code'}</p>
      <p className="text-2xl font-mono font-bold text-primary mb-1">{code}</p>
      <p className="text-xs text-text-muted mb-3">{personality.type}</p>
      <a href="/battle" className="inline-block px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
        {lang === 'ko' ? '배틀 시작' : 'Start Battle'} →
      </a>
    </div>
  );
}

function TrainingTwinWidget({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { personality, totalRuns, totalKm } = intel;
  return (
    <div className="text-center py-2">
      <span className="text-3xl">👥</span>
      <p className="text-sm font-medium mt-2">{personality.type}</p>
      <p className="text-xs text-text-muted mt-1">
        {lang === 'ko'
          ? `${totalRuns}회 · ${Math.round(totalKm)}km 기반 프로필`
          : `Profile: ${totalRuns} runs · ${Math.round(totalKm)}km`}
      </p>
      <a href="/battle" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '비슷한 러너 찾기' : 'Find Similar Runners'} →
      </a>
    </div>
  );
}

function RaceSimWidget({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  if (intel.racePredictions.length === 0) return <p className="text-sm text-text-muted">Need more data</p>;
  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '예상 기록' : 'Race Predictions'}</p>
      <div className="grid grid-cols-2 gap-2">
        {intel.racePredictions.map(rp => (
          <div key={rp.label} className="text-center py-2 rounded-lg bg-primary/5">
            <p className="text-xs text-text-muted">{rp.label}</p>
            <p className="text-sm font-bold font-mono text-primary">{rp.time}</p>
          </div>
        ))}
      </div>
      <a href="/simulation" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '시뮬레이션 실행' : 'Run Simulation'} →
      </a>
    </div>
  );
}

function PacingCardWidget({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { racePredictions, todaysPlan } = intel;
  const zones = [
    { label: lang === 'ko' ? '이지 페이스' : 'Easy Pace', pace: todaysPlan.easyPace, color: 'var(--color-primary)' },
    { label: lang === 'ko' ? '마라톤 페이스' : 'Marathon Pace', pace: racePredictions.find(r => r.label === 'Full')?.pace ?? '-', color: 'var(--color-accent)' },
    { label: lang === 'ko' ? '하프 페이스' : 'Half Pace', pace: racePredictions.find(r => r.label === 'Half')?.pace ?? '-', color: 'var(--color-warm)' },
    { label: lang === 'ko' ? '5K 페이스' : '5K Pace', pace: racePredictions.find(r => r.label === '5K')?.pace ?? '-', color: 'var(--color-danger)' },
  ];
  return (
    <div>
      <p className="text-xs text-text-muted mb-2">{lang === 'ko' ? '페이싱 존' : 'Pacing Zones'}</p>
      <div className="space-y-2">
        {zones.map(z => (
          <div key={z.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: z.color + '10' }}>
            <span className="text-xs font-medium">{z.label}</span>
            <span className="text-xs font-mono font-bold" style={{ color: z.color }}>{z.pace}</span>
          </div>
        ))}
      </div>
      <a href="/simulation" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '시뮬레이션' : 'Simulation'} →
      </a>
    </div>
  );
}

function WhatIfWidget({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const pred5k = intel.racePredictions.find(r => r.label === '5K');
  return (
    <div className="text-center py-2">
      <span className="text-3xl">🔄</span>
      <p className="text-sm font-medium mt-2">{lang === 'ko' ? 'What-If 시뮬레이터' : 'What-If Simulator'}</p>
      {pred5k && (
        <p className="text-xs text-text-muted mt-1">
          {lang === 'ko' ? `현재 5K: ${pred5k.time}` : `Current 5K: ${pred5k.time}`}
        </p>
      )}
      <p className="text-[10px] text-text-muted mt-1">
        {lang === 'ko' ? '체중, 날씨, 코스를 바꿔보세요' : 'Adjust weight, weather, course'}
      </p>
      <a href="/simulation" className="inline-block mt-3 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? '시뮬레이터 열기' : 'Open Simulator'} →
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Expanded Views (detail content shown inline)
// ═══════════════════════════════════════════════

function StatsOverviewExpanded({ data, lang }: { data: EnrichedRunData; lang: 'en' | 'ko' }) {
  const { monthlyVolume, locations } = data;
  const recent12 = monthlyVolume.slice(-12);
  const maxKm = Math.max(...recent12.map(m => m.km), 1);
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          {lang === 'ko' ? '월별 거리 (12개월)' : 'Monthly Distance (12mo)'}
        </h4>
        <div className="flex items-end gap-1.5 h-28">
          {recent12.map((m) => {
            const h = (m.km / maxKm) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-mono text-text-muted">{m.km.toFixed(0)}</span>
                <div className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                <span className="text-[9px] text-text-muted">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>
      {locations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            {lang === 'ko' ? '러닝 위치' : 'Locations'}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {locations.slice(0, 10).map(loc => (
              <span key={loc} className="px-2 py-1 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20">{loc}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecentActivitiesExpanded({ data, lang }: { data: EnrichedRunData; lang: 'en' | 'ko' }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
        {lang === 'ko' ? '전체 활동 (25개)' : 'All Activities (25)'}
      </h4>
      <div className="space-y-0 divide-y divide-border max-h-[400px] overflow-y-auto">
        {data.runs.slice(0, 25).map((r, i) => (
          <div key={i} className="flex items-center justify-between py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{r.name}</p>
              <p className="text-xs text-text-muted">{r.dateFull} · {r.locationFlag} {r.location}</p>
            </div>
            <div className="flex gap-3 shrink-0 text-xs font-mono text-text-muted">
              <span className="text-primary">{r.distance}</span>
              <span>{r.pace}/km</span>
              <span>{r.time}</span>
              <span>{r.elevation ?? 0}m ↑</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DNARadarExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { personality } = intel;
  const colors = ['#10b981', '#22d3ee', '#818cf8', '#f59e0b', '#ef4444'];
  const labels = [t('dna.consistency', lang), t('dna.speed', lang), t('dna.endurance', lang), t('dna.variety', lang), t('dna.volume', lang)];
  const scores = [personality.scores.consistency, personality.scores.speed, personality.scores.endurance, personality.scores.variety, personality.scores.volume];
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '특성 상세 분석' : 'Trait Breakdown'}
      </h4>
      <div className="space-y-3">
        {scores.map((score, i) => (
          <div key={labels[i]}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{labels[i]}</span>
              <span className="font-mono font-bold" style={{ color: colors[i] }}>{score.toFixed(1)} / 5</span>
            </div>
            <div className="h-2.5 rounded-full bg-bg overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(score / 5) * 100}%`, backgroundColor: colors[i] }} />
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              {score >= 4 ? (lang === 'ko' ? '매우 우수' : 'Excellent')
                : score >= 3 ? (lang === 'ko' ? '양호' : 'Good')
                : score >= 2 ? (lang === 'ko' ? '개선 여지' : 'Room for improvement')
                : (lang === 'ko' ? '집중 훈련 필요' : 'Needs focus')}
            </p>
          </div>
        ))}
      </div>
      <a href="/dna" className="inline-block mt-4 text-xs text-primary hover:text-primary-hover transition-colors">
        {lang === 'ko' ? 'DNA 상세 보기' : 'View Full DNA'} →
      </a>
    </div>
  );
}

function PaceTrendExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const points = intel.paceTrend;
  if (points.length < 2) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
        {lang === 'ko' ? '전체 페이스 추이' : 'Full Pace Trend'}
      </h4>
      <p className="text-sm text-primary font-medium mb-3">{intel.paceImprovement}</p>
      <div className="space-y-0 divide-y divide-border max-h-[300px] overflow-y-auto">
        {points.map((p) => (
          <div key={p.weekKey} className="flex items-center justify-between py-1.5 text-xs">
            <span className="text-text-muted">{p.week}</span>
            <div className="flex gap-3 font-mono">
              <span className="text-primary">{Math.floor(p.avgPace / 60)}:{String(Math.round(p.avgPace % 60)).padStart(2, '0')}/km</span>
              <span className="text-accent">{p.distance.toFixed(1)} km</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YearComparisonExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const years = intel.yearComparison;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '연도별 상세 비교' : 'Year-by-Year Detail'}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {years.map(y => (
          <div key={y.year} className="rounded-lg border border-border p-3">
            <p className="text-sm font-bold mb-1">{y.year}</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-text-muted">{lang === 'ko' ? '총 거리' : 'Distance'}</span>
              <span className="font-mono text-right text-primary">{y.totalKm.toFixed(0)} km</span>
              <span className="text-text-muted">{lang === 'ko' ? '총 러닝' : 'Runs'}</span>
              <span className="font-mono text-right">{y.totalRuns}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunHeatmapExpanded({ data, lang }: { data: EnrichedRunData; lang: 'en' | 'ko' }) {
  const monthMap = new Map<string, { km: number; count: number }>();
  for (const run of data.runs) {
    const key = run.date.slice(0, 7);
    const prev = monthMap.get(key) || { km: 0, count: 0 };
    monthMap.set(key, { km: prev.km + run.distanceKm, count: prev.count + 1 });
  }
  const months = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '월별 요약 (12개월)' : 'Monthly Summary (12mo)'}
      </h4>
      <div className="space-y-0 divide-y divide-border">
        {months.map(([month, d]) => (
          <div key={month} className="flex items-center justify-between py-2 text-sm">
            <span className="font-medium">{month}</span>
            <div className="flex gap-4 text-xs font-mono text-text-muted">
              <span className="text-primary">{d.km.toFixed(1)} km</span>
              <span>{d.count} runs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Personal Records Expanded ──
function PersonalRecordsExpanded({ data, lang }: { data: EnrichedRunData; lang: 'en' | 'ko' }) {
  const distances = [1, 3, 5, 10, 21.1, 42.2];
  const labels: Record<number, string> = { 1: '1K', 3: '3K', 5: '5K', 10: '10K', 21.1: 'Half', 42.2: 'Marathon' };
  const prs = distances.map(d => {
    const eligible = data.runs.filter(r => r.distanceKm >= d * 0.95);
    if (eligible.length === 0) return null;
    const best = eligible.reduce((a, b) => a.paceSecsPerKm < b.paceSecsPerKm ? a : b);
    return { dist: d, label: labels[d], pace: best.pace, date: best.date, name: best.name, time: best.time };
  }).filter(Boolean) as { dist: number; label: string; pace: string; date: string; name: string; time: string }[];
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '거리별 베스트' : 'Personal Bests by Distance'}
      </h4>
      <div className="space-y-0 divide-y divide-border">
        {prs.map(pr => (
          <div key={pr.label} className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-bold text-primary">{pr.label}</span>
              <span className="text-[10px] text-text-muted ml-2">{pr.date}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-bold">{pr.time}</span>
              <span className="text-[10px] text-text-muted ml-2">{pr.pace}/km</span>
            </div>
          </div>
        ))}
      </div>
      {prs.length === 0 && <p className="text-sm text-text-muted">{lang === 'ko' ? '데이터 부족' : 'Not enough data'}</p>}
    </div>
  );
}

// ── Trait Bars Expanded ──
function TraitBarsExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { personality } = intel;
  const traits = [
    { key: 'consistency', label: lang === 'ko' ? '일관성' : 'Consistency', score: personality.scores.consistency, color: '#10b981', desc: lang === 'ko' ? '규칙적으로 러닝하는 정도' : 'How regularly you run' },
    { key: 'speed', label: lang === 'ko' ? '속도' : 'Speed', score: personality.scores.speed, color: '#22d3ee', desc: lang === 'ko' ? '평균 페이스 대비 실력' : 'Pace capability vs average' },
    { key: 'endurance', label: lang === 'ko' ? '지구력' : 'Endurance', score: personality.scores.endurance, color: '#818cf8', desc: lang === 'ko' ? '장거리 러닝 능력' : 'Long distance capability' },
    { key: 'variety', label: lang === 'ko' ? '다양성' : 'Variety', score: personality.scores.variety, color: '#f59e0b', desc: lang === 'ko' ? '다양한 루트/거리 탐색' : 'Route and distance variety' },
    { key: 'volume', label: lang === 'ko' ? '볼륨' : 'Volume', score: personality.scores.volume, color: '#ef4444', desc: lang === 'ko' ? '총 러닝 거리' : 'Total running volume' },
  ];
  const total = traits.reduce((s, t) => s + t.score, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {lang === 'ko' ? '특성 상세 분석' : 'Trait Analysis'}
        </h4>
        <span className="text-xs font-mono text-primary font-bold">{total}/25</span>
      </div>
      <div className="space-y-3">
        {traits.map(tr => (
          <div key={tr.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: tr.color }}>{tr.label}</span>
              <span className="text-sm font-mono font-bold" style={{ color: tr.color }}>{tr.score}/5</span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden mb-1">
              <div className="h-full rounded-full" style={{ width: `${(tr.score / 5) * 100}%`, backgroundColor: tr.color }} />
            </div>
            <p className="text-[10px] text-text-muted">{tr.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Training Load Expanded ──
function TrainingLoadExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { trainingLoad, paceTrend } = intel;
  const recent = paceTrend.slice(-4);
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '트레이닝 부하 상세' : 'Training Load Detail'}
      </h4>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '급성 부하' : 'Acute'}</p>
          <p className="text-lg font-bold font-mono text-primary">{trainingLoad.acute.toFixed(0)}</p>
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '최근 7일' : 'Last 7d'}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '만성 부하' : 'Chronic'}</p>
          <p className="text-lg font-bold font-mono text-accent">{trainingLoad.chronic.toFixed(0)}</p>
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '최근 28일' : 'Last 28d'}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted">ACWR</p>
          <p className="text-lg font-bold font-mono" style={{ color: trainingLoad.zoneColor }}>{trainingLoad.ratio.toFixed(2)}</p>
          <p className="text-[10px] font-medium" style={{ color: trainingLoad.zoneColor }}>{trainingLoad.zoneLabel}</p>
        </div>
      </div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
        {lang === 'ko' ? '최근 4주 거리' : 'Last 4 Weeks Distance'}
      </h4>
      <div className="space-y-0 divide-y divide-border">
        {recent.map(w => (
          <div key={w.weekKey} className="flex justify-between py-1.5 text-xs">
            <span className="text-text-muted">{w.week}</span>
            <span className="font-mono text-primary">{w.distance.toFixed(1)} km</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Race Predictions Expanded ──
function RacePredictionsExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const preds = intel.racePredictions;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '레이스 예측 상세' : 'Race Prediction Detail'}
      </h4>
      {preds.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {preds.map(rp => (
            <div key={rp.label} className="p-3 rounded-lg bg-bg text-center">
              <p className="text-xs text-text-muted mb-1">{rp.label}</p>
              <p className="text-xl font-extrabold font-mono text-accent">{rp.time}</p>
              <p className="text-[10px] text-text-muted mt-1">{rp.pace}/km</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">{lang === 'ko' ? '3km 이상 러닝 데이터 필요' : 'Need a 3km+ run'}</p>
      )}
    </div>
  );
}

// ── Recovery Expanded ──
function RecoveryExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { recovery } = intel;
  const isWellRested = recovery.avgRestDays >= 2;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '회복 상세' : 'Recovery Detail'}
      </h4>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-bg">
        <span className="text-3xl">{isWellRested ? '💚' : '⚡'}</span>
        <div>
          <p className="text-sm font-bold">{isWellRested ? (lang === 'ko' ? '충분한 회복' : 'Well Rested') : (lang === 'ko' ? '회복 필요' : 'Needs Recovery')}</p>
          <p className="text-xs text-text-muted">
            {lang === 'ko' ? `평균 휴식 간격: ${recovery.avgRestDays.toFixed(1)}일` : `Avg rest gap: ${recovery.avgRestDays.toFixed(1)}d`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '평균 휴식 간격' : 'Avg Rest Gap'}</p>
          <p className="text-lg font-bold font-mono text-primary">{recovery.avgRestDays.toFixed(1)}d</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '고강도 후 휴식' : 'Rest After Hard'}</p>
          <p className="text-lg font-bold font-mono text-accent">{recovery.avgRestAfterHard.toFixed(1)}d</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '최장 연속 러닝' : 'Longest Streak'}</p>
          <p className="text-lg font-bold font-mono text-warm">{recovery.longestStreak}d</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '최장 휴식' : 'Longest Rest'}</p>
          <p className="text-lg font-bold font-mono text-text-muted">{recovery.longestRest}d</p>
        </div>
      </div>
    </div>
  );
}

// ── Conditions Expanded ──
function ConditionsExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { conditions } = intel;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '최적 조건 상세' : 'Optimal Conditions'}
      </h4>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{lang === 'ko' ? '최고의 요일' : 'Best Day'}</p>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">{conditions.bestDay.day}</span>
            <span className="text-sm font-mono text-primary">{conditions.bestDay.pace}/km</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{lang === 'ko' ? '최고의 시간' : 'Best Time'}</p>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">{conditions.bestHour.hour}</span>
            <span className="text-sm font-mono text-accent">{conditions.bestHour.pace}/km</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{lang === 'ko' ? '최적 거리' : 'Sweet Spot Distance'}</p>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">{conditions.sweetSpotDistance.range}</span>
            <span className="text-sm font-mono text-warm">{conditions.sweetSpotDistance.pace}/km</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Distribution Expanded ──
function DistributionExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const dist = intel.distribution;
  const maxCount = Math.max(...dist.map(d => d.count), 1);
  const total = dist.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '거리 분포 상세' : 'Distance Distribution Detail'}
      </h4>
      <div className="space-y-2">
        {dist.map(d => (
          <div key={d.label}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="font-medium">{d.label}</span>
              <span className="text-text-muted">{d.count} runs ({d.percentage}%)</span>
            </div>
            <div className="h-3 rounded-full bg-bg overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(d.count / maxCount) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border text-xs text-text-muted text-center">
        {lang === 'ko' ? `총 ${total}회 러닝` : `${total} total runs`}
      </div>
    </div>
  );
}

// ── Route Familiarity Expanded ──
function RouteFamiliarityExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const routes = intel.routes;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '루트 상세' : 'Route Details'}
      </h4>
      <div className="space-y-0 divide-y divide-border max-h-[250px] overflow-y-auto">
        {routes.map((r, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.flag} {r.location}</p>
              <p className="text-[10px] text-text-muted">
                {r.count} {lang === 'ko' ? '회' : 'runs'} · {r.improvement}
              </p>
            </div>
            <span className="text-xs font-mono text-primary ml-2 shrink-0">{r.bestPace}/km</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Milestones Expanded ──
function MilestonesExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const milestones = intel.milestones;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '마일스톤 상세' : 'Milestone Progress'}
      </h4>
      <div className="space-y-3">
        {milestones.map((m, i) => {
          const pct = Math.min(m.progress, 100);
          const done = m.progress >= 100;
          return (
            <div key={i} className={`p-3 rounded-lg ${done ? 'bg-primary/10 border border-primary/20' : 'bg-bg'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">{done ? '✅' : '🎯'} {m.label}</span>
                <span className={`text-xs font-mono font-bold ${done ? 'text-primary' : 'text-text-muted'}`}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg overflow-hidden mb-1">
                <div className={`h-full rounded-full ${done ? 'bg-primary' : 'bg-primary/50'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>{lang === 'ko' ? `목표: ${m.target}` : `Target: ${m.target}`}</span>
                {m.estimatedDate && !done && <span>ETA {m.estimatedDate}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Today's Plan Expanded ──
function TodaysPlanExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const plan = intel.todaysPlan;
  const rec = plan.recommended;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? '오늘의 플랜 상세' : "Today's Plan Detail"}
      </h4>
      <div className="p-3 rounded-lg bg-bg mb-3">
        <p className="text-sm font-bold mb-1">{plan.headline}</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{rec.activity}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">{rec.distance}</span>
        </div>
        <p className="text-xs text-text-muted">{lang === 'ko' ? '추천 페이스' : 'Pace'}: {rec.pace} · {rec.duration}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="p-2 rounded-lg bg-bg text-center">
          <p className="text-text-muted">{lang === 'ko' ? '안전 최대 거리' : 'Safe Max'}</p>
          <p className="font-bold text-primary font-mono">{plan.safeMaxKm.toFixed(1)} km</p>
        </div>
        <div className="p-2 rounded-lg bg-bg text-center">
          <p className="text-text-muted">{lang === 'ko' ? '위험 거리' : 'Danger Zone'}</p>
          <p className="font-bold text-danger font-mono">{plan.dangerKm.toFixed(1)} km</p>
        </div>
      </div>
      {plan.advice.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-muted mb-2">{lang === 'ko' ? '코치 조언' : 'Coach Tips'}</p>
          <div className="space-y-1.5">
            {plan.advice.map((a, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-primary shrink-0">•</span>
                <span className="text-text-muted">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Coach Advice Expanded ──
function CoachAdviceExpanded({ intel, lang }: { intel: IntelligenceData; lang: 'en' | 'ko' }) {
  const { todaysPlan, recovery, trainingLoad } = intel;
  const rec = todaysPlan.recommended;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        {lang === 'ko' ? 'AI 코치 종합 분석' : 'AI Coach Analysis'}
      </h4>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted uppercase mb-1">{lang === 'ko' ? '회복 상태' : 'Recovery'}</p>
          <p className="text-sm">{recovery.avgRestDays >= 2 ? '💚' : '⚡'} {lang === 'ko' ? `평균 ${recovery.avgRestDays.toFixed(1)}일 휴식` : `Avg ${recovery.avgRestDays.toFixed(1)}d rest`}</p>
          <p className="text-xs text-text-muted mt-1">
            {lang === 'ko' ? `최장 연속 ${recovery.longestStreak}일` : `Longest streak: ${recovery.longestStreak}d`}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted uppercase mb-1">{lang === 'ko' ? '부하 상태' : 'Load Status'}</p>
          <p className="text-sm font-bold" style={{ color: trainingLoad.zoneColor }}>
            ACWR {trainingLoad.ratio.toFixed(2)} — {trainingLoad.zoneLabel}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-bg">
          <p className="text-[10px] text-text-muted uppercase mb-1">{lang === 'ko' ? '오늘 추천' : "Today's Recommendation"}</p>
          <p className="text-sm font-medium text-primary">{rec.activity}: {rec.distance} @ {rec.pace}</p>
        </div>
        {todaysPlan.advice.length > 0 && (
          <div className="space-y-1">
            {todaysPlan.advice.map((a, i) => (
              <p key={i} className="text-xs text-text-muted">• {a}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

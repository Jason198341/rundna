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
        {displayOrder.map((id, idx) => (
          <React.Fragment key={id}>
            <div
              data-widget-idx={idx}
              className={`flex-1 basis-[calc(50%-0.625rem)] min-w-[280px] transition-transform duration-200 ${
                dragWidgetId === id ? 'z-10 relative' : ''
              }`}
              draggable
              onDragStart={e => handleDragStart(id, e)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={e => handleTouchStart(id, e)}
              onTouchEnd={handleWidgetTouchEnd}
            >
              <WidgetShell
                id={id}
                lang={lang}
                index={idx}
                onRemove={handleRemoveWidget}
                isDragging={dragWidgetId === id}
              >
                {renderWidget(id, data, lang)}
              </WidgetShell>
            </div>
            {(idx + 1) % 8 === 0 && idx + 1 < displayOrder.length && (
              <div className="w-full basis-full"><AdBreak className="my-4" /></div>
            )}
          </React.Fragment>
        ))}
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

    case 'run-film':
    case 'ghost-comparison':
    case 'monthly-highlight':
    case 'hidden-crowns':
    case 'snipe-missions':
    case 'segment-xray':
    case 'shoe-health':
    case 'shoe-graveyard':
    case 'dna-battle':
    case 'training-twin':
    case 'race-simulation':
    case 'pacing-card':
    case 'what-if':
      return <ComingSoon lang={lang} />;

    default:
      return null;
  }
}

function ComingSoon({ lang }: { lang: 'en' | 'ko' }) {
  return (
    <div className="text-center py-4">
      <p className="text-2xl mb-2">🚧</p>
      <p className="text-sm text-text-muted">
        {lang === 'ko' ? '곧 출시됩니다' : 'Coming Soon'}
      </p>
    </div>
  );
}

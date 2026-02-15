'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { EnrichedRunData } from '@/lib/strava';
import type { IntelligenceData } from '@/lib/strava-analytics';
import type { WidgetId } from '@/lib/widget-types';
import { getWidgetDef } from '@/lib/widget-types';
import type { WidgetPreferences } from '@/lib/widget-store';
import { loadPreferences, savePreferences, applySkin } from '@/lib/widget-store';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import WidgetShell from '@/components/widgets/WidgetShell';
import {
  StatsOverview, PersonalRecords, FeatureNav, RecentActivities,
  DNARadar, TraitBars, TrainingLoadWidget, RacePredictions,
  RecoveryStats, CoachAdvice, TodaysPlanWidget, PaceTrend,
  ConditionsWidget, YearComparison, DistributionWidget,
  RouteFamiliarityWidget, MilestonesWidget, WeeklyChallenge,
} from '@/components/widgets/CoreWidgets';

// Lazy-load the customize panel (bundle-dynamic-imports best practice)
const CustomizePanel = dynamic(() => import('@/components/widgets/CustomizePanel'), {
  ssr: false,
});

interface Props {
  userName: string;
}

// Data source types
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

  // Apply skin on mount
  useEffect(() => {
    applySkin(prefs.skin);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute which data sources are needed (js-set-map-lookups best practice)
  const neededDeps = new Set(
    prefs.widgetOrder
      .filter(id => prefs.enabledWidgets.includes(id))
      .flatMap(id => getWidgetDef(id)?.dataDeps ?? [])
  );

  // Fetch data based on widget dependencies (async-parallel best practice)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 200);

    const fetches: Promise<void>[] = [];

    // Always fetch runData if any widget needs it or intelligence (intelligence is derived from runData server-side)
    const needsRun = neededDeps.has('runData') || neededDeps.has('intelligence');

    if (needsRun) {
      // Fetch both in parallel — intelligence API fetches its own data server-side
      const runPromise = fetch('/api/strava/data').then(r => {
        if (!r.ok) throw new Error('Failed to load run data');
        return r.json();
      });
      const intelPromise = fetch('/api/strava/intelligence').then(r => {
        if (!r.ok) throw new Error('Failed to load intelligence');
        return r.json();
      });

      // async-parallel: start both, await together
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

  // Build ordered list of enabled widgets
  const orderedWidgets = prefs.widgetOrder.filter(id => prefs.enabledWidgets.includes(id));

  return (
    <div>
      {/* Welcome + Customize Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {t('dash.welcome', lang)} {userName.split(' ')[0]}
          </h1>
          <p className="text-text-muted mt-1">{t('dash.overview', lang)}</p>
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

      {/* Widget Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {orderedWidgets.map(id => (
          <WidgetShell
            key={id}
            id={id}
            size={prefs.widgetSizes[id]}
            lang={lang}
            onRemove={handleRemoveWidget}
          >
            {renderWidget(id, data, lang)}
          </WidgetShell>
        ))}
      </div>

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
// Maps each WidgetId to its component with correct data
function renderWidget(id: WidgetId, data: DataSources, lang: 'en' | 'ko'): React.ReactNode {
  const { runData, intelligence } = data;

  switch (id) {
    // ── Core widgets ──
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

    // ── Level 1-5 widgets (placeholder until implemented) ──
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

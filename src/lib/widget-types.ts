// Widget system — type definitions, registry, presets, and skins

// ── Widget Size ──
export type WidgetSize = 'S' | 'M' | 'L' | 'XL';

// ── Widget Category ──
export type WidgetCategory =
  | 'core'        // existing features
  | 'film'        // Level 1: Run Film
  | 'segment'     // Level 2: Segment Sniper
  | 'shoe'        // Level 3: Shoe Graveyard
  | 'battle'      // Level 4: DNA Battle
  | 'twin';       // Level 5: Digital Twin

// ── Widget ID (unique key for each widget) ──
export type WidgetId =
  // Core (existing)
  | 'stats-overview'
  | 'personal-records'
  | 'feature-nav'
  | 'recent-activities'
  | 'dna-radar'
  | 'trait-bars'
  | 'training-load'
  | 'race-predictions'
  | 'recovery-stats'
  | 'coach-advice'
  | 'todays-plan'
  | 'pace-trend'
  | 'conditions'
  | 'year-comparison'
  | 'distance-distribution'
  | 'route-familiarity'
  | 'milestones'
  // Level 1: Run Film
  | 'run-film'
  | 'ghost-comparison'
  | 'monthly-highlight'
  // Level 2: Segment Sniper
  | 'hidden-crowns'
  | 'snipe-missions'
  | 'segment-xray'
  // Level 3: Shoe Graveyard
  | 'shoe-health'
  | 'shoe-graveyard'
  // Level 4: DNA Battle
  | 'dna-battle'
  | 'training-twin'
  | 'weekly-challenge'
  // Level 5: Digital Twin
  | 'race-simulation'
  | 'pacing-card'
  | 'what-if';

// ── Widget Definition ──
export interface WidgetDef {
  id: WidgetId;
  titleKey: string;      // i18n key
  icon: string;
  category: WidgetCategory;
  sizes: WidgetSize[];   // supported sizes
  defaultSize: WidgetSize;
  dataDeps: ('runData' | 'intelligence' | 'streams' | 'segments' | 'gear')[];
  tier: 'free' | 'pro';
}

// ── Widget Registry ──
export const WIDGET_REGISTRY: WidgetDef[] = [
  // ── Core ──
  { id: 'stats-overview', titleKey: 'widget.statsOverview', icon: '📊', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['runData'], tier: 'free' },
  { id: 'personal-records', titleKey: 'widget.personalRecords', icon: '🏆', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['runData'], tier: 'free' },
  { id: 'feature-nav', titleKey: 'widget.featureNav', icon: '🧭', category: 'core', sizes: ['M', 'L'], defaultSize: 'L', dataDeps: [], tier: 'free' },
  { id: 'recent-activities', titleKey: 'widget.recentActivities', icon: '🏃', category: 'core', sizes: ['L', 'XL'], defaultSize: 'XL', dataDeps: ['runData'], tier: 'free' },
  { id: 'dna-radar', titleKey: 'widget.dnaRadar', icon: '🧬', category: 'core', sizes: ['M', 'L'], defaultSize: 'L', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'trait-bars', titleKey: 'widget.traitBars', icon: '📈', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'training-load', titleKey: 'widget.trainingLoad', icon: '⚡', category: 'core', sizes: ['S', 'M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'race-predictions', titleKey: 'widget.racePredictions', icon: '🔮', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'recovery-stats', titleKey: 'widget.recoveryStats', icon: '💤', category: 'core', sizes: ['S', 'M'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'coach-advice', titleKey: 'widget.coachAdvice', icon: '🤖', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'todays-plan', titleKey: 'widget.todaysPlan', icon: '📋', category: 'core', sizes: ['M', 'L'], defaultSize: 'L', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'pace-trend', titleKey: 'widget.paceTrend', icon: '📉', category: 'core', sizes: ['M', 'L'], defaultSize: 'L', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'conditions', titleKey: 'widget.conditions', icon: '🌤️', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'year-comparison', titleKey: 'widget.yearComparison', icon: '📅', category: 'core', sizes: ['L', 'XL'], defaultSize: 'L', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'distance-distribution', titleKey: 'widget.distDistribution', icon: '📊', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'route-familiarity', titleKey: 'widget.routeFamiliarity', icon: '🗺️', category: 'core', sizes: ['M', 'L'], defaultSize: 'L', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'milestones', titleKey: 'widget.milestones', icon: '🎯', category: 'core', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },

  // ── Level 1: Run Film ──
  { id: 'run-film', titleKey: 'widget.runFilm', icon: '🎬', category: 'film', sizes: ['L', 'XL'], defaultSize: 'L', dataDeps: ['streams'], tier: 'free' },
  { id: 'ghost-comparison', titleKey: 'widget.ghostComparison', icon: '👻', category: 'film', sizes: ['L'], defaultSize: 'L', dataDeps: ['streams'], tier: 'pro' },
  { id: 'monthly-highlight', titleKey: 'widget.monthlyHighlight', icon: '🎞️', category: 'film', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['runData', 'streams'], tier: 'free' },

  // ── Level 2: Segment Sniper ──
  { id: 'hidden-crowns', titleKey: 'widget.hiddenCrowns', icon: '👑', category: 'segment', sizes: ['M', 'L'], defaultSize: 'L', dataDeps: ['segments'], tier: 'free' },
  { id: 'snipe-missions', titleKey: 'widget.snipeMissions', icon: '🎯', category: 'segment', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['segments'], tier: 'free' },
  { id: 'segment-xray', titleKey: 'widget.segmentXray', icon: '📉', category: 'segment', sizes: ['L', 'XL'], defaultSize: 'L', dataDeps: ['segments', 'streams'], tier: 'pro' },

  // ── Level 3: Shoe Graveyard ──
  { id: 'shoe-health', titleKey: 'widget.shoeHealth', icon: '👟', category: 'shoe', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['gear'], tier: 'free' },
  { id: 'shoe-graveyard', titleKey: 'widget.shoeGraveyard', icon: '🪦', category: 'shoe', sizes: ['L', 'XL'], defaultSize: 'L', dataDeps: ['gear'], tier: 'free' },

  // ── Level 4: DNA Battle ──
  { id: 'dna-battle', titleKey: 'widget.dnaBattle', icon: '⚔️', category: 'battle', sizes: ['L', 'XL'], defaultSize: 'L', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'training-twin', titleKey: 'widget.trainingTwin', icon: '👥', category: 'battle', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'pro' },
  { id: 'weekly-challenge', titleKey: 'widget.weeklyChallenge', icon: '🏅', category: 'battle', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence', 'runData'], tier: 'free' },

  // ── Level 5: Digital Twin ──
  { id: 'race-simulation', titleKey: 'widget.raceSimulation', icon: '🏁', category: 'twin', sizes: ['L', 'XL'], defaultSize: 'L', dataDeps: ['intelligence', 'streams'], tier: 'pro' },
  { id: 'pacing-card', titleKey: 'widget.pacingCard', icon: '📋', category: 'twin', sizes: ['M', 'L'], defaultSize: 'M', dataDeps: ['intelligence'], tier: 'free' },
  { id: 'what-if', titleKey: 'widget.whatIf', icon: '🔄', category: 'twin', sizes: ['L'], defaultSize: 'L', dataDeps: ['intelligence', 'streams'], tier: 'pro' },
];

export function getWidgetDef(id: WidgetId): WidgetDef | undefined {
  return WIDGET_REGISTRY.find(w => w.id === id);
}

// ── Presets ──
export type PresetId = 'speed-demon' | 'ultra-beast' | 'data-nerd' | 'beginner' | 'custom';

export interface Preset {
  id: PresetId;
  titleKey: string;
  icon: string;
  description: string;
  widgets: WidgetId[];
}

export const PRESETS: Preset[] = [
  {
    id: 'speed-demon',
    titleKey: 'preset.speedDemon',
    icon: '⚡',
    description: 'Optimized for speed-focused runners',
    widgets: ['stats-overview', 'training-load', 'pace-trend', 'race-predictions', 'run-film', 'hidden-crowns', 'todays-plan', 'pacing-card'],
  },
  {
    id: 'ultra-beast',
    titleKey: 'preset.ultraBeast',
    icon: '🦁',
    description: 'Built for distance and volume chasers',
    widgets: ['stats-overview', 'training-load', 'recovery-stats', 'year-comparison', 'shoe-health', 'route-familiarity', 'milestones', 'todays-plan'],
  },
  {
    id: 'data-nerd',
    titleKey: 'preset.dataNerd',
    icon: '📊',
    description: 'All widgets on. Maximum data.',
    widgets: [
      'stats-overview', 'personal-records', 'dna-radar', 'trait-bars', 'training-load',
      'race-predictions', 'recovery-stats', 'pace-trend', 'conditions', 'year-comparison',
      'distance-distribution', 'route-familiarity', 'milestones', 'coach-advice', 'todays-plan',
      'run-film', 'hidden-crowns', 'shoe-health', 'weekly-challenge', 'pacing-card',
    ],
  },
  {
    id: 'beginner',
    titleKey: 'preset.beginner',
    icon: '🌱',
    description: 'Simple view for new runners',
    widgets: ['stats-overview', 'coach-advice', 'todays-plan', 'weekly-challenge', 'recent-activities'],
  },
  {
    id: 'custom',
    titleKey: 'preset.custom',
    icon: '🎨',
    description: 'Build your own dashboard',
    widgets: [],
  },
];

// ── Skins ──
export type SkinId = 'dark-runner' | 'dawn-patrol' | 'ocean-mile' | 'lava-flow' | 'trail-spirit' | 'ice-breaker';

export interface Skin {
  id: SkinId;
  titleKey: string;
  icon: string;
  colors: {
    bg: string;
    surface: string;
    border: string;
    primary: string;
    accent: string;
    warm: string;
  };
}

export const SKINS: Skin[] = [
  {
    id: 'dark-runner',
    titleKey: 'skin.darkRunner',
    icon: '🌑',
    colors: { bg: '#060a0e', surface: '#0d1117', border: '#1e2a3a', primary: '#10b981', accent: '#22d3ee', warm: '#f59e0b' },
  },
  {
    id: 'dawn-patrol',
    titleKey: 'skin.dawnPatrol',
    icon: '🌅',
    colors: { bg: '#0f0a1a', surface: '#1a1028', border: '#2d1f4e', primary: '#f97316', accent: '#a855f7', warm: '#fbbf24' },
  },
  {
    id: 'ocean-mile',
    titleKey: 'skin.oceanMile',
    icon: '🌊',
    colors: { bg: '#041318', surface: '#0a1f2e', border: '#153448', primary: '#06b6d4', accent: '#2dd4bf', warm: '#38bdf8' },
  },
  {
    id: 'lava-flow',
    titleKey: 'skin.lavaFlow',
    icon: '🔥',
    colors: { bg: '#120808', surface: '#1c0e0e', border: '#3a1a1a', primary: '#ef4444', accent: '#f97316', warm: '#fbbf24' },
  },
  {
    id: 'trail-spirit',
    titleKey: 'skin.trailSpirit',
    icon: '🌿',
    colors: { bg: '#080e08', surface: '#0e170e', border: '#1e3a1e', primary: '#22c55e', accent: '#a3e635', warm: '#84cc16' },
  },
  {
    id: 'ice-breaker',
    titleKey: 'skin.iceBreaker',
    icon: '❄️',
    colors: { bg: '#0a0e14', surface: '#111827', border: '#1f2937', primary: '#93c5fd', accent: '#c4b5fd', warm: '#e5e7eb' },
  },
];

export function getSkin(id: SkinId): Skin {
  return SKINS.find(s => s.id === id) ?? SKINS[0];
}

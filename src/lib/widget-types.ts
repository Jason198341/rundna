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

// Full color palette matching every CSS variable in globals.css
export interface SkinColors {
  bg: string;
  surface: string;
  'surface-hover': string;
  border: string;
  text: string;
  'text-muted': string;
  primary: string;
  'primary-hover': string;
  'primary-dim': string;
  accent: string;
  'accent-dim': string;
  warm: string;
  danger: string;
  glow: string;
}

export interface Skin {
  id: SkinId;
  titleKey: string;
  icon: string;
  colors: SkinColors;
  preview: string[]; // 6 color dots for the selector
}

export const SKINS: Skin[] = [
  {
    id: 'dark-runner',
    titleKey: 'skin.darkRunner',
    icon: '🌑',
    preview: ['#060a0e', '#0d1117', '#10b981', '#22d3ee', '#f59e0b', '#ef4444'],
    colors: {
      bg: '#060a0e', surface: '#0d1117', 'surface-hover': '#161b22', border: '#1e2a3a',
      text: '#e6edf3', 'text-muted': '#7d8590',
      primary: '#10b981', 'primary-hover': '#34d399', 'primary-dim': '#10b98120',
      accent: '#22d3ee', 'accent-dim': '#22d3ee20',
      warm: '#f59e0b', danger: '#ef4444', glow: '#10b98140',
    },
  },
  {
    id: 'dawn-patrol',
    titleKey: 'skin.dawnPatrol',
    icon: '🌅',
    preview: ['#0f0a1a', '#1a1028', '#f97316', '#a855f7', '#fbbf24', '#ef4444'],
    colors: {
      bg: '#0f0a1a', surface: '#1a1028', 'surface-hover': '#251840', border: '#2d1f4e',
      text: '#f0e6ff', 'text-muted': '#9b8ab8',
      primary: '#f97316', 'primary-hover': '#fb923c', 'primary-dim': '#f9731620',
      accent: '#a855f7', 'accent-dim': '#a855f720',
      warm: '#fbbf24', danger: '#f43f5e', glow: '#f9731640',
    },
  },
  {
    id: 'ocean-mile',
    titleKey: 'skin.oceanMile',
    icon: '🌊',
    preview: ['#041318', '#0a1f2e', '#06b6d4', '#2dd4bf', '#38bdf8', '#ef4444'],
    colors: {
      bg: '#041318', surface: '#0a1f2e', 'surface-hover': '#0f2d42', border: '#153448',
      text: '#d1f0fa', 'text-muted': '#6ba3be',
      primary: '#06b6d4', 'primary-hover': '#22d3ee', 'primary-dim': '#06b6d420',
      accent: '#2dd4bf', 'accent-dim': '#2dd4bf20',
      warm: '#38bdf8', danger: '#f87171', glow: '#06b6d440',
    },
  },
  {
    id: 'lava-flow',
    titleKey: 'skin.lavaFlow',
    icon: '🔥',
    preview: ['#120808', '#1c0e0e', '#ef4444', '#f97316', '#fbbf24', '#dc2626'],
    colors: {
      bg: '#120808', surface: '#1c0e0e', 'surface-hover': '#2a1414', border: '#3a1a1a',
      text: '#fde8e8', 'text-muted': '#b07070',
      primary: '#ef4444', 'primary-hover': '#f87171', 'primary-dim': '#ef444420',
      accent: '#f97316', 'accent-dim': '#f9731620',
      warm: '#fbbf24', danger: '#dc2626', glow: '#ef444440',
    },
  },
  {
    id: 'trail-spirit',
    titleKey: 'skin.trailSpirit',
    icon: '🌿',
    preview: ['#080e08', '#0e170e', '#22c55e', '#a3e635', '#84cc16', '#ef4444'],
    colors: {
      bg: '#080e08', surface: '#0e170e', 'surface-hover': '#163016', border: '#1e3a1e',
      text: '#d8f5d8', 'text-muted': '#6da06d',
      primary: '#22c55e', 'primary-hover': '#4ade80', 'primary-dim': '#22c55e20',
      accent: '#a3e635', 'accent-dim': '#a3e63520',
      warm: '#84cc16', danger: '#f87171', glow: '#22c55e40',
    },
  },
  {
    id: 'ice-breaker',
    titleKey: 'skin.iceBreaker',
    icon: '❄️',
    preview: ['#0a0e14', '#111827', '#93c5fd', '#c4b5fd', '#e5e7eb', '#f87171'],
    colors: {
      bg: '#0a0e14', surface: '#111827', 'surface-hover': '#1e293b', border: '#1f2937',
      text: '#e2e8f0', 'text-muted': '#94a3b8',
      primary: '#93c5fd', 'primary-hover': '#bfdbfe', 'primary-dim': '#93c5fd20',
      accent: '#c4b5fd', 'accent-dim': '#c4b5fd20',
      warm: '#e5e7eb', danger: '#f87171', glow: '#93c5fd40',
    },
  },
];

export function getSkin(id: SkinId): Skin {
  return SKINS.find(s => s.id === id) ?? SKINS[0];
}

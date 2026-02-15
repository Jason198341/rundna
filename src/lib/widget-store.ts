// Widget preferences — localStorage-backed store
// No external deps (no Zustand) — React Compiler handles re-renders

import type { WidgetId, PresetId, SkinId, WidgetSize } from './widget-types';
import { PRESETS, SKINS } from './widget-types';

const LS_KEY = 'rundna_widgets';

// ── User Preferences Shape ──
export interface WidgetPreferences {
  version: 2;
  preset: PresetId;
  skin: SkinId;
  enabledWidgets: WidgetId[];
  widgetOrder: WidgetId[];
  widgetSizes: Partial<Record<WidgetId, WidgetSize>>;
  // Share setup
  shareCode?: string;
}

// ── Default preferences (beginner preset) ──
const DEFAULT_PREFS: WidgetPreferences = {
  version: 2,
  preset: 'beginner',
  skin: 'dark-runner',
  enabledWidgets: ['stats-overview', 'coach-advice', 'todays-plan', 'weekly-challenge', 'recent-activities', 'feature-nav'],
  widgetOrder: ['stats-overview', 'todays-plan', 'coach-advice', 'weekly-challenge', 'feature-nav', 'recent-activities'],
  widgetSizes: {},
};

// ── Load from localStorage ──
export function loadPreferences(): WidgetPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    if (parsed.version !== 2) return DEFAULT_PREFS;
    return parsed as WidgetPreferences;
  } catch {
    return DEFAULT_PREFS;
  }
}

// ── Save to localStorage ──
export function savePreferences(prefs: WidgetPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

// ── Apply preset ──
export function applyPreset(presetId: PresetId): WidgetPreferences {
  const preset = PRESETS.find(p => p.id === presetId);
  if (!preset || presetId === 'custom') {
    const current = loadPreferences();
    return { ...current, preset: 'custom' };
  }
  const prefs: WidgetPreferences = {
    version: 2,
    preset: presetId,
    skin: loadPreferences().skin,
    enabledWidgets: [...preset.widgets],
    widgetOrder: [...preset.widgets],
    widgetSizes: {},
  };
  savePreferences(prefs);
  return prefs;
}

// ── Apply skin ──
export function applySkin(skinId: SkinId): void {
  const skin = SKINS.find(s => s.id === skinId);
  if (!skin) return;
  const root = document.documentElement;
  root.style.setProperty('--color-bg', skin.colors.bg);
  root.style.setProperty('--color-surface', skin.colors.surface);
  root.style.setProperty('--color-border', skin.colors.border);
  root.style.setProperty('--color-primary', skin.colors.primary);
  root.style.setProperty('--color-accent', skin.colors.accent);
  root.style.setProperty('--color-warm', skin.colors.warm);
  // Update preferences
  const prefs = loadPreferences();
  prefs.skin = skinId;
  savePreferences(prefs);
}

// ── Toggle widget ──
export function toggleWidget(id: WidgetId): WidgetPreferences {
  const prefs = loadPreferences();
  const idx = prefs.enabledWidgets.indexOf(id);
  if (idx >= 0) {
    prefs.enabledWidgets.splice(idx, 1);
    prefs.widgetOrder = prefs.widgetOrder.filter(w => w !== id);
  } else {
    prefs.enabledWidgets.push(id);
    prefs.widgetOrder.push(id);
  }
  prefs.preset = 'custom';
  savePreferences(prefs);
  return prefs;
}

// ── Reorder widgets ──
export function reorderWidgets(from: number, to: number): WidgetPreferences {
  const prefs = loadPreferences();
  const [moved] = prefs.widgetOrder.splice(from, 1);
  prefs.widgetOrder.splice(to, 0, moved);
  prefs.preset = 'custom';
  savePreferences(prefs);
  return prefs;
}

// ── Resize widget ──
export function resizeWidget(id: WidgetId, size: WidgetSize): WidgetPreferences {
  const prefs = loadPreferences();
  prefs.widgetSizes[id] = size;
  savePreferences(prefs);
  return prefs;
}

// ── Generate share code ──
export function generateShareCode(): string {
  const prefs = loadPreferences();
  const payload = {
    p: prefs.preset,
    s: prefs.skin,
    w: prefs.enabledWidgets,
    o: prefs.widgetOrder,
  };
  return btoa(JSON.stringify(payload));
}

// ── Import from share code ──
export function importShareCode(code: string): WidgetPreferences | null {
  try {
    const payload = JSON.parse(atob(code));
    const prefs: WidgetPreferences = {
      version: 2,
      preset: payload.p || 'custom',
      skin: payload.s || 'dark-runner',
      enabledWidgets: payload.w || [],
      widgetOrder: payload.o || payload.w || [],
      widgetSizes: {},
    };
    savePreferences(prefs);
    return prefs;
  } catch {
    return null;
  }
}

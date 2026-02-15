'use client';

import { useState } from 'react';
import type { WidgetId, WidgetCategory, PresetId, SkinId } from '@/lib/widget-types';
import { WIDGET_REGISTRY, PRESETS, SKINS } from '@/lib/widget-types';
import type { WidgetPreferences } from '@/lib/widget-store';
import { applyPreset, applySkin, toggleWidget } from '@/lib/widget-store';
import { t, type Lang } from '@/lib/i18n';

interface Props {
  lang: Lang;
  prefs: WidgetPreferences;
  onUpdate: (prefs: WidgetPreferences) => void;
  onClose: () => void;
}

type Tab = 'presets' | 'skins' | 'widgets';

const CATEGORIES: { id: WidgetCategory; titleKey: string }[] = [
  { id: 'core', titleKey: 'cat.core' },
  { id: 'film', titleKey: 'cat.film' },
  { id: 'segment', titleKey: 'cat.segment' },
  { id: 'shoe', titleKey: 'cat.shoe' },
  { id: 'battle', titleKey: 'cat.battle' },
  { id: 'twin', titleKey: 'cat.twin' },
];

export default function CustomizePanel({ lang, prefs, onUpdate, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('presets');

  const handlePreset = (id: PresetId) => {
    const next = applyPreset(id);
    onUpdate(next);
  };

  const handleSkin = (id: SkinId) => {
    applySkin(id);
    onUpdate({ ...prefs, skin: id });
  };

  const handleToggle = (id: WidgetId) => {
    const next = toggleWidget(id);
    onUpdate(next);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'presets', label: t('widget.presets', lang) },
    { id: 'skins', label: t('widget.skins', lang) },
    { id: 'widgets', label: t('widget.widgets', lang) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border bg-surface flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold">{t('widget.customize', lang)}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {tabs.map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex-1 text-sm py-2.5 font-medium transition-colors ${
                tab === tb.id ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ── Presets Tab ── */}
          {tab === 'presets' && (
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePreset(p.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    prefs.preset === p.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-sm font-semibold">{t(p.titleKey, lang)}</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">{p.description}</p>
                  {p.id !== 'custom' && (
                    <p className="text-[10px] text-primary mt-1">{p.widgets.length} widgets</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Skins Tab ── */}
          {tab === 'skins' && (
            <div className="grid grid-cols-2 gap-3">
              {SKINS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSkin(s.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    prefs.skin === s.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-sm font-semibold">{t(s.titleKey, lang)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {s.preview.map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Widgets Tab ── */}
          {tab === 'widgets' && (
            <div className="space-y-5">
              {CATEGORIES.map(cat => {
                const widgets = WIDGET_REGISTRY.filter(w => w.category === cat.id);
                if (widgets.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                      {t(cat.titleKey, lang)}
                    </h3>
                    <div className="space-y-1">
                      {widgets.map(w => {
                        const enabled = prefs.enabledWidgets.includes(w.id);
                        return (
                          <button
                            key={w.id}
                            onClick={() => handleToggle(w.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              enabled ? 'bg-primary/10' : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <span className="text-base">{w.icon}</span>
                            <span className="text-sm font-medium flex-1 text-left">{t(w.titleKey, lang)}</span>
                            {w.tier === 'pro' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-warm/10 text-warm font-bold">PRO</span>
                            )}
                            <div className={`w-8 h-4.5 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-border'}`}>
                              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform mt-[2px] ${
                                enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
                              }`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

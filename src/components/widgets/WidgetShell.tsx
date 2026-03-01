'use client';

import { useRef, useState, useCallback } from 'react';
import type { WidgetId } from '@/lib/widget-types';
import { getWidgetDef } from '@/lib/widget-types';
import { t, type Lang } from '@/lib/i18n';
import { shareCard } from '@/lib/share';

interface Props {
  id: WidgetId;
  lang: Lang;
  onRemove?: (id: WidgetId) => void;
  isDragging?: boolean;
  index?: number;
  expanded?: boolean;
  onToggleExpand?: (id: WidgetId) => void;
  expandedContent?: React.ReactNode;
  children: React.ReactNode;
}

export default function WidgetShell({
  id, lang, onRemove, isDragging, index = 0,
  expanded, onToggleExpand, expandedContent,
  children,
}: Props) {
  const def = getWidgetDef(id);
  const shellRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  if (!def) return null;

  const canExpand = !!onToggleExpand;

  const handleShare = async () => {
    if (!shellRef.current || sharing) return;
    setSharing(true);
    try {
      const filename = `rundna-${id}`;
      await shareCard(shellRef.current, filename, 'My RunDNA widget 🧬🏃', 'https://rundna.online');
    } catch { /* user cancelled or error */ }
    setTimeout(() => setSharing(false), 1500);
  };

  return (
    <div
      ref={shellRef}
      className={[
        'h-full rounded-xl border overflow-hidden transition-all duration-300',
        !expanded ? 'animate-widget-enter' : '',
        isDragging
          ? 'scale-[1.03] shadow-xl shadow-primary/25 border-primary ring-2 ring-primary/40 bg-surface'
          : expanded
            ? 'border-primary/30 bg-surface ring-1 ring-primary/20 shadow-lg shadow-primary/10'
            : 'border-border hover:border-primary/20 bg-surface',
        index > 0 && !expanded ? `delay-${Math.min(index, 8)}` : '',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        {canExpand ? (
          <button
            type="button"
            onClick={() => onToggleExpand(id)}
            aria-label={expanded
              ? (lang === 'ko' ? `${t(def.titleKey, lang)} 접기` : `Collapse ${t(def.titleKey, lang)}`)
              : (lang === 'ko' ? `${t(def.titleKey, lang)} 펼치기` : `Expand ${t(def.titleKey, lang)}`)}
            aria-expanded={expanded}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          >
            <span className="text-base select-none" aria-hidden="true">{def.icon}</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted truncate group-hover:text-primary transition-colors">
              {t(def.titleKey, lang)}
            </h3>
            <svg
              className={`w-3 h-3 text-text-muted shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {def.tier === 'pro' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm/10 text-warm font-bold shrink-0">PRO</span>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">
              {def.icon}
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted truncate">
              {t(def.titleKey, lang)}
            </h3>
            {def.tier === 'pro' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm/10 text-warm font-bold shrink-0">PRO</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            aria-label={sharing ? t('widget.share', lang) + ' ✓' : t('widget.share', lang)}
            className={`text-xs p-1 transition-colors ${sharing ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
            title={sharing ? '✓' : t('widget.share', lang)}
          >
            {sharing ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
          </button>
          {expanded && onToggleExpand && (
            <button
              onClick={() => onToggleExpand(id)}
              aria-label={lang === 'ko' ? '위젯 접기' : 'Collapse widget'}
              className="text-text-muted hover:text-primary text-xs p-1 transition-colors"
              title="Collapse"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {onRemove && !expanded && (
            <button
              onClick={() => onRemove(id)}
              aria-label={t('widget.removeWidget', lang)}
              className="text-text-muted hover:text-danger text-xs p-1 transition-colors"
              title={t('widget.removeWidget', lang)}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Compact content — hides when expanded */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden">
          <div className="p-5">{children}</div>
        </div>
      </div>

      {/* Expanded content — shows when expanded */}
      {expandedContent && (
        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            {expanded && (
              <div className="p-5 pt-0 border-t border-border animate-fade-in-up">
                {expandedContent}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

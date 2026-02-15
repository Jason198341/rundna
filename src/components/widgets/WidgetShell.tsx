'use client';

import type { WidgetId } from '@/lib/widget-types';
import { getWidgetDef } from '@/lib/widget-types';
import { t, type Lang } from '@/lib/i18n';

interface Props {
  id: WidgetId;
  lang: Lang;
  onRemove?: (id: WidgetId) => void;
  isDragging?: boolean;
  children: React.ReactNode;
}

export default function WidgetShell({ id, lang, onRemove, isDragging, children }: Props) {
  const def = getWidgetDef(id);
  if (!def) return null;

  return (
    <div className={`h-full rounded-xl border overflow-hidden transition-all duration-200 ${
      isDragging
        ? 'scale-[1.03] shadow-xl shadow-primary/25 border-primary ring-2 ring-primary/40 bg-surface'
        : 'border-border hover:border-primary/20 bg-surface'
    }`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base cursor-grab active:cursor-grabbing select-none" title="Drag to reorder">
            {def.icon}
          </span>
          <h3 className="text-sm font-semibold truncate">{t(def.titleKey, lang)}</h3>
          {def.tier === 'pro' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm/10 text-warm font-bold shrink-0">PRO</span>
          )}
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="text-text-muted hover:text-danger text-xs p-1 transition-colors"
            title={t('widget.removeWidget', lang)}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

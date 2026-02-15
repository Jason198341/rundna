'use client';

import type { WidgetId, WidgetSize } from '@/lib/widget-types';
import { getWidgetDef } from '@/lib/widget-types';
import { t, type Lang } from '@/lib/i18n';

interface Props {
  id: WidgetId;
  size?: WidgetSize;
  lang: Lang;
  onRemove?: (id: WidgetId) => void;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<WidgetSize, string> = {
  S: 'col-span-1',
  M: 'col-span-1 sm:col-span-2',
  L: 'col-span-1 sm:col-span-2 lg:col-span-3',
  XL: 'col-span-1 sm:col-span-2 lg:col-span-4',
};

export default function WidgetShell({ id, size, lang, onRemove, children }: Props) {
  const def = getWidgetDef(id);
  if (!def) return null;

  const resolvedSize = size ?? def.defaultSize;

  return (
    <div className={`${SIZE_CLASSES[resolvedSize]} rounded-xl border border-border bg-surface overflow-hidden transition-all duration-300 hover:border-primary/20`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{def.icon}</span>
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

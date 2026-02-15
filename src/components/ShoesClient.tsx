'use client';

import { useState, useEffect } from 'react';
import type { ShoeData } from '@/lib/strava-extended';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBreak from '@/components/AdBreak';

export default function ShoesClient() {
  const [lang] = useLang();
  const [shoes, setShoes] = useState<ShoeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/strava/gear')
      .then(r => r.json())
      .then(d => { setShoes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-5xl mb-4 animate-bounce">👟</div>
        <p className="text-base font-semibold">{t('dash.loading', lang)}</p>
      </div>
    );
  }

  if (shoes.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="text-4xl mb-3">👟</p>
        <p className="text-lg font-semibold">{lang === 'ko' ? '등록된 신발이 없습니다' : 'No shoes registered'}</p>
        <p className="text-sm text-text-muted mt-2">{lang === 'ko' ? 'Strava에서 신발을 등록해주세요' : 'Register shoes in Strava first'}</p>
      </div>
    );
  }

  const active = shoes.filter(s => !s.retired);
  const retired = shoes.filter(s => s.retired);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">👟 {t('widget.shoeHealth', lang)}</h1>
        <p className="text-text-muted text-sm mt-1">{lang === 'ko' ? '신발 수명을 추적하세요' : 'Track your shoe lifespan'}</p>
      </div>

      {/* Active Shoes */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">
            {t('shoe.active', lang)} ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map(shoe => (
              <ShoeCard key={shoe.id} shoe={shoe} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* Shoe Graveyard */}
      <AdBreak />

      {retired.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            🪦 {t('widget.shoeGraveyard', lang)} ({retired.length})
          </h2>
          <div className="space-y-3">
            {retired.map(shoe => (
              <ShoeCard key={shoe.id} shoe={shoe} lang={lang} isGraveyard />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShoeCard({ shoe, lang, isGraveyard }: { shoe: ShoeData; lang: 'en' | 'ko'; isGraveyard?: boolean }) {
  const healthColor = shoe.healthPercent > 50 ? 'var(--color-primary)'
    : shoe.healthPercent > 25 ? 'var(--color-warm)'
    : 'var(--color-danger)';

  const formatPace = (secs: number) => {
    if (!secs) return '--:--';
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const remainingKm = Math.max(0, 800 - shoe.distanceKm);

  return (
    <div className={`rounded-xl border bg-surface p-4 transition-all ${
      isGraveyard ? 'border-border/50 opacity-70' : 'border-border hover:border-primary/20'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {shoe.name}
            {shoe.primary && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">PRIMARY</span>}
            {isGraveyard && <span className="text-[9px] px-1.5 py-0.5 rounded bg-danger/10 text-danger font-bold">RETIRED</span>}
          </h3>
          {shoe.brand && <p className="text-xs text-text-muted">{shoe.brand} {shoe.model}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold font-mono" style={{ color: healthColor }}>
            {shoe.healthPercent}%
          </p>
          <p className="text-[10px] text-text-muted">{t('shoe.health', lang)}</p>
        </div>
      </div>

      {/* Health bar */}
      <div className="h-2.5 rounded-full bg-bg overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${shoe.healthPercent}%`, backgroundColor: healthColor }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-[10px] text-text-muted">{t('shoe.mileage', lang)}</p>
          <p className="text-xs font-bold font-mono">{shoe.distanceKm} km</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">{lang === 'ko' ? '러닝 수' : 'Runs'}</p>
          <p className="text-xs font-bold font-mono">{shoe.runCount}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">{t('dash.avgPace', lang)}</p>
          <p className="text-xs font-bold font-mono">{formatPace(shoe.avgPace)}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">{isGraveyard ? (lang === 'ko' ? '은퇴' : 'Retired') : t('shoe.replaceIn', lang)}</p>
          <p className="text-xs font-bold font-mono">{isGraveyard ? '🪦' : `${remainingKm.toFixed(0)} km`}</p>
        </div>
      </div>

      {shoe.firstUsed && shoe.lastUsed && (
        <p className="text-[10px] text-text-muted mt-2 text-center">
          {shoe.firstUsed.split('T')[0]} → {shoe.lastUsed.split('T')[0]}
        </p>
      )}
    </div>
  );
}

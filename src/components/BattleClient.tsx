'use client';

import { useState, useEffect } from 'react';
import type { IntelligenceData } from '@/lib/strava-analytics';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';

export default function BattleClient() {
  const [lang] = useLang();
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rivalCode, setRivalCode] = useState('');
  const [rival, setRival] = useState<IntelligenceData | null>(null);

  useEffect(() => {
    fetch('/api/strava/intelligence')
      .then(r => r.json())
      .then(d => { setIntel(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-5xl mb-4 animate-bounce">⚔️</div>
        <p className="text-base font-semibold">{t('dash.loading', lang)}</p>
      </div>
    );
  }

  if (!intel) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl mb-2">⚔️</p>
        <p className="text-lg font-semibold">{t('common.noRuns', lang)}</p>
      </div>
    );
  }

  const { personality } = intel;
  const scores = personality.scores;
  const traits = [
    { key: 'consistency', label: t('dna.consistency', lang), score: scores.consistency, color: '#10b981', icon: '📅' },
    { key: 'speed', label: t('dna.speed', lang), score: scores.speed, color: '#22d3ee', icon: '⚡' },
    { key: 'endurance', label: t('dna.endurance', lang), score: scores.endurance, color: '#818cf8', icon: '🏔️' },
    { key: 'variety', label: t('dna.variety', lang), score: scores.variety, color: '#f59e0b', icon: '🗺️' },
    { key: 'volume', label: t('dna.volume', lang), score: scores.volume, color: '#ef4444', icon: '📈' },
  ];

  // Self-battle: best trait vs weakest trait
  const strongest = traits.reduce((a, b) => a.score >= b.score ? a : b);
  const weakest = traits.reduce((a, b) => a.score <= b.score ? a : b);

  // Weekly challenge from weakest trait
  const challenges: Record<string, { en: string; ko: string }> = {
    consistency: { en: 'Run 4+ times this week', ko: '이번 주 4회 이상 달리기' },
    speed: { en: 'Do 1 interval session', ko: '인터벌 1회 실시' },
    endurance: { en: 'Complete a 10km+ run', ko: '10km 이상 1회 달리기' },
    variety: { en: 'Run a brand new route', ko: '새로운 루트 달리기' },
    volume: { en: 'Hit 30km this week', ko: '이번 주 30km 달성' },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">⚔️ {t('widget.dnaBattle', lang)}</h1>
        <p className="text-text-muted text-sm mt-1">{t('battle.compare', lang)}</p>
      </div>

      {/* Your DNA Card */}
      <div className="rounded-2xl border border-primary/20 bg-surface p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">🧬</div>
          <div>
            <p className="font-bold">{personality.type}</p>
            <p className="text-xs text-text-muted">Top {personality.percentile}%</p>
          </div>
        </div>

        {/* Trait bars */}
        <div className="space-y-2">
          {traits.map(tr => (
            <div key={tr.key} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center">{tr.icon}</span>
              <span className="text-xs font-medium w-16">{tr.label}</span>
              <div className="flex-1 h-3 rounded-full bg-bg overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(tr.score / 5) * 100}%`, backgroundColor: tr.color }}
                />
              </div>
              <span className="text-xs font-mono font-bold w-6 text-right" style={{ color: tr.color }}>
                {tr.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Inner Battle: Strongest vs Weakest */}
      <div className="rounded-2xl border border-warm/20 bg-surface p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-warm flex items-center gap-2">
          ⚡ {lang === 'ko' ? '내면의 전투' : 'Inner Battle'}
        </h2>
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <p className="text-2xl mb-1">{strongest.icon}</p>
            <p className="text-xs font-bold" style={{ color: strongest.color }}>{strongest.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: strongest.color }}>{strongest.score.toFixed(1)}</p>
          </div>
          <div className="text-center text-2xl font-bold text-warm">VS</div>
          <div className="text-center">
            <p className="text-2xl mb-1">{weakest.icon}</p>
            <p className="text-xs font-bold" style={{ color: weakest.color }}>{weakest.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: weakest.color }}>{weakest.score.toFixed(1)}</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs text-text-muted">
            {lang === 'ko'
              ? `${strongest.label}은(는) 뛰어나지만 ${weakest.label}을(를) 개선할 여지가 있습니다`
              : `Your ${strongest.label} is strong, but ${weakest.label} needs work`}
          </p>
        </div>
      </div>

      {/* Weekly Challenge */}
      <div className="rounded-2xl border border-accent/20 bg-surface p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-accent flex items-center gap-2">
          🏅 {t('battle.challenge', lang)}
        </h2>
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-4">
          <p className="text-sm font-medium mb-1">
            {lang === 'ko' ? '약점 보완' : 'Weakness Boost'}: {weakest.label}
          </p>
          <p className="text-base font-bold text-accent">
            {challenges[weakest.key]?.[lang] || challenges[weakest.key]?.en}
          </p>
        </div>
      </div>

      {/* Share Your DNA */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          👥 {lang === 'ko' ? 'DNA 대전 (곧 출시)' : 'DNA Battle (Coming Soon)'}
        </h2>
        <p className="text-xs text-text-muted mb-3">
          {lang === 'ko'
            ? '친구의 DNA 코드를 입력하면 DNA를 비교할 수 있습니다'
            : "Enter a friend's DNA code to compare Running DNA"}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={rivalCode}
            onChange={e => setRivalCode(e.target.value)}
            placeholder={lang === 'ko' ? 'DNA 코드 입력...' : 'Enter DNA code...'}
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-bg border border-border focus:border-primary outline-none"
          />
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium opacity-50 cursor-not-allowed"
          >
            {t('battle.compare', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

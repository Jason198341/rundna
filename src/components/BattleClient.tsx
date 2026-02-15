'use client';

import { useState, useEffect } from 'react';
import type { IntelligenceData, RunningPersonality } from '@/lib/strava-analytics';
import { encodeDNA, decodeDNA } from '@/lib/strava-analytics';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import AdBanner from '@/components/AdBanner';

const TRAIT_COLORS = ['#10b981', '#22d3ee', '#818cf8', '#f59e0b', '#ef4444'];
const TRAIT_ICONS = ['📅', '⚡', '🏔️', '🗺️', '📈'];
const TRAIT_KEYS: (keyof RunningPersonality['scores'])[] = ['consistency', 'speed', 'endurance', 'variety', 'volume'];

// ── Mini Radar Chart (reused from DNAClient pattern) ─────────

function MiniRadar({
  scores1,
  scores2,
  labels,
  size = 180,
}: {
  scores1: number[];
  scores2?: number[];
  labels: string[];
  size?: number;
}) {
  const cx = size / 2, cy = size / 2, maxR = size * 0.375;
  const n = 5;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  function point(i: number, val: number) {
    const angle = startAngle + i * angleStep;
    const r = (val / 5) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  function makePath(scores: number[]) {
    return scores.map((s, i) => {
      const p = point(i, s);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }).join(' ') + ' Z';
  }

  const gridLevels = [1, 2, 3, 4, 5];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => point(i, level));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="var(--color-border)" strokeWidth={level === 5 ? 1.5 : 0.5} />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const p = point(i, 5);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-border)" strokeWidth={0.5} />;
      })}
      {/* Rival data (behind) */}
      {scores2 && (
        <path d={makePath(scores2)} fill="rgba(251,146,60,0.15)" stroke="#fb923c" strokeWidth={1.5} strokeDasharray="4 2" />
      )}
      {/* User data (front) */}
      <path d={makePath(scores1)} fill="var(--color-primary-dim)" stroke="var(--color-primary)" strokeWidth={2} />
      {/* Data points */}
      {scores1.map((s, i) => {
        const p = point(i, s);
        return <circle key={`u${i}`} cx={p.x} cy={p.y} r={3} fill={TRAIT_COLORS[i]} />;
      })}
      {scores2?.map((s, i) => {
        const p = point(i, s);
        return <circle key={`r${i}`} cx={p.x} cy={p.y} r={3} fill="#fb923c" />;
      })}
      {/* Labels */}
      {labels.map((label, i) => {
        const p = point(i, 6.5);
        return (
          <text key={label} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-text-muted">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function BattleClient() {
  const [lang] = useLang();
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rivalCode, setRivalCode] = useState('');
  const [rival, setRival] = useState<RunningPersonality | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
  const myCode = encodeDNA(scores);
  const traitLabels = TRAIT_KEYS.map(k => t(`dna.${k}`, lang));
  const myScoreArr = TRAIT_KEYS.map(k => scores[k]);

  const traits = TRAIT_KEYS.map((key, i) => ({
    key,
    label: t(`dna.${key}`, lang),
    score: scores[key],
    color: TRAIT_COLORS[i],
    icon: TRAIT_ICONS[i],
  }));

  // ── Battle logic ──
  function handleCompare() {
    setError('');
    const decoded = decodeDNA(rivalCode);
    if (!decoded) {
      setError(t('battle.invalidCode', lang));
      return;
    }
    setRival(decoded);
  }

  function handleReset() {
    setRival(null);
    setRivalCode('');
    setError('');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = myCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Self-battle (inner battle) ──
  const strongest = traits.reduce((a, b) => a.score >= b.score ? a : b);
  const weakest = traits.reduce((a, b) => a.score <= b.score ? a : b);
  const challenges: Record<string, { en: string; ko: string }> = {
    consistency: { en: 'Run 4+ times this week', ko: '이번 주 4회 이상 달리기' },
    speed: { en: 'Do 1 interval session', ko: '인터벌 1회 실시' },
    endurance: { en: 'Complete a 10km+ run', ko: '10km 이상 1회 달리기' },
    variety: { en: 'Run a brand new route', ko: '새로운 루트 달리기' },
    volume: { en: 'Hit 30km this week', ko: '이번 주 30km 달성' },
  };

  // ── Rival comparison data ──
  let battleResult: 'win' | 'lose' | 'tie' = 'tie';
  let userWins = 0;
  let rivalWins = 0;
  if (rival) {
    for (const key of TRAIT_KEYS) {
      if (scores[key] > rival.scores[key]) userWins++;
      else if (scores[key] < rival.scores[key]) rivalWins++;
    }
    if (userWins > rivalWins) battleResult = 'win';
    else if (rivalWins > userWins) battleResult = 'lose';
    else {
      // Tiebreaker: total score
      const myTotal = TRAIT_KEYS.reduce((s, k) => s + scores[k], 0);
      const rivalTotal = TRAIT_KEYS.reduce((s, k) => s + rival.scores[k], 0);
      if (myTotal > rivalTotal) battleResult = 'win';
      else if (rivalTotal > myTotal) battleResult = 'lose';
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">⚔️ {t('widget.dnaBattle', lang)}</h1>
        <p className="text-text-muted text-sm mt-1">{t('battle.compare', lang)}</p>
      </div>

      {/* ── My DNA Code ── */}
      <div className="rounded-2xl border border-primary/20 bg-surface p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">🧬</div>
            <div>
              <p className="font-bold">{personality.type}</p>
              <p className="text-xs text-text-muted">Top {personality.percentile}%</p>
            </div>
          </div>
        </div>

        {/* DNA Code display */}
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-medium text-text-muted">{t('battle.myCode', lang)}</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors"
          >
            <span className="font-mono font-bold text-sm text-primary tracking-wider">{myCode}</span>
            <span className="text-xs">{copied ? '✅' : '📋'}</span>
          </button>
          {copied && <span className="text-xs text-primary animate-pulse">{t('battle.copied', lang)}</span>}
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
                {tr.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rival DNA Input ── */}
      <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
          👥 {t('battle.rivalDNA', lang)}
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
            onChange={e => { setRivalCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="RD-XXXXX"
            maxLength={8}
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-bg border border-border focus:border-primary outline-none font-mono tracking-wider uppercase"
          />
          {rival ? (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-warm/20 text-warm text-sm font-medium hover:bg-warm/30 transition-colors"
            >
              {t('battle.reset', lang)}
            </button>
          ) : (
            <button
              onClick={handleCompare}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={rivalCode.length < 8}
            >
              {t('battle.compare', lang)}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </div>

      {/* ── Battle Comparison ── */}
      {rival && (
        <>
          {/* Winner Banner */}
          <div className={`rounded-2xl border p-5 mb-6 text-center ${
            battleResult === 'win'
              ? 'border-primary/30 bg-primary/5'
              : battleResult === 'lose'
              ? 'border-warm/30 bg-warm/5'
              : 'border-accent/30 bg-accent/5'
          }`}>
            <p className="text-4xl mb-2">
              {battleResult === 'win' ? '🏆' : battleResult === 'lose' ? '😤' : '🤝'}
            </p>
            <p className="text-xl font-bold">
              {battleResult === 'win'
                ? t('battle.youWin', lang)
                : battleResult === 'lose'
                ? t('battle.youLose', lang)
                : t('battle.tie', lang)}
            </p>
            <p className="text-sm text-text-muted mt-1">
              {t('battle.overall', lang)}: {userWins} - {5 - userWins - rivalWins} - {rivalWins}
              {' '}({lang === 'ko' ? '승-무-패' : 'W-D-L'})
            </p>
          </div>

          {/* Side-by-side Radar Charts */}
          <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
            <div className="grid grid-cols-2 gap-2">
              {/* User radar */}
              <div className="text-center">
                <p className="text-xs font-bold text-primary mb-1 truncate">{personality.type}</p>
                <div className="flex justify-center">
                  <MiniRadar scores1={myScoreArr} labels={traitLabels} size={160} />
                </div>
                <p className="text-[10px] text-text-muted mt-1">{myCode}</p>
              </div>
              {/* Rival radar */}
              <div className="text-center">
                <p className="text-xs font-bold text-warm mb-1 truncate">{rival.type}</p>
                <div className="flex justify-center">
                  <MiniRadar
                    scores1={TRAIT_KEYS.map(k => rival.scores[k])}
                    labels={traitLabels}
                    size={160}
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1">{encodeDNA(rival.scores)}</p>
              </div>
            </div>
          </div>

          {/* Trait-by-Trait Comparison */}
          <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              📊 {lang === 'ko' ? '특성별 비교' : 'Trait Breakdown'}
            </h2>
            <div className="space-y-3">
              {TRAIT_KEYS.map((key, i) => {
                const myScore = scores[key];
                const rivalScore = rival.scores[key];
                const diff = myScore - rivalScore;
                const winner = diff > 0 ? 'user' : diff < 0 ? 'rival' : 'tie';

                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{TRAIT_ICONS[i]}</span>
                        <span className="text-xs font-medium">{traits[i].label}</span>
                      </div>
                      <span className="text-xs font-bold" style={{
                        color: winner === 'user' ? '#10b981' : winner === 'rival' ? '#ef4444' : 'var(--color-text-muted)',
                      }}>
                        {winner === 'user' ? (lang === 'ko' ? '승' : 'WIN')
                          : winner === 'rival' ? (lang === 'ko' ? '패' : 'LOSS')
                          : (lang === 'ko' ? '무' : 'DRAW')}
                      </span>
                    </div>
                    {/* Dual bar */}
                    <div className="flex gap-1 items-center">
                      {/* User bar */}
                      <div className="flex-1 flex justify-end">
                        <div className="h-4 rounded-l-full transition-all duration-500" style={{
                          width: `${(myScore / 5) * 100}%`,
                          backgroundColor: winner === 'user' ? '#10b981' : winner === 'tie' ? TRAIT_COLORS[i] : 'var(--color-border)',
                        }} />
                      </div>
                      <span className="text-[10px] font-mono font-bold w-9 text-center">
                        {myScore} : {rivalScore}
                      </span>
                      {/* Rival bar */}
                      <div className="flex-1">
                        <div className="h-4 rounded-r-full transition-all duration-500" style={{
                          width: `${(rivalScore / 5) * 100}%`,
                          backgroundColor: winner === 'rival' ? '#fb923c' : winner === 'tie' ? TRAIT_COLORS[i] : 'var(--color-border)',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> {lang === 'ko' ? '나' : 'You'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#fb923c' }} /> {lang === 'ko' ? '상대' : 'Rival'}</span>
            </div>
          </div>
        </>
      )}

      {/* ── Inner Battle (shown when no rival) ── */}
      <AdBanner format="horizontal" />

      {!rival && (
        <>
          <div className="rounded-2xl border border-warm/20 bg-surface p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-warm flex items-center gap-2">
              ⚡ {lang === 'ko' ? '내면의 전투' : 'Inner Battle'}
            </h2>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-2xl mb-1">{strongest.icon}</p>
                <p className="text-xs font-bold" style={{ color: strongest.color }}>{strongest.label}</p>
                <p className="text-xl font-bold font-mono" style={{ color: strongest.color }}>{strongest.score}</p>
              </div>
              <div className="text-center text-2xl font-bold text-warm">VS</div>
              <div className="text-center">
                <p className="text-2xl mb-1">{weakest.icon}</p>
                <p className="text-xs font-bold" style={{ color: weakest.color }}>{weakest.label}</p>
                <p className="text-xl font-bold font-mono" style={{ color: weakest.color }}>{weakest.score}</p>
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
          <div className="rounded-2xl border border-accent/20 bg-surface p-5">
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
        </>
      )}
    </div>
  );
}

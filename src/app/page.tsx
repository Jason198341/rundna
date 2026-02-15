'use client';

import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import LangToggle from '@/components/LangToggle';

export default function LandingPage() {
  const [lang] = useLang();

  const FEATURES = [
    { icon: '🧬', title: t('landing.f1.title', lang), desc: t('landing.f1.desc', lang), color: 'text-primary' },
    { icon: '🤖', title: t('landing.f2.title', lang), desc: t('landing.f2.desc', lang), color: 'text-accent' },
    { icon: '🏁', title: t('landing.f3.title', lang), desc: t('landing.f3.desc', lang), color: 'text-warm' },
    { icon: '📊', title: t('landing.f4.title', lang), desc: t('landing.f4.desc', lang), color: 'text-primary' },
  ];

  const STEPS = [
    { step: '1', title: t('landing.step1', lang), desc: t('landing.step1d', lang) },
    { step: '2', title: t('landing.step2', lang), desc: t('landing.step2d', lang) },
    { step: '3', title: t('landing.step3', lang), desc: t('landing.step3d', lang) },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-14">
          <a href="/" className="flex items-center gap-2 font-bold text-lg">
            <img src="/logo.png" alt="RunDNA" className="w-7 h-7 rounded" /> RunDNA
          </a>
          <div className="flex items-center gap-3">
            <LangToggle />
            <a
              href="/api/auth/strava"
              className="px-4 py-2 rounded-lg bg-strava text-white text-sm font-semibold hover:bg-strava/90 transition-colors"
            >
              {lang === 'ko' ? 'Strava 연결' : 'Connect Strava'}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="relative mx-auto w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <img src="/logo.png" alt="RunDNA" className="w-12 h-12 rounded-lg" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight animate-fade-in-up">
            {t('landing.hero', lang)}{' '}
            <span className="text-primary">{t('landing.heroAccent', lang)}</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-text-muted max-w-2xl mx-auto animate-fade-in-up delay-1">
            {t('landing.sub', lang)}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-2">
            <a
              href="/api/auth/strava"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-strava text-white font-bold text-lg hover:bg-strava/90 transition-all hover:scale-[1.02] glow-hover"
              style={{ '--color-glow': '#fc4c0240' } as React.CSSProperties}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              {t('landing.cta', lang)}
            </a>
            <span className="text-sm text-text-muted">{t('landing.free', lang)}</span>
          </div>

          <p className="mt-8 text-sm text-text-muted/60 animate-fade-in-up delay-3">
            {t('landing.proof', lang)}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            {t('landing.features', lang)}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`rounded-xl border border-border bg-surface p-6 hover:border-primary/30 transition-all animate-fade-in-up delay-${i + 1}`}
              >
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className={`text-lg font-semibold mb-2 ${f.color}`}>{f.title}</h3>
                <p className="text-sm text-text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-12">{t('landing.howTitle', lang)}</h2>

          <div className="flex flex-col sm:flex-row items-start justify-center gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <a
              href="/api/auth/strava"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-colors"
            >
              {t('landing.getStarted', lang)}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <span>RunDNA — {t('landing.footer', lang)}</span>
          <div className="flex items-center gap-4">
            <span>{t('landing.powered', lang)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

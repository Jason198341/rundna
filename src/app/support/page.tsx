'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/useLang';
import LangToggle from '@/components/LangToggle';

const FAQS = [
  { q: 'support.q1', a: 'support.a1' },
  { q: 'support.q2', a: 'support.a2' },
  { q: 'support.q3', a: 'support.a3' },
  { q: 'support.q4', a: 'support.a4' },
  { q: 'support.q5', a: 'support.a5' },
];

function FaqItem({ q, a, lang }: { q: string; a: string; lang: 'en' | 'ko' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-hover transition-colors"
      >
        <span className="font-medium text-sm sm:text-base pr-4">{t(q, lang)}</span>
        <svg
          className={`w-5 h-5 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 text-sm text-text-muted leading-relaxed border-t border-border/30">
          {t(a, lang)}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [lang] = useLang();

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-14">
          <a href="/" className="flex items-center gap-2 font-bold text-lg">
            <img src="/logo.png" alt="RunDNA" className="w-7 h-7 rounded" /> RunDNA
          </a>
          <LangToggle />
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 pt-28 pb-20">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('support.title', lang)}</h1>
          <p className="text-text-muted">{t('support.sub', lang)}</p>
        </div>

        {/* Contact Card */}
        <div className="mb-10 rounded-2xl border border-border/50 bg-surface p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <h2 className="font-semibold text-lg mb-1">{t('support.contactTitle', lang)}</h2>
            <p className="text-sm text-text-muted">{t('support.contactDesc', lang)}</p>
          </div>
          <a
            href="mailto:skypeople41@gmail.com?subject=RunDNA Support"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('support.email', lang)}
          </a>
        </div>

        {/* Strava Access Card */}
        <div className="mb-10 rounded-2xl border border-border/50 bg-surface p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-strava" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <h2 className="font-semibold text-lg">{t('support.strava', lang)}</h2>
            </div>
            <p className="text-sm text-text-muted">{t('support.stravaDesc', lang)}</p>
          </div>
          <a
            href="https://www.strava.com/settings/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-strava text-white font-semibold text-sm hover:bg-strava/90 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            {t('support.stravaBtn', lang)}
          </a>
        </div>

        {/* FAQ */}
        <h2 className="text-xl font-bold mb-5">{t('support.faqTitle', lang)}</h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <FaqItem key={q} q={q} a={a} lang={lang} />
          ))}
        </div>

        {/* Bottom links */}
        <div className="mt-12 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-text transition-colors">{t('footer.privacy', lang)}</a>
            <a href="/" className="hover:text-text transition-colors">RunDNA</a>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <svg className="w-3.5 h-3.5 text-strava" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            <span>{t('footer.attribution', lang)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

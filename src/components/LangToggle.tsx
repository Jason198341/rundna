'use client';

import { useLang } from '@/lib/useLang';

export default function LangToggle() {
  const [lang, setLang] = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ko' : 'en')}
      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-xs hover:border-primary/30 transition-all"
      aria-label="Toggle language"
    >
      <span className={lang === 'en' ? 'text-primary font-semibold' : 'text-text-muted'}>EN</span>
      <span className="text-border">|</span>
      <span className={lang === 'ko' ? 'text-primary font-semibold' : 'text-text-muted'}>KO</span>
    </button>
  );
}

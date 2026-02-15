'use client';

import { useState, useEffect } from 'react';
import { getLang, setLang, type Lang } from './i18n';

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, set] = useState<Lang>(getLang);

  useEffect(() => {
    const h = () => set(getLang());
    window.addEventListener('langchange', h);
    return () => window.removeEventListener('langchange', h);
  }, []);

  return [
    lang,
    (l: Lang) => {
      setLang(l);
      set(l);
      window.dispatchEvent(new Event('langchange'));
    },
  ];
}

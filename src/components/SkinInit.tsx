'use client';

import { useEffect } from 'react';
import { loadPreferences, applySkin } from '@/lib/widget-store';

/** Applies the user's saved skin globally on mount. Renders nothing. */
export default function SkinInit() {
  useEffect(() => {
    const prefs = loadPreferences();
    applySkin(prefs.skin);
  }, []);
  return null;
}

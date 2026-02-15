'use client';

import { useEffect, useRef, useState } from 'react';

interface AdBreakProps {
  className?: string;
}

/**
 * Full-width "magazine section break" ad unit.
 * Desktop: 2 ads side-by-side (50/50).
 * Mobile: 1 ad full-width (second hidden to avoid ad density violation).
 * Lazy-loads via IntersectionObserver for performance.
 */
export default function AdBreak({ className = '' }: AdBreakProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full border-t border-b border-border/30 bg-surface/30 py-5 my-8 ${className}`}
    >
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-[9px] text-text-muted/40 uppercase tracking-widest text-center mb-3">
          ad
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible ? (
            <>
              <AdUnit />
              <div className="hidden md:block">
                <AdUnit />
              </div>
            </>
          ) : (
            <>
              <div className="h-[250px] rounded-xl bg-surface animate-pulse" />
              <div className="hidden md:block h-[250px] rounded-xl bg-surface animate-pulse" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdUnit() {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded yet
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'block', minHeight: '250px' }}
      data-ad-client="ca-pub-7851278292826132"
      data-ad-slot=""
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

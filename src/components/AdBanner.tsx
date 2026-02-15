'use client';

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
}

export default function AdBanner({ slot, format = 'auto', className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded yet — ads will show once account is approved
    }
  }, []);

  const layoutStyle: React.CSSProperties =
    format === 'horizontal'
      ? { display: 'block', height: '90px' }
      : format === 'rectangle'
        ? { display: 'inline-block', width: '300px', height: '250px' }
        : {};

  return (
    <div className={`flex justify-center my-6 ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', ...layoutStyle }}
        data-ad-client="ca-pub-7851278292826132"
        data-ad-slot={slot || ''}
        data-ad-format={format === 'auto' ? 'auto' : undefined}
        data-full-width-responsive={format === 'auto' ? 'true' : undefined}
      />
    </div>
  );
}

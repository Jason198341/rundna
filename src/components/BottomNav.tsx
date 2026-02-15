'use client';

import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/useLang';

const TABS = [
  { href: '/dashboard', icon: '🏠', en: 'Home', ko: '홈' },
  { href: '/dna', icon: '🧬', en: 'DNA', ko: 'DNA' },
  { href: '/coach', icon: '🤖', en: 'Coach', ko: '코치' },
  { href: '/battle', icon: '⚔️', en: 'Battle', ko: '배틀' },
  { href: '/story', icon: '📖', en: 'Story', ko: '스토리' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [lang] = useLang();

  // Hide on landing and privacy pages
  if (pathname === '/' || pathname === '/privacy') return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 sm:hidden border-t border-border/50 bg-bg/80 backdrop-blur-xl">
      <div className="flex items-center justify-around h-14 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(tab => {
          const active = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href));
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 relative transition-colors ${
                active ? 'text-primary' : 'text-text-muted'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-primary" />
              )}
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[10px] font-medium">{lang === 'ko' ? tab.ko : tab.en}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

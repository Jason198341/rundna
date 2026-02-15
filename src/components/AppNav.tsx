import LangToggle from '@/components/LangToggle';

interface Props {
  userName: string;
  avatarUrl?: string | null;
}

export default function AppNav({ userName, avatarUrl }: Props) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-14">
        <a href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <img src="/logo.png" alt="RunDNA" className="w-7 h-7 rounded" /> RunDNA
        </a>
        <div className="flex items-center gap-3">
          <LangToggle />
          <div className="flex items-center gap-2">
            {avatarUrl && (
              <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full" />
            )}
            <span className="text-sm font-medium hidden sm:block">{userName}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

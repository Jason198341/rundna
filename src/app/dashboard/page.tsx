import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { createServerClient } from '@/lib/supabase';
import DashboardClient from '@/components/DashboardClient';
import LangToggle from '@/components/LangToggle';

export default async function DashboardPage() {
  const userId = await getSession();
  if (!userId) redirect('/');

  const db = createServerClient();
  const { data: user } = await db
    .from('users')
    .select('id, name, avatar_url, strava_id')
    .eq('id', userId)
    .single();

  if (!user) redirect('/');

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-14">
          <a href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <img src="/logo.png" alt="RunDNA" className="w-7 h-7 rounded" /> RunDNA
          </a>
          <div className="flex items-center gap-4">
            <LangToggle />
            <div className="flex items-center gap-2">
              {user.avatar_url && (
                <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            </div>
            <a
              href="/api/auth/logout"
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Logout
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-12 px-6">
        <div className="mx-auto max-w-5xl">
          <DashboardClient userName={user.name} />
        </div>
      </main>
    </div>
  );
}

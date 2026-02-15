import Link from 'next/link';

const FEATURES = [
  {
    icon: '🧬',
    title: 'Running DNA',
    desc: 'Discover your unique runner personality with 5-axis analysis',
    color: 'text-primary',
  },
  {
    icon: '🤖',
    title: 'AI Coach',
    desc: 'Chat with an AI that knows your training history inside out',
    color: 'text-accent',
  },
  {
    icon: '🏁',
    title: 'Race Planner',
    desc: 'Set a goal race and get a week-by-week training plan',
    color: 'text-warm',
  },
  {
    icon: '📊',
    title: 'Weekly Report',
    desc: 'Beautiful shareable cards with your weekly running insights',
    color: 'text-primary',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-primary">🧬</span> RunDNA
          </Link>
          <a
            href="/api/auth/strava"
            className="px-4 py-2 rounded-lg bg-strava text-white text-sm font-semibold hover:bg-strava/90 transition-colors"
          >
            Connect Strava
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          {/* DNA helix decoration */}
          <div className="relative mx-auto w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-4xl">🧬</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight animate-fade-in-up">
            Your Running,{' '}
            <span className="text-primary">Decoded</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-text-muted max-w-2xl mx-auto animate-fade-in-up delay-1">
            Connect your Strava and let AI reveal your Running DNA.
            Personalized coaching, race planning, and insights
            that make you a better runner.
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
              Connect with Strava
            </a>
            <span className="text-sm text-text-muted">Free forever for personal use</span>
          </div>

          {/* Social proof placeholder */}
          <p className="mt-8 text-sm text-text-muted/60 animate-fade-in-up delay-3">
            Analyze your runs in seconds. No credit card required.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Everything your running data can tell you
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-12">How it works</h2>

          <div className="flex flex-col sm:flex-row items-start justify-center gap-8">
            {[
              { step: '1', title: 'Connect Strava', desc: 'One-click OAuth. We read your activities (read-only).' },
              { step: '2', title: 'AI Analyzes', desc: 'Your entire running history is crunched in seconds.' },
              { step: '3', title: 'Get Your DNA', desc: 'Personality, coaching, race plans — all personalized.' },
            ].map((s) => (
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
              Get Started — It&apos;s Free
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-muted">
          <span>RunDNA — AI Running Intelligence</span>
          <div className="flex items-center gap-4">
            <span>Powered by Strava API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

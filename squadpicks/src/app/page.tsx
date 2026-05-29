import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 text-sm font-semibold mb-2">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          2026 FIFA World Cup
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-100 max-w-3xl">
          Predict.<br />
          <span className="logo-gradient">Compete.</span><br />
          Win.
        </h1>

        <p className="text-lg text-slate-400 max-w-xl">
          Pick every score in the 2026 World Cup group stage, nail the group
          standings, and call the full knockout bracket. See how you stack up
          against your squad and the world.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/register"
            className="px-8 py-3 rounded-lg font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
          >
            Start predicting — it&apos;s free
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-3 rounded-lg font-semibold border border-slate-700 text-slate-200 hover:border-accent/50 transition-colors"
          >
            View leaderboard
          </Link>
        </div>
      </section>

      {/* How points work */}
      <section className="bg-slate-800 border-t border-slate-700 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How the points work</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POINT_CARDS.map(card => (
              <div key={card.label + card.pts} className="rounded-xl border border-slate-700 bg-slate-900 p-5 flex flex-col gap-2">
                <div className="text-slate-400 text-sm font-medium">{card.round}</div>
                <div className="text-2xl font-bold text-accent">{card.pts}</div>
                <div className="text-sm text-slate-300">{card.label}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-6">
            Points scale with the stakes — call the champion correctly and earn 8 pts.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {FEATURES.map(f => (
            <div key={f.title} className="flex flex-col items-center gap-3">
              <span className="text-4xl">{f.icon}</span>
              <h3 className="font-bold text-slate-100">{f.title}</h3>
              <p className="text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 px-6 py-8 text-center text-slate-400 text-sm">
        <p>SquadPicks is a free prediction game — no real money or prizes involved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/login"       className="hover:text-slate-100 transition-colors">Login</Link>
          <Link href="/register"    className="hover:text-slate-100 transition-colors">Register</Link>
          <Link href="/leaderboard" className="hover:text-slate-100 transition-colors">Leaderboard</Link>
        </div>
      </footer>
    </main>
  )
}

const POINT_CARDS = [
  { round: 'Group stage — per match', pts: '3 pts', label: 'Exact score' },
  { round: 'Group stage — per match', pts: '1 pt',  label: 'Correct result (W / D / L)' },
  { round: 'Group stage — per team',  pts: '2 pts', label: 'Exact final group position' },
  { round: 'Group stage — per team',  pts: '1 pt',  label: 'Correct top-2 qualifier' },
  { round: 'Knockout rounds (scale)', pts: '2–8 pts', label: 'Correct winner per match' },
  { round: 'Final',                   pts: '8 pts', label: 'Highest single-match reward' },
]

const FEATURES = [
  {
    icon: '🔒',
    title: 'Sealed until kickoff',
    desc: 'No one sees your picks until the first ball is kicked. No copying, no gaming the system.',
  },
  {
    icon: '🏆',
    title: 'Private groups',
    desc: 'Create a mini-league with a shareable invite code and compete against your crew.',
  },
  {
    icon: '🌍',
    title: 'Global leaderboard',
    desc: 'See how you rank against every player on the platform, updated live after each match.',
  },
]

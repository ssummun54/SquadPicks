import { getSupabaseServer } from '@/lib/supabase/server'
import { LeaderboardClient } from './_client'
import type { Metadata } from 'next'

export const revalidate = 14400

export const metadata: Metadata = {
  title: 'Global Leaderboard',
  description: 'See who is leading the 2026 World Cup prediction game across all players.',
}

interface Props {
  searchParams: Promise<{ season?: string }>
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const { season } = await searchParams
  const supabase = await getSupabaseServer()

  const [seasonsRes, userRes] = await Promise.all([
    supabase
      .from('seasons')
      .select('id, name, year, status, competitions(name)')
      .order('year', { ascending: false })
      .limit(10),
    supabase.auth.getUser(),
  ])

  const seasons    = seasonsRes.data ?? []
  const activeSeason = season ?? seasons[0]?.id
  const myId       = userRes.data.user?.id

  const { data: rows } = activeSeason
    ? await supabase
        .from('season_leaderboard')
        .select('*')
        .eq('season_id', activeSeason)
        .order('rank')
        .limit(100)
    : { data: [] }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-100">Global Leaderboard</h1>
        <p className="text-slate-400 mt-1">Updated after every completed match.</p>
      </div>

      {seasons.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {seasons.map((s: any) => (
            <a
              key={s.id}
              href={`/leaderboard?season=${s.id}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSeason === s.id
                  ? 'bg-brand text-white'
                  : 'border border-slate-700 text-slate-300 hover:border-accent'
              }`}
            >
              {s.name}
            </a>
          ))}
        </div>
      )}

      <LeaderboardClient rows={rows ?? []} myId={myId ?? null} />
    </main>
  )
}

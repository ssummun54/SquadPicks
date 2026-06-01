import { getSupabaseServer } from '@/lib/supabase/server'
import { LeaderboardClient } from './_client'
import type { Metadata } from 'next'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Leaderboard — SquadPicks',
  description: 'See who is leading the predictions across your groups and globally.',
}

interface Props {
  searchParams: Promise<{ season?: string }>
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const { season } = await searchParams
  const supabase = await getSupabaseServer()

  const [seasonsRes, userRes] = await Promise.all([
    supabase.from('seasons').select('id, name, year, status, competitions(name)').order('year', { ascending: false }).limit(10),
    supabase.auth.getUser(),
  ])

  const seasons      = seasonsRes.data ?? []
  const activeSeason = season ?? seasons[0]?.id
  const myId         = userRes.data.user?.id ?? null

  // Global leaderboard for the selected season
  const { data: globalRows } = activeSeason
    ? await supabase.from('season_leaderboard').select('*').eq('season_id', activeSeason).order('rank').limit(200)
    : { data: [] }

  // Groups — fetch all groups the user belongs to, with ALL their enrolled seasons
  let groupsData: { id: string; name: string; seasons: { id: string; name: string; competitionName: string; rows: any[] }[] }[] = []

  if (myId) {
    const { data: membership } = await supabase
      .from('pick_group_members')
      .select('pick_group_id, pick_groups(id, name)')
      .eq('user_id', myId)

    const groups = (membership ?? [])
      .map((m: any) => m.pick_groups)
      .filter(Boolean) as { id: string; name: string }[]

    if (groups.length > 0) {
      groupsData = await Promise.all(
        groups.map(async group => {
          // All seasons this group has enrolled in
          const { data: enrolled } = await supabase
            .from('pick_group_seasons')
            .select('season_id, seasons(id, name, competitions(name))')
            .eq('pick_group_id', group.id)

          const groupSeasons = (enrolled ?? [])
            .map((r: any) => r.seasons)
            .filter(Boolean) as { id: string; name: string; competitions: { name: string } | null }[]

          const seasonsWithRows = await Promise.all(
            groupSeasons.map(async s => {
              const { data: rows } = await supabase
                .from('pick_group_leaderboard')
                .select('*')
                .eq('season_id', s.id)
                .eq('pick_group_id', group.id)
                .order('rank')
              return {
                id: s.id,
                name: s.name,
                competitionName: (s.competitions as any)?.name ?? s.name,
                rows: rows ?? [],
              }
            })
          )

          return { id: group.id, name: group.name, seasons: seasonsWithRows }
        })
      )

      // Only keep groups that have at least one enrolled season
      groupsData = groupsData.filter(g => g.seasons.length > 0)
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-100">Leaderboard</h1>
        <p className="text-slate-400 mt-1 text-sm">Updated after every completed match.</p>
      </div>

      <LeaderboardClient
        seasons={seasons as any[]}
        activeSeason={activeSeason ?? null}
        globalRows={globalRows ?? []}
        groupsData={groupsData}
        myId={myId}
      />
    </main>
  )
}

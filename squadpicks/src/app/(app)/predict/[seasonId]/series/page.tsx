import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { SeriesClient } from './_client'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params:       Promise<{ seasonId: string }>
  searchParams: Promise<{ from?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Series Prediction' }
}

export default async function SeriesPage({ params, searchParams }: Props) {
  const { seasonId }      = await params
  const { from: groupId } = await searchParams
  const supabase = await getSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [seasonRes, fromGroupRes] = await Promise.all([
    supabase.from('seasons').select('id, name, status, competitions(name)').eq('id', seasonId).single(),
    groupId
      ? supabase.from('pick_groups').select('id, name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
  ])

  if (!seasonRes.data) notFound()
  const season    = seasonRes.data as any
  const fromGroup = (fromGroupRes as any).data ?? null

  // Groups this user belongs to that have this season
  const { data: pgData } = await supabase
    .from('pick_group_members')
    .select('pick_groups!inner(id, name, pick_group_seasons!inner(season_id))')
    .eq('user_id', user.id)
    .eq('pick_groups.pick_group_seasons.season_id', seasonId)

  const participatingGroups = (pgData ?? [])
    .map((r: any) => r.pick_groups)
    .filter(Boolean) as { id: string; name: string }[]

  const pickGroupId = (groupId && participatingGroups.find(g => g.id === groupId))
    ? groupId
    : participatingGroups[0]?.id ?? null

  const activeGroup = participatingGroups.find(g => g.id === pickGroupId) ?? null
  const inGroup = !!pickGroupId

  // All games in the series
  const { data: matchesData } = await supabase
    .from('matches')
    .select(`id, kickoff_at, status, home_score, away_score, match_day, venue,
      rounds!inner(season_id),
      home_team:home_team_id(id, name, short_name),
      away_team:away_team_id(id, name, short_name)`)
    .eq('rounds.season_id', seasonId)
    .order('match_day')

  const matches = (matchesData ?? []) as any[]

  // Existing game predictions
  const matchIds = matches.map(m => m.id)
  const { data: gamePreds } = inGroup && matchIds.length > 0
    ? await supabase
        .from('match_predictions')
        .select('match_id, home_score, away_score')
        .eq('user_id', user.id)
        .eq('pick_group_id', pickGroupId!)
        .in('match_id', matchIds)
    : { data: [] }

  // Existing series prediction
  const { data: seriesPred } = inGroup
    ? await supabase
        .from('series_predictions' as any)
        .select('predicted_winner_id, predicted_games')
        .eq('user_id', user.id)
        .eq('pick_group_id', pickGroupId!)
        .eq('season_id', seasonId)
        .maybeSingle()
    : { data: null }

  // Derive teams from first match
  const teamA = matches[0]?.home_team ?? null
  const teamB = matches[0]?.away_team ?? null

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div className="animate-hero animate-hero-1 flex flex-col gap-2">
        {fromGroup && (
          <Link href={`/groups/${fromGroup.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-accent transition-colors">
            ← {fromGroup.name}
          </Link>
        )}
        <div>
          <div className="text-sm text-slate-400 font-medium uppercase tracking-wide">{season.competitions?.name}</div>
          <h1 className="text-3xl font-black text-slate-100 mt-0.5">{season.name}</h1>
        </div>
        {activeGroup && participatingGroups.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-sm text-slate-400">Predicting for:</span>
            {participatingGroups.map(g => (
              <Link key={g.id} href={`/predict/${seasonId}/series?from=${g.id}`}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${g.id === pickGroupId ? 'bg-accent/20 text-accent border border-accent/40' : 'border border-slate-600 text-slate-400 hover:border-accent hover:text-accent'}`}>
                {g.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {!inGroup ? (
        <div className="animate-hero animate-hero-3 rounded-xl border border-slate-700 bg-slate-800/60 p-8 flex flex-col items-center text-center gap-4">
          <div className="font-bold text-slate-200 text-lg">Join a group to start predicting</div>
          <div className="flex gap-3">
            <Link href="/groups/new" className="px-5 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors">Create a group</Link>
            <Link href="/groups" className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-semibold text-sm hover:border-accent hover:text-accent transition-colors">My groups</Link>
          </div>
        </div>
      ) : (
        <SeriesClient
          seasonId={seasonId}
          pickGroupId={pickGroupId!}
          matches={matches}
          gamePreds={(gamePreds ?? []) as any[]}
          seriesPred={(seriesPred as any) ?? null}
          teamA={teamA}
          teamB={teamB}
        />
      )}
    </div>
  )
}

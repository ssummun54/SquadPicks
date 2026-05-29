import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { GroupStageClient } from './_client'
import { pointsLabel } from '@/lib/scoring'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ seasonId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seasonId } = await params
  return { title: `Group Stage Predictions` }
}

export default async function GroupStagePage({ params }: Props) {
  const { seasonId } = await params
  const supabase = await getSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Fetch season + groups + teams + matches + user's predictions in parallel
  const [seasonRes, groupsRes, matchesRes, groupPredsRes, matchPredsRes] = await Promise.all([
    supabase.from('seasons').select('id, name, status, competitions(name)').eq('id', seasonId).single(),

    supabase
      .from('tournament_groups')
      .select(`
        id, name, slug,
        rounds!inner(season_id),
        group_teams(team_id, final_position, teams(id, name, short_name, logo_url, country_code))
      `)
      .eq('rounds.season_id', seasonId)
      .order('slug'),

    supabase
      .from('matches')
      .select(`
        id, kickoff_at, status, home_score, away_score, match_day, group_id,
        home_team:home_team_id(id, name, short_name, logo_url),
        away_team:away_team_id(id, name, short_name, logo_url)
      `)
      .eq('rounds.season_id', seasonId)
      .not('group_id', 'is', null)
      .order('kickoff_at'),

    supabase
      .from('group_predictions')
      .select('group_id, team_id, predicted_position')
      .eq('user_id', user.id),

    supabase
      .from('match_predictions')
      .select('match_id, home_score, away_score')
      .eq('user_id', user.id),
  ])

  if (!seasonRes.data) notFound()

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="text-sm text-slate-400 font-medium">{(seasonRes.data as any).competitions?.name}</div>
        <h1 className="text-3xl font-black text-slate-100">{seasonRes.data.name} — Group Stage</h1>
        <p className="text-slate-400 mt-1 text-sm">{pointsLabel('group_stage')}</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
          <span className="w-3 h-3 rounded-full bg-accent inline-block" /> Your picks are hidden from others until the first match of each group kicks off.
        </div>
      </div>

      <GroupStageClient
        seasonId={seasonId}
        groups={(groupsRes.data ?? []) as any}
        matches={(matchesRes.data ?? []) as any}
        existingGroupPreds={groupPredsRes.data ?? []}
        existingMatchPreds={matchPredsRes.data ?? []}
      />
    </div>
  )
}

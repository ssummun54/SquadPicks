import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { GroupStageClient } from './_client'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params:       Promise<{ seasonId: string }>
  searchParams: Promise<{ from?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Group Stage Predictions' }
}

export default async function GroupStagePage({ params, searchParams }: Props) {
  const { seasonId }   = await params
  const { from: groupId } = await searchParams
  const supabase = await getSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Load season info + group context in parallel
  const [seasonRes, fromGroupRes] = await Promise.all([
    supabase.from('seasons').select('id, name, status, competitions(name)').eq('id', seasonId).single(),
    groupId
      ? supabase.from('pick_groups').select('id, name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
  ])

  if (!seasonRes.data) notFound()
  const season    = seasonRes.data
  const fromGroup = (fromGroupRes as any).data ?? null

  // Load all groups the user is in that have joined this season
  const { data: pgData } = await supabase
    .from('pick_group_members')
    .select('pick_groups!inner(id, name, pick_group_seasons!inner(season_id))')
    .eq('user_id', user.id)
    .eq('pick_groups.pick_group_seasons.season_id', seasonId)

  const participatingGroups = (pgData ?? [])
    .map((r: any) => r.pick_groups)
    .filter(Boolean) as { id: string; name: string }[]

  // Use `from` param if valid, else default to first group
  const pickGroupId: string | null =
    (groupId && participatingGroups.find(g => g.id === groupId))
      ? groupId
      : participatingGroups[0]?.id ?? null

  const activeGroup = participatingGroups.find(g => g.id === pickGroupId) ?? null
  const inGroup = !!pickGroupId

  // Only load prediction data if we have a group context
  const [groupsRes, matchesRes, groupPredsRes, matchPredsRes, roundRes] = inGroup
    ? await Promise.all([
        supabase
          .from('tournament_groups')
          .select(`id, name, slug, rounds!inner(season_id), group_teams(team_id, final_position, teams(id, name, short_name, logo_url, country_code))`)
          .eq('rounds.season_id', seasonId)
          .order('slug'),
        supabase
          .from('matches')
          .select(`id, kickoff_at, status, home_score, away_score, match_day, group_id, rounds!inner(season_id), home_team:home_team_id(id, name, short_name, logo_url), away_team:away_team_id(id, name, short_name, logo_url)`)
          .eq('rounds.season_id', seasonId)
          .not('group_id', 'is', null)
          .order('kickoff_at'),
        supabase.from('group_predictions')
          .select('group_id, team_id, predicted_position')
          .eq('user_id', user.id)
          .eq('pick_group_id', pickGroupId!),
        supabase.from('match_predictions')
          .select('match_id, home_score, away_score')
          .eq('user_id', user.id)
          .eq('pick_group_id', pickGroupId!),
        supabase.from('rounds')
          .select('prediction_window')
          .eq('season_id', seasonId)
          .eq('slug', 'group_stage')
          .single(),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: null }]

  const predictionsOpen = (roundRes.data as { prediction_window?: string } | null)?.prediction_window === 'open'

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="animate-hero animate-hero-1 flex flex-col gap-2">
        {fromGroup && (
          <Link
            href={`/groups/${fromGroup.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-accent transition-colors"
          >
            ← {fromGroup.name}
          </Link>
        )}
        <div>
          <div className="text-sm text-slate-400 font-medium uppercase tracking-wide">
            {(season as any).competitions?.name}
          </div>
          <h1 className="text-3xl font-black text-slate-100 mt-0.5">{season.name} — Group Stage</h1>
        </div>

        {/* Group context — always visible */}
        {activeGroup && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-sm text-slate-400">Predicting for:</span>
            {participatingGroups.length === 1 ? (
              <span className="text-sm font-semibold text-accent">{activeGroup.name}</span>
            ) : (
              participatingGroups.map(g => (
                <Link
                  key={g.id}
                  href={`/predict/${seasonId}/group-stage?from=${g.id}`}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    g.id === pickGroupId
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'border border-slate-600 text-slate-400 hover:border-accent hover:text-accent'
                  }`}
                >
                  {g.name}
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Rules card */}
      <div className="animate-hero animate-hero-2 rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-black text-accent">5 pts</span>
            <span className="text-sm font-semibold text-slate-200">Correct score</span>
            <span className="text-xs text-slate-400">Exact scoreline for any match</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-black text-accent">3 pts</span>
            <span className="text-sm font-semibold text-slate-200">Correct outcome</span>
            <span className="text-xs text-slate-400">Right result — win, draw, or loss</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-black text-accent">1 pt</span>
            <span className="text-sm font-semibold text-slate-200">Group position</span>
            <span className="text-xs text-slate-400">Per correct spot in the final standings — tiebreaker</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 border-t border-slate-700">
          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
          Your picks are sealed until the first match of each group kicks off.
        </div>
      </div>

      {/* Gate: must be in a group */}
      {!inGroup ? (
        <div className="animate-hero animate-hero-3 rounded-xl border border-slate-700 bg-slate-800/60 p-8 flex flex-col items-center text-center gap-4">
          <div className="text-4xl">👥</div>
          <div>
            <div className="font-bold text-slate-200 text-lg">Join a group to start predicting</div>
            <div className="text-slate-400 text-sm mt-1 max-w-sm">
              Predictions are tied to your group. Create or join one, then add this event from the group page.
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/groups/new" className="px-5 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors">
              Create a group
            </Link>
            <Link href="/groups" className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-semibold text-sm hover:border-accent hover:text-accent transition-colors">
              My groups
            </Link>
          </div>
        </div>
      ) : (
        <GroupStageClient
          seasonId={seasonId}
          pickGroupId={pickGroupId!}
          predictionsOpen={predictionsOpen}
          groups={(groupsRes.data ?? []) as any}
          matches={(matchesRes.data ?? []) as any}
          existingGroupPreds={groupPredsRes.data ?? []}
          existingMatchPreds={matchPredsRes.data ?? []}
        />
      )}
    </div>
  )
}

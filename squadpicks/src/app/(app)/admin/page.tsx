import { getSupabaseServer } from '@/lib/supabase/server'
import { SyncButton, SeedFixturesButton, MatchOverrideForm, GroupStandingsForm } from './_client'
import type { MatchRow, GroupRow } from './_client'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — SquadPicks' }

export default async function AdminPage() {
  const supabase = await getSupabaseServer()

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name')
    .neq('status', 'completed')
    .order('year', { ascending: false })
    .limit(1)

  const seasonId = seasons?.[0]?.id
  if (!seasonId) {
    return <div className="text-slate-400 p-8 text-center">No active season.</div>
  }

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, name, type, sort_order')
    .eq('season_id', seasonId)
    .order('sort_order')

  const roundIds = rounds?.map(r => r.id) ?? []
  const groupRoundIds = rounds?.filter(r => r.type === 'group').map(r => r.id) ?? []

  const [matchesRes, groupsRes] = await Promise.all([
    roundIds.length > 0
      ? supabase
          .from('matches')
          .select(`
            id, kickoff_at, status, home_score, away_score, round_id, external_id,
            home_team:home_team_id(id, name, short_name),
            away_team:away_team_id(id, name, short_name)
          `)
          .in('round_id', roundIds)
          .order('kickoff_at')
      : Promise.resolve({ data: [] }),

    groupRoundIds.length > 0
      ? supabase
          .from('tournament_groups')
          .select(`
            id, name, round_id,
            group_teams(team_id, final_position, teams:team_id(id, name))
          `)
          .in('round_id', groupRoundIds)
          .order('name')
      : Promise.resolve({ data: [] }),
  ])

  const matches = (matchesRes.data ?? []) as any[]
  const groups  = (groupsRes.data  ?? []) as any[]

  return (
    <div className="flex flex-col gap-10 max-w-4xl">
      {/* Header + manual sync */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Admin</h1>
          <p className="text-slate-400 text-sm mt-0.5">{seasons[0].name} · scores sync automatically every 5 min</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <SyncButton />
          <SeedFixturesButton />
        </div>
      </div>

      {/* Matches grouped by round */}
      {rounds?.map(round => {
        const roundMatches = matches.filter(m => m.round_id === round.id)
        if (roundMatches.length === 0) return null

        const done  = roundMatches.filter(m => m.status === 'completed').length
        const total = roundMatches.length

        return (
          <section key={round.id}>
            <h2 className="text-base font-bold text-slate-200 mb-3 flex items-center gap-2">
              {round.name}
              <span className={`text-xs font-normal ${done === total ? 'text-accent' : 'text-slate-500'}`}>
                {done}/{total}
              </span>
            </h2>
            <div className="flex flex-col gap-1.5">
              {roundMatches.map((match: any) => {
                const matchRow: MatchRow = {
                  id:          match.id,
                  kickoff_at:  match.kickoff_at,
                  status:      match.status,
                  home_score:  match.home_score,
                  away_score:  match.away_score,
                  home_team:   match.home_team,
                  away_team:   match.away_team,
                  external_id: match.external_id,
                }
                return (
                  <div
                    key={match.id}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                      match.status === 'completed'
                        ? 'border-slate-700/50 bg-slate-800/30'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    <span className="text-xs text-slate-500 w-28 shrink-0">
                      {format(new Date(match.kickoff_at), 'MMM d, HH:mm')}
                    </span>
                    <span className="text-sm text-slate-300 text-right w-20 shrink-0 truncate">
                      {match.home_team?.short_name ?? match.home_team?.name ?? 'TBD'}
                    </span>
                    <MatchOverrideForm match={matchRow} />
                    <span className="text-sm text-slate-300 w-20 shrink-0 truncate">
                      {match.away_team?.short_name ?? match.away_team?.name ?? 'TBD'}
                    </span>
                    {!match.external_id && (
                      <span className="text-xs text-yellow-500 shrink-0" title="No external_id — won't auto-sync">
                        no ID
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Group final standings (manual — needed to score group predictions) */}
      {groups.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-200 mb-1">Group Final Standings</h2>
          <p className="text-sm text-slate-400 mb-5">
            Set after all group matches complete. Triggers group prediction scoring.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group: any) => {
              const groupRow: GroupRow = {
                id:    group.id,
                name:  group.name,
                teams: (group.group_teams ?? []).map((gt: any) => ({
                  team_id:        gt.team_id,
                  team_name:      gt.teams?.name ?? 'Unknown',
                  final_position: gt.final_position ?? null,
                })),
              }
              return (
                <div key={group.id} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="font-bold text-slate-200 mb-3">{group.name}</h3>
                  <GroupStandingsForm group={groupRow} />
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

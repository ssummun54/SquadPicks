'use client'

import { useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

/* ─── Types ────────────────────────────────────────────────── */

interface Team   { id: string; name: string; short_name: string | null; logo_url: string | null; country_code: string | null }
interface Match  { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; match_day: number | null; group_id: string | null; home_team: Team | null; away_team: Team | null }
interface GroupTeam { team_id: string; final_position: number | null; teams: Team }
interface Group  { id: string; name: string; slug: string; group_teams: GroupTeam[] }

interface ExistingMatchPred  { match_id: string; home_score: number; away_score: number }
interface ExistingGroupPred  { group_id: string; team_id: string; predicted_position: number }

interface Props {
  seasonId: string
  groups: Group[]
  matches: Match[]
  existingGroupPreds: ExistingGroupPred[]
  existingMatchPreds: ExistingMatchPred[]
}

type MatchPreds  = Record<string, { home: string; away: string }>  // match_id → scores
type GroupOrder  = Record<string, string[]>                         // group_id → team_id[]

/* ─── Component ─────────────────────────────────────────────── */

export function GroupStageClient({ seasonId, groups, matches, existingGroupPreds, existingMatchPreds }: Props) {
  // Initialise state from existing predictions
  const initMatchPreds = (): MatchPreds => {
    const m: MatchPreds = {}
    existingMatchPreds.forEach(p => { m[p.match_id] = { home: String(p.home_score), away: String(p.away_score) } })
    return m
  }

  const initGroupOrder = (): GroupOrder => {
    const g: GroupOrder = {}
    groups.forEach(group => {
      const preds = existingGroupPreds.filter(p => p.group_id === group.id).sort((a, b) => a.predicted_position - b.predicted_position)
      if (preds.length === group.group_teams.length) {
        g[group.id] = preds.map(p => p.team_id)
      } else {
        g[group.id] = group.group_teams.map(gt => gt.team_id)
      }
    })
    return g
  }

  const [matchPreds, setMatchPreds] = useState<MatchPreds>(initMatchPreds)
  const [groupOrder, setGroupOrder] = useState<GroupOrder>(initGroupOrder)
  const [saving, setSaving]         = useState(false)
  const [saved,  setSaved]          = useState(false)
  const [error,  setError]          = useState('')

  const setScore = useCallback((matchId: string, side: 'home' | 'away', value: string) => {
    if (!/^\d{0,2}$/.test(value)) return
    setMatchPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }))
    setSaved(false)
  }, [])

  const moveTeam = useCallback((groupId: string, fromIdx: number, toIdx: number) => {
    setGroupOrder(prev => {
      const arr = [...(prev[groupId] ?? [])]
      const [item] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      return { ...prev, [groupId]: arr }
    })
    setSaved(false)
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setSaving(false); return }

    // Build upsert payloads
    const matchUpserts = Object.entries(matchPreds)
      .filter(([, v]) => v.home !== '' && v.away !== '')
      .map(([match_id, v]) => ({
        user_id: user.id, match_id,
        home_score: Number(v.home), away_score: Number(v.away),
      }))

    const groupUpserts = Object.entries(groupOrder).flatMap(([group_id, teamIds]) =>
      teamIds.map((team_id, idx) => ({
        user_id: user.id, group_id, team_id, predicted_position: idx + 1,
      }))
    )

    const [mr, gr] = await Promise.all([
      matchUpserts.length > 0
        ? supabase.from('match_predictions').upsert(matchUpserts, { onConflict: 'user_id,match_id' })
        : Promise.resolve({ error: null }),
      groupUpserts.length > 0
        ? supabase.from('group_predictions').upsert(groupUpserts, { onConflict: 'user_id,group_id,team_id' })
        : Promise.resolve({ error: null }),
    ])

    if (mr.error || gr.error) { setError(mr.error?.message ?? gr.error?.message ?? 'Save failed'); setSaving(false); return }
    setSaved(true); setSaving(false)
  }

  // Group matches by group_id
  const matchesByGroup = matches.reduce<Record<string, Match[]>>((acc, m) => {
    if (!m.group_id) return acc
    acc[m.group_id] ??= []
    acc[m.group_id].push(m)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-8">
      {groups.map(group => {
        const gMatches = matchesByGroup[group.id] ?? []
        const order    = groupOrder[group.id] ?? group.group_teams.map(gt => gt.team_id)
        const teamMap  = Object.fromEntries(group.group_teams.map(gt => [gt.team_id, gt.teams]))

        return (
          <div key={group.id} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
            <div className="px-5 py-3 bg-slate-900 border-b border-slate-700 font-bold text-slate-200">
              {group.name}
            </div>

            <div className="p-5 grid lg:grid-cols-2 gap-6">
              {/* Standing picker */}
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
                  Predicted final standing
                </div>
                <div className="flex flex-col gap-2">
                  {order.map((teamId, idx) => {
                    const team = teamMap[teamId]
                    if (!team) return null
                    return (
                      <div key={teamId} className="flex items-center gap-3 bg-slate-900 rounded-lg px-4 py-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx < 2 ? 'bg-brand text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-slate-200">{team.name}</span>
                        <div className="flex gap-1">
                          <button
                            disabled={idx === 0}
                            onClick={() => moveTeam(group.id, idx, idx - 1)}
                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                          >▲</button>
                          <button
                            disabled={idx === order.length - 1}
                            onClick={() => moveTeam(group.id, idx, idx + 1)}
                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition-colors"
                          >▼</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Match score inputs */}
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">
                  Match score predictions
                </div>
                <div className="flex flex-col gap-2">
                  {gMatches.length === 0 ? (
                    <p className="text-sm text-slate-500">No matches scheduled yet.</p>
                  ) : (
                    gMatches.map(match => {
                      const pred     = matchPreds[match.id] ?? { home: '', away: '' }
                      const locked   = new Date(match.kickoff_at) <= new Date()
                      const kickoff  = format(new Date(match.kickoff_at), 'MMM d, HH:mm')

                      return (
                        <div key={match.id} className={`rounded-lg px-4 py-3 ${locked ? 'bg-slate-900/50 opacity-70' : 'bg-slate-900'}`}>
                          <div className="text-xs text-slate-500 mb-2">{kickoff}{locked ? ' · Locked' : ''}</div>
                          <div className="flex items-center gap-3">
                            <span className="flex-1 text-sm text-right text-slate-200 truncate">
                              {match.home_team?.short_name ?? match.home_team?.name ?? 'TBD'}
                            </span>
                            <input
                              type="number"
                              min={0} max={99}
                              disabled={locked}
                              value={pred.home}
                              onChange={e => setScore(match.id, 'home', e.target.value)}
                              className="w-10 h-9 text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
                              placeholder="–"
                            />
                            <span className="text-slate-500 font-bold">:</span>
                            <input
                              type="number"
                              min={0} max={99}
                              disabled={locked}
                              value={pred.away}
                              onChange={e => setScore(match.id, 'away', e.target.value)}
                              className="w-10 h-9 text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm disabled:opacity-50"
                              placeholder="–"
                            />
                            <span className="flex-1 text-sm text-slate-200 truncate">
                              {match.away_team?.short_name ?? match.away_team?.name ?? 'TBD'}
                            </span>
                          </div>
                          {/* Show actual score if completed */}
                          {match.status === 'completed' && match.home_score !== null && (
                            <div className="text-xs text-accent text-center mt-1">
                              Result: {match.home_score} – {match.away_score}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Save bar */}
      <div className="sticky bottom-6 flex items-center justify-center gap-4">
        <div className={`flex items-center gap-4 px-6 py-3 rounded-xl shadow-xl border ${
          error ? 'border-red-700 bg-red-950' : 'border-slate-700 bg-slate-900'
        }`}>
          {error && <span className="text-sm text-red-400">{error}</span>}
          {saved && <span className="text-sm text-accent">✓ Saved</span>}
          <Button onClick={handleSave} loading={saving} size="md">
            Save all predictions
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ROUND_POINTS } from '@/lib/scoring'

interface Team  { id: string; name: string; short_name: string | null; logo_url: string | null }
interface Round { id: string; name: string; slug: string; sort_order: number; prediction_window: string }
interface Match { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; bracket_slot: string | null; round_id: string; home_team: Team | null; away_team: Team | null }
type ResultMethod = '90' | 'ET' | 'PK'
interface ExistingPred {
  match_id: string
  predicted_winner_id: string
  predicted_home_score: number | null
  predicted_away_score: number | null
  predicted_result_method: ResultMethod | null
}

interface Props {
  rounds: Round[]
  matches: Match[]
  existingPreds: ExistingPred[]
}

type Pick = {
  winnerId: string
  homeScore: string
  awayScore: string
  method: ResultMethod | ''
}
type Picks = Record<string, Pick>

const METHODS: { value: ResultMethod; label: string }[] = [
  { value: '90', label: '90' },
  { value: 'ET', label: 'ET' },
  { value: 'PK', label: 'PKs' },
]

export function KnockoutClient({ rounds, matches, existingPreds }: Props) {
  const [picks, setPicks]   = useState<Picks>(() => Object.fromEntries(existingPreds.map(p => [
    p.match_id,
    {
      winnerId: p.predicted_winner_id,
      homeScore: p.predicted_home_score === null ? '' : String(p.predicted_home_score),
      awayScore: p.predicted_away_score === null ? '' : String(p.predicted_away_score),
      method: p.predicted_result_method ?? '',
    },
  ])))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')
  const isSingleFinal = rounds.length === 1 && rounds[0]?.slug === 'final'

  const matchesByRound = matches.reduce<Record<string, Match[]>>((acc, m) => {
    acc[m.round_id] ??= []
    acc[m.round_id].push(m)
    return acc
  }, {})

  const updatePick = useCallback((matchId: string, patch: Partial<Pick>) => {
    setPicks(prev => ({
      ...prev,
      [matchId]: { ...{ winnerId: '', homeScore: '', awayScore: '', method: '' }, ...prev[matchId], ...patch },
    }))
    setSaved(false)
  }, [])

  const pickWinner = useCallback((matchId: string, teamId: string) => {
    setPicks(prev => {
      const current = prev[matchId] ?? { winnerId: '', homeScore: '', awayScore: '', method: '' }
      return { ...prev, [matchId]: { ...current, winnerId: current.winnerId === teamId ? '' : teamId } }
    })
    setSaved(false)
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setSaving(false); return }

    if (isSingleFinal) {
      const missingFinalPick = matches.some(match => {
        const pick = picks[match.id]
        return !pick?.winnerId || pick.homeScore === '' || pick.awayScore === '' || !pick.method
      })
      if (missingFinalPick) {
        setError('Pick a winner, score, and method.')
        setSaving(false)
        return
      }
      const invalidFinalPick = matches.some(match => {
        const pick = picks[match.id]
        if (!pick || !match.home_team || !match.away_team) return false
        const homeScore = Number(pick.homeScore)
        const awayScore = Number(pick.awayScore)
        if (pick.method === 'PK') return homeScore !== awayScore
        const scoreWinnerId = homeScore > awayScore ? match.home_team.id : awayScore > homeScore ? match.away_team.id : ''
        return !scoreWinnerId || scoreWinnerId !== pick.winnerId
      })
      if (invalidFinalPick) {
        setError('Make the score match the winner and method.')
        setSaving(false)
        return
      }
    }

    const upserts = Object.entries(picks)
      .filter(([, pick]) => !!pick.winnerId)
      .map(([match_id, pick]) => ({
        user_id: user.id,
        match_id,
        predicted_winner_id: pick.winnerId,
        predicted_home_score: pick.homeScore === '' ? null : Number(pick.homeScore),
        predicted_away_score: pick.awayScore === '' ? null : Number(pick.awayScore),
        predicted_result_method: pick.method || null,
      }))

    if (upserts.length === 0) { setSaved(true); setSaving(false); return }

    const { error: err } = await supabase
      .from('bracket_predictions')
      .upsert(upserts, { onConflict: 'user_id,match_id' })

    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true); setSaving(false)
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-10 text-center text-slate-400">
        The knockout bracket hasn&apos;t been set yet. Come back after the group stage.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {rounds.map(round => {
        const roundMatches = matchesByRound[round.id] ?? []
        const pts = ROUND_POINTS[round.slug]?.winner ?? 2

        return (
          <section key={round.id}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-200">{round.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20">
                {isSingleFinal ? '5 winner · 3 score · 2 method' : `${pts} pts / correct pick`}
              </span>
              {round.prediction_window === 'closed' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600/10 text-yellow-400 border border-yellow-600/20">
                  Opens after previous round
                </span>
              )}
            </div>

            {roundMatches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                Matches TBD after previous round
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {roundMatches.map(match => {
                  const locked  = new Date(match.kickoff_at) <= new Date()
                  const noPicks = !match.home_team || !match.away_team
                  const pick = picks[match.id] ?? { winnerId: '', homeScore: '', awayScore: '', method: '' }
                  const selectedId = pick.winnerId

                  return (
                    <div key={match.id} className={`rounded-xl border ${locked ? 'border-slate-700 opacity-70' : 'border-slate-600'} bg-slate-800 overflow-hidden`}>
                      <div className="px-3 py-1.5 bg-slate-900 text-xs text-slate-400 border-b border-slate-700 flex justify-between">
                        <span>{match.kickoff_at ? format(new Date(match.kickoff_at), 'MMM d') : 'TBD'}</span>
                        {locked && <span className="text-yellow-400">Locked</span>}
                        {match.status === 'completed' && <span className="text-accent">FT</span>}
                      </div>

                      {noPicks ? (
                        <div className="p-4 text-center text-sm text-slate-500">Teams TBD</div>
                      ) : (
                        <div className="flex flex-col divide-y divide-slate-700">
                          {[{ team: match.home_team!, isHome: true }, { team: match.away_team!, isHome: false }].map(({ team }) => {
                            const isSelected = selectedId === team.id
                            const isWinner   = match.status === 'completed' && (
                              (match.home_score ?? 0) > (match.away_score ?? 0) ? match.home_team?.id === team.id
                                : match.away_team?.id === team.id
                            )

                            return (
                              <button
                                key={team.id}
                                disabled={locked || noPicks}
                                onClick={() => pickWinner(match.id, team.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default ${
                                  isSelected
                                    ? 'bg-accent/15 text-accent'
                                    : 'text-slate-300 hover:bg-slate-700 disabled:hover:bg-transparent'
                                }`}
                              >
                                <span className="flex-1 text-sm font-medium">{team.short_name ?? team.name}</span>
                                {isSelected && !locked && <span className="text-accent text-xs">✓ Pick</span>}
                                {isWinner && <span className="text-xs text-yellow-400">Winner</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {isSingleFinal && !noPicks && (
                        <div className="p-4 border-t border-slate-700 flex flex-col gap-4">
                          <div className="flex items-center justify-center gap-3">
                            <select
                              disabled={locked}
                              value={pick.homeScore}
                              onChange={e => updatePick(match.id, { homeScore: e.target.value })}
                              className="w-16 h-10 text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-40"
                              aria-label={`${match.home_team?.short_name ?? match.home_team?.name} score`}
                            >
                              <option value="">-</option>
                              {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                            <span className="text-slate-500 font-bold">:</span>
                            <select
                              disabled={locked}
                              value={pick.awayScore}
                              onChange={e => updatePick(match.id, { awayScore: e.target.value })}
                              className="w-16 h-10 text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-40"
                              aria-label={`${match.away_team?.short_name ?? match.away_team?.name} score`}
                            >
                              <option value="">-</option>
                              {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {METHODS.map(method => (
                              <button
                                key={method.value}
                                type="button"
                                disabled={locked}
                                onClick={() => updatePick(match.id, { method: method.value })}
                                className={`h-9 rounded-md border text-xs font-semibold transition-colors disabled:opacity-40 ${
                                  pick.method === method.value
                                    ? 'border-accent bg-accent/15 text-accent'
                                    : 'border-slate-600 text-slate-300 hover:border-accent hover:text-accent'
                                }`}
                              >
                                {method.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {match.status === 'completed' && match.home_score !== null && (
                        <div className="px-3 py-1.5 bg-slate-900/50 text-xs text-center text-slate-400 border-t border-slate-700">
                          {match.home_score} – {match.away_score}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {/* Save bar */}
      <div className="sticky bottom-6 flex items-center justify-center">
        <div className={`flex items-center gap-4 px-6 py-3 rounded-xl shadow-xl border ${
          error ? 'border-red-700 bg-red-950' : 'border-slate-700 bg-slate-900'
        }`}>
          {error && <span className="text-sm text-red-400">{error}</span>}
          {saved && <span className="text-sm text-accent">✓ Saved</span>}
          <Button onClick={handleSave} loading={saving}>{isSingleFinal ? 'Save final pick' : 'Save bracket picks'}</Button>
        </div>
      </div>
    </div>
  )
}

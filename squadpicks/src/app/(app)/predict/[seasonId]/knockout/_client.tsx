'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { getSupabaseClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Team  { id: string; name: string; short_name: string | null; logo_url: string | null }
interface Round { id: string; name: string; slug: string; sort_order: number; prediction_window: string }
interface Match { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; result_method: string | null; round_id: string; home_team: Team | null; away_team: Team | null }
type ResultMethod = '90' | 'ET' | 'PK'

interface ExistingPred {
  match_id: string
  home_score: number
  away_score: number
  predicted_method: ResultMethod | null
  points_exact: number
  points_outcome: number
  points_method: number
}

interface Props {
  pickGroupId: string
  rounds: Round[]
  matches: Match[]
  existingPreds: ExistingPred[]
}

type MatchPred = { home: string; away: string; method: ResultMethod | '' }
type MatchPreds = Record<string, MatchPred>

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function KnockoutClient({ pickGroupId, rounds, matches, existingPreds }: Props) {
  const matchPoints: Record<string, number> = {}
  existingPreds.forEach(p => { matchPoints[p.match_id] = p.points_exact + p.points_outcome + p.points_method })

  const [preds, setPreds] = useState<MatchPreds>(() => {
    const m: MatchPreds = {}
    existingPreds.forEach(p => {
      m[p.match_id] = { home: String(p.home_score), away: String(p.away_score), method: p.predicted_method ?? '' }
    })
    return m
  })
  const [submitted, setSubmitted] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {}
    existingPreds.forEach(p => { s[p.match_id] = true })
    return s
  })
  const [saveState, setSaveState] = useState<Record<string, 'saving' | 'saved' | 'error'>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [validationError, setValidationError] = useState<Record<string, string>>({})

  const userIdRef = useRef<string | null>(null)
  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
  }, [])

  const matchesByRound = matches.reduce<Record<string, Match[]>>((acc, m) => {
    acc[m.round_id] ??= []
    acc[m.round_id].push(m)
    return acc
  }, {})

  const setScore = useCallback((matchId: string, side: 'home' | 'away', val: string) => {
    setPreds(prev => {
      const current = { ...{ home: '', away: '', method: '' as ResultMethod | '' }, ...prev[matchId], [side]: val }
      const h = Number(current.home), a = Number(current.away)
      const hasScores = current.home !== '' && current.away !== ''
      if (hasScores && current.method) {
        const diff = Math.abs(h - a)
        const isDraw = h === a
        if (current.method === 'PK' && diff !== 1) current.method = ''
        if ((current.method === '90' || current.method === 'ET') && isDraw) current.method = ''
      }
      return { ...prev, [matchId]: current }
    })
    setSaveState(prev => { const n = { ...prev }; delete n[matchId]; return n })
    setValidationError(prev => { const n = { ...prev }; delete n[matchId]; return n })
  }, [])

  const setMethod = useCallback((matchId: string, method: ResultMethod) => {
    setPreds(prev => {
      const current = prev[matchId] ?? { home: '', away: '', method: '' }
      return { ...prev, [matchId]: { ...current, method: current.method === method ? '' : method } }
    })
    setSaveState(prev => { const n = { ...prev }; delete n[matchId]; return n })
    setValidationError(prev => { const n = { ...prev }; delete n[matchId]; return n })
  }, [])

  const savePred = useCallback(async (matchId: string) => {
    const pred = preds[matchId]
    if (!pred || pred.home === '' || pred.away === '' || !pred.method) return

    const home = Number(pred.home)
    const away = Number(pred.away)

    if (pred.method === 'PK' && Math.abs(home - away) !== 1) {
      setValidationError(prev => ({ ...prev, [matchId]: 'Penalties require a 1-goal difference' }))
      return
    }
    if (pred.method === '90' && home === away) {
      setValidationError(prev => ({ ...prev, [matchId]: 'No draws in knockouts — pick a winner' }))
      return
    }
    if (pred.method === 'ET' && home === away) {
      setValidationError(prev => ({ ...prev, [matchId]: 'No draws in knockouts — pick a winner' }))
      return
    }

    let userId = userIdRef.current
    if (!userId) {
      const { data } = await getSupabaseClient().auth.getUser()
      userId = data.user?.id ?? null
      userIdRef.current = userId
    }
    if (!userId) return

    setSaveState(s => ({ ...s, [matchId]: 'saving' }))

    const { error } = await getSupabaseClient().from('match_predictions').upsert(
      { user_id: userId, match_id: matchId, pick_group_id: pickGroupId, home_score: home, away_score: away, predicted_method: pred.method },
      { onConflict: 'user_id,match_id,pick_group_id' }
    )

    if (error) {
      setSaveState(s => ({ ...s, [matchId]: 'error' }))
      return
    }

    setSubmitted(s => ({ ...s, [matchId]: true }))
    setSaveState(s => ({ ...s, [matchId]: 'saved' }))
  }, [preds, pickGroupId])

  const unlockPred = useCallback((matchId: string) => {
    setSubmitted(s => ({ ...s, [matchId]: false }))
    setSaveState(prev => { const n = { ...prev }; delete n[matchId]; return n })
  }, [])

  const resetPred = useCallback(async (matchId: string) => {
    let userId = userIdRef.current
    if (!userId) {
      const { data } = await getSupabaseClient().auth.getUser()
      userId = data.user?.id ?? null
      userIdRef.current = userId
    }
    if (!userId) return
    await getSupabaseClient().from('match_predictions')
      .delete()
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .eq('pick_group_id', pickGroupId)
    setPreds(s => ({ ...s, [matchId]: { home: '', away: '', method: '' } }))
    setSubmitted(s => ({ ...s, [matchId]: false }))
    setSaveState(s => { const n = { ...s }; delete n[matchId]; return n })
  }, [pickGroupId])

  const [viewMode, setViewMode] = useState<'round' | 'date'>(() =>
    (typeof window !== 'undefined' && localStorage.getItem('knockout-view-mode') as 'round' | 'date') || 'round'
  )
  const changeViewMode = (mode: 'round' | 'date') => {
    setViewMode(mode)
    localStorage.setItem('knockout-view-mode', mode)
  }

  const allMatchesByDate = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const day = format(new Date(m.kickoff_at), 'EEE, MMM d')
    acc[day] ??= []
    acc[day].push(m)
    return acc
  }, {})

  const roundNameById = Object.fromEntries(rounds.map(r => [r.id, r.name]))

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-10 text-center text-slate-400">
        The knockout bracket hasn&apos;t been set yet. Come back after the group stage.
      </div>
    )
  }

  const renderMatch = (match: Match, showRound?: boolean) => {
    const now = new Date()
    const locked = new Date(match.kickoff_at) <= now
    const pred = preds[match.id] ?? { home: '', away: '', method: '' }
    const isSubmitted = submitted[match.id]
    const editable = !locked && !isSubmitted
    const canSubmit = pred.home !== '' && pred.away !== '' && pred.method !== ''

    return (
      <div key={match.id} className={`rounded-lg pl-3 pr-4 sm:px-4 py-3 min-w-0 ${locked ? 'bg-slate-900/40' : 'bg-slate-900/70'}`}>
        <div className="text-xs text-slate-500 mb-2.5 flex items-center gap-2 min-w-0">
          <span>{format(new Date(match.kickoff_at), 'HH:mm')}</span>
          {showRound && <span className="text-slate-600 font-medium">{roundNameById[match.round_id]}</span>}
          {locked && match.status !== 'completed' && (
            <span className="flex items-center gap-1 text-yellow-600"><LockIcon /> Locked</span>
          )}
          {match.status === 'completed' && match.home_score !== null && (
            <span className="text-accent">
              Result: {match.home_score}–{match.away_score} ({match.result_method})
              {match.id in matchPoints && <> · {matchPoints[match.id]}pts</>}
            </span>
          )}
          <span className="ml-auto text-xs shrink-0">
            {saveState[match.id] === 'saving' && <span className="text-slate-500">Saving…</span>}
            {saveState[match.id] === 'error' && <span className="text-red-400">Error</span>}
          </span>
        </div>

        <div className="grid items-center gap-1 sm:gap-3 grid-cols-[minmax(0,1fr)_2.5rem_auto_2.5rem_minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_3.5rem_auto_3.5rem_minmax(0,1fr)_auto_auto]">
          <span className="min-w-0 flex items-center justify-end gap-1 sm:gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">{match.home_team?.short_name ?? match.home_team?.name ?? 'TBD'}</span>
            {match.home_team?.logo_url && <Image src={match.home_team.logo_url} alt="" width={20} height={20} className="object-contain shrink-0" />}
          </span>
          <select
            disabled={!editable}
            value={pred.home}
            onChange={e => setScore(match.id, 'home', e.target.value)}
            className="w-10 sm:w-14 h-9 appearance-none text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            <option value="">–</option>
            {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <span className="text-slate-500 font-bold text-sm">:</span>
          <select
            disabled={!editable}
            value={pred.away}
            onChange={e => setScore(match.id, 'away', e.target.value)}
            className="w-10 sm:w-14 h-9 appearance-none text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-40 transition-colors cursor-pointer shrink-0"
          >
            <option value="">–</option>
            {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <span className="min-w-0 flex items-center gap-1 sm:gap-2">
            {match.away_team?.logo_url && <Image src={match.away_team.logo_url} alt="" width={20} height={20} className="object-contain shrink-0" />}
            <span className="text-sm font-medium text-slate-200 truncate">{match.away_team?.short_name ?? match.away_team?.name ?? 'TBD'}</span>
          </span>

          {(() => {
            const h = Number(pred.home), a = Number(pred.away)
            const hasScores = pred.home !== '' && pred.away !== ''
            const diff = Math.abs(h - a)
            const isDraw = hasScores && h === a
            const pkAllowed = !hasScores || diff === 1
            const regAllowed = !hasScores || !isDraw
            return (
              <>
                {/* Mobile: dropdown */}
                <select
                  disabled={!editable}
                  value={pred.method}
                  onChange={e => setMethod(match.id, e.target.value as ResultMethod)}
                  className="sm:hidden w-14 h-9 appearance-none text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-xs font-semibold focus:outline-none focus:border-accent disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <option value="">–</option>
                  {regAllowed && <option value="90">90</option>}
                  {regAllowed && <option value="ET">ET</option>}
                  {pkAllowed && <option value="PK">PK</option>}
                </select>
                {/* Desktop: buttons */}
                <div className="hidden sm:flex items-center gap-1">
                  {(['90', 'ET', 'PK'] as ResultMethod[]).map(m => {
                    const methodDisabled = !editable || (m === 'PK' && !pkAllowed) || ((m === '90' || m === 'ET') && !regAllowed)
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={methodDisabled}
                        onClick={() => setMethod(match.id, m)}
                        className={`w-9 h-9 rounded-md border text-xs font-semibold transition-colors disabled:opacity-40 ${
                          pred.method === m
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-slate-600 text-slate-400 hover:border-accent hover:text-accent'
                        }`}
                      >
                        {m === 'PK' ? 'PK' : m}
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()}

          {!locked && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={!isSubmitted || saveState[match.id] === 'saving'}
                onClick={() => unlockPred(match.id)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md border flex items-center justify-center transition-colors ${
                  !isSubmitted ? 'border-accent/50 bg-accent/10 text-accent' : 'border-slate-500 bg-slate-800 text-slate-300 hover:border-accent/50 hover:text-accent'
                } disabled:cursor-default`}
                title="Edit prediction"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                disabled={isSubmitted || !canSubmit || saveState[match.id] === 'saving'}
                onClick={() => savePred(match.id)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md border flex items-center justify-center transition-colors ${
                  isSubmitted ? 'border-accent/50 bg-accent/10 text-accent' : canSubmit ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-accent hover:border-accent/50' : 'border-slate-700 bg-slate-800 text-slate-600'
                } disabled:cursor-default`}
                title="Save prediction"
              >
                <CheckIcon />
              </button>
            </div>
          )}
        </div>

        {validationError[match.id] && (
          <div className="text-xs text-red-400 mt-1">{validationError[match.id]}</div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* View toggle */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => changeViewMode('round')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'round' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
        >
          By Round
        </button>
        <button
          onClick={() => changeViewMode('date')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'date' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
        >
          By Date
        </button>
      </div>

      {/* Date view */}
      {viewMode === 'date' && (
        <div className="flex flex-col gap-4">
          {Object.entries(allMatchesByDate).map(([day, dayMatches]) => {
            const isCollapsed = collapsed[day] ?? false
            return (
              <div key={day} className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCollapsed(s => ({ ...s, [day]: !isCollapsed }))}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
                >
                  <span className="font-black text-slate-100 text-lg">{day}</span>
                  <span className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                    <span>{dayMatches.length} match{dayMatches.length === 1 ? '' : 'es'}</span>
                    <span className="text-slate-400 text-xl font-light leading-none">{isCollapsed ? '+' : '−'}</span>
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="p-2 sm:p-3 flex flex-col gap-2 border-t border-slate-700">
                    {dayMatches.map(m => renderMatch(m, true))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Round view */}
      {viewMode === 'round' && rounds.map(round => {
        const roundMatches = matchesByRound[round.id] ?? []
        const isCollapsed = collapsed[round.id] ?? false

        if (roundMatches.length === 0) {
          return (
            <section key={round.id}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-bold text-slate-200">{round.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600/10 text-yellow-400 border border-yellow-600/20">
                  Opens after previous round
                </span>
              </div>
              <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                Matches TBD after previous round
              </div>
            </section>
          )
        }

        const done = roundMatches.filter(m => m.status === 'completed').length

        return (
          <div key={round.id} className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setCollapsed(s => ({ ...s, [round.id]: !isCollapsed }))}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
            >
              <span className="font-black text-slate-100 text-lg">{round.name}</span>
              <span className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                <span>{done}/{roundMatches.length}</span>
                <span className="text-slate-400 text-xl font-light leading-none">{isCollapsed ? '+' : '−'}</span>
              </span>
            </button>
            {!isCollapsed && (
              <div className="p-2 sm:p-3 flex flex-col gap-2 border-t border-slate-700">
                {Object.entries(
                  roundMatches.reduce<Record<string, Match[]>>((acc, m) => {
                    const day = format(new Date(m.kickoff_at), 'EEE, MMM d')
                    acc[day] ??= []
                    acc[day].push(m)
                    return acc
                  }, {})
                ).map(([day, dayMatches]) => (
                  <div key={day}>
                    <h3 className="text-xs font-semibold text-slate-500 mb-1.5 mt-1">{day}</h3>
                    {dayMatches.map(m => renderMatch(m))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

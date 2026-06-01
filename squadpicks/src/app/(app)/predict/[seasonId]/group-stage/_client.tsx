'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { getSupabaseClient } from '@/lib/supabase/client'
import { format, isSameDay } from 'date-fns'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* ─── Types ─────────────────────────────────────────────────── */

interface Team      { id: string; name: string; short_name: string | null; logo_url: string | null }
interface Match     { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; group_id: string | null; home_team: Team | null; away_team: Team | null }
interface GroupTeam { team_id: string; final_position: number | null; teams: Team }
interface Group     { id: string; name: string; slug: string; group_teams: GroupTeam[] }

interface ExistingMatchPred { match_id: string; home_score: number; away_score: number }
interface ExistingGroupPred { group_id: string; team_id: string; predicted_position: number }

interface Props {
  seasonId:           string
  pickGroupId:        string
  predictionsOpen:    boolean
  groups:             Group[]
  matches:            Match[]
  existingGroupPreds: ExistingGroupPred[]
  existingMatchPreds: ExistingMatchPred[]
}

type MatchPreds = Record<string, { home: string; away: string }>
type GroupOrder = Record<string, string[]>

/* ─── Sortable team row ─────────────────────────────────────── */

function SortableTeamRow({ teamId, idx, team, disabled }: { teamId: string; idx: number; team: Team; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: teamId, disabled })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 bg-slate-900/70 select-none ${
        isDragging ? 'opacity-50 ring-1 ring-accent' : ''
      }`}
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-slate-700 text-slate-400">
        {idx + 1}
      </span>
      {team.logo_url && (
        <Image src={team.logo_url} alt={team.name} width={20} height={20} className="object-contain shrink-0" />
      )}
      <span className="flex-1 text-sm font-medium text-slate-200 truncate">{team.short_name ?? team.name}</span>
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className={`px-1 touch-none ${
          disabled
            ? 'text-slate-700 cursor-not-allowed'
            : 'text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing'
        }`}
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
    </div>
  )
}

/* ─── Helpers ───────────────────────────────────────────────── */

function groupMatchesByDay(matches: Match[]): { date: Date; matches: Match[] }[] {
  const sorted = [...matches].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())
  const days: { date: Date; matches: Match[] }[] = []
  for (const m of sorted) {
    const d = new Date(m.kickoff_at)
    const existing = days.find(day => isSameDay(day.date, d))
    if (existing) existing.matches.push(m)
    else days.push({ date: d, matches: [m] })
  }
  return days
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function LockIcon({ open = false }: { open?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <path d="M7 11V8a5 5 0 0 1 9.5-2.2" />
      ) : (
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
      )}
      <rect width="14" height="10" x="5" y="11" rx="2" />
    </svg>
  )
}

/* ─── Component ─────────────────────────────────────────────── */

export function GroupStageClient({ pickGroupId, predictionsOpen, groups, matches, existingGroupPreds, existingMatchPreds }: Props) {
  const initMatchPreds = (): MatchPreds => {
    const m: MatchPreds = {}
    existingMatchPreds.forEach(p => { m[p.match_id] = { home: String(p.home_score), away: String(p.away_score) } })
    return m
  }

  const initGroupOrder = (): GroupOrder => {
    const g: GroupOrder = {}
    groups.forEach(group => {
      const preds = existingGroupPreds.filter(p => p.group_id === group.id).sort((a, b) => a.predicted_position - b.predicted_position)
      g[group.id] = preds.length === group.group_teams.length
        ? preds.map(p => p.team_id)
        : group.group_teams.map(gt => gt.team_id)
    })
    return g
  }

  const initSectionCollapsed = (): Record<string, boolean> => {
    const sections: Record<string, boolean> = {}
    const matchesByGroup = matches.reduce<Record<string, Match[]>>((acc, match) => {
      if (!match.group_id) return acc
      acc[match.group_id] ??= []
      acc[match.group_id].push(match)
      return acc
    }, {})

    groups.forEach(group => {
      sections[`${group.id}:standings`] = false
      groupMatchesByDay(matchesByGroup[group.id] ?? []).forEach(({ date }) => {
        sections[`${group.id}:matches:${date.toISOString()}`] = false
      })
    })

    return sections
  }

  const [matchPreds,   setMatchPreds]   = useState<MatchPreds>(initMatchPreds)
  const [matchSubmitted, setMatchSubmitted] = useState<Record<string, boolean>>(() => {
    const submitted: Record<string, boolean> = {}
    existingMatchPreds.forEach(p => { submitted[p.match_id] = true })
    return submitted
  })
  const [groupOrder,   setGroupOrder]   = useState<GroupOrder>(initGroupOrder)
  const [groupSubmitted, setGroupSubmitted] = useState<Record<string, boolean>>(() => {
    const submitted: Record<string, boolean> = {}
    groups.forEach(group => {
      submitted[group.id] = existingGroupPreds.filter(p => p.group_id === group.id).length === group.group_teams.length
    })
    return submitted
  })
  const [collapsed,    setCollapsed]    = useState<Record<string, boolean>>({})
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>(initSectionCollapsed)
  const [matchSaved,   setMatchSaved]   = useState<Record<string, 'saving'|'saved'|'error'>>({})
  const [standingSaved,setStandingSaved]= useState<Record<string, 'saving'|'saved'|'error'>>({})

  // Cache user ID so we don't hit getUser() on every save
  const userIdRef   = useRef<string | null>(null)

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const matchesByGroup = matches.reduce<Record<string, Match[]>>((acc, m) => {
    if (!m.group_id) return acc
    acc[m.group_id] ??= []
    acc[m.group_id].push(m)
    return acc
  }, {})

  const saveMatch = useCallback(async (matchId: string, home: string, away: string) => {
    if (home === '' || away === '') {
      setMatchSaved(s => ({ ...s, [matchId]: 'error' }))
      return
    }
    let userId = userIdRef.current
    if (!userId) {
      const { data } = await getSupabaseClient().auth.getUser()
      userId = data.user?.id ?? null
      userIdRef.current = userId
    }
    if (!userId) return

    setMatchSaved(s => ({ ...s, [matchId]: 'saving' }))

    const { error } = await getSupabaseClient().from('match_predictions').upsert(
      { user_id: userId, match_id: matchId, pick_group_id: pickGroupId, home_score: Number(home), away_score: Number(away) },
      { onConflict: 'user_id,match_id,pick_group_id' }
    )

    if (error) {
      setMatchSaved(s => ({ ...s, [matchId]: 'error' }))
      return
    }

    setMatchSubmitted(s => ({ ...s, [matchId]: true }))
    setMatchSaved(s => ({ ...s, [matchId]: 'saved' }))
  }, [pickGroupId])

  const setScore = useCallback((matchId: string, side: 'home' | 'away', val: string) => {
    setMatchPreds(prev => {
      const updated = { ...prev, [matchId]: { ...prev[matchId], [side]: val } }
      return updated
    })
    setMatchSaved(prev => {
      const next = { ...prev }
      delete next[matchId]
      return next
    })
  }, [])

  const unlockMatch = useCallback((matchId: string) => {
    setMatchSubmitted(s => ({ ...s, [matchId]: false }))
    setMatchSaved(prev => {
      const next = { ...prev }
      delete next[matchId]
      return next
    })
  }, [])

  const saveStandings = useCallback(async (groupId: string, order: string[]) => {
    let userId = userIdRef.current
    if (!userId) {
      const { data } = await getSupabaseClient().auth.getUser()
      userId = data.user?.id ?? null
      userIdRef.current = userId
    }
    if (!userId) return
    setStandingSaved(s => ({ ...s, [groupId]: 'saving' }))
    const upserts = order.map((team_id, idx) => ({
      user_id: userId, group_id: groupId, team_id, pick_group_id: pickGroupId,
      predicted_position: idx + 1,
    }))
    const { error } = await getSupabaseClient().from('group_predictions')
      .upsert(upserts, { onConflict: 'user_id,group_id,team_id,pick_group_id' })
    if (!error) setGroupSubmitted(s => ({ ...s, [groupId]: true }))
    setStandingSaved(s => ({ ...s, [groupId]: error ? 'error' : 'saved' }))
  }, [pickGroupId])

  const unlockStandings = useCallback((groupId: string) => {
    setGroupSubmitted(s => ({ ...s, [groupId]: false }))
    setStandingSaved(prev => {
      const next = { ...prev }
      delete next[groupId]
      return next
    })
  }, [])

  const handleDragEnd = useCallback((groupId: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setGroupOrder(prev => {
      const order = prev[groupId] ?? []
      const oldIdx = order.indexOf(String(active.id))
      const newIdx = order.indexOf(String(over.id))
      const newOrder = arrayMove(order, oldIdx, newIdx)
      return { ...prev, [groupId]: newOrder }
    })
    setStandingSaved(prev => {
      const next = { ...prev }
      delete next[groupId]
      return next
    })
  }, [])

  if (groups.length === 0) {
    return <p className="text-slate-400 text-sm">No group stage data yet — check back once teams are seeded.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(group => {
        const isCollapsed = !!collapsed[group.id]
        const gMatches    = matchesByGroup[group.id] ?? []
        const days        = groupMatchesByDay(gMatches)
        const order       = groupOrder[group.id] ?? group.group_teams.map(gt => gt.team_id)
        const teamMap     = Object.fromEntries(group.group_teams.map(gt => [gt.team_id, gt.teams]))
        const now         = new Date()
        const firstKickoff = gMatches.reduce<Date | null>((earliest, match) => {
          const kickoff = new Date(match.kickoff_at)
          return !earliest || kickoff < earliest ? kickoff : earliest
        }, null)
        const allLocked   = !predictionsOpen || (gMatches.length > 0 && gMatches.every(m => new Date(m.kickoff_at) <= now))
        const standingsAllowed = predictionsOpen && !!firstKickoff && firstKickoff > now
        const standingsSubmitted = !!groupSubmitted[group.id]
        const standingsEditable = standingsAllowed && !standingsSubmitted
        const standingsSectionKey = `${group.id}:standings`
        const standingsCollapsed = sectionCollapsed[standingsSectionKey] ?? true

        return (
          <div key={group.id} className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">

            {/* Group header — click to collapse */}
            <button
              onClick={() => setCollapsed(c => ({ ...c, [group.id]: !isCollapsed }))}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-100 text-lg">{group.name}</span>
                {allLocked && <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">Locked</span>}
              </div>
              <span className="text-slate-400 text-xl font-light leading-none">{isCollapsed ? '+' : '−'}</span>
            </button>

            {!isCollapsed && (
              <div className="border-t border-slate-700 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-slate-700 flex flex-col">
                <section className="order-2 lg:order-2 border-t border-slate-700 lg:border-t-0">
                  <div className="flex items-center gap-3 px-5 py-3 bg-slate-900/30">
                    <button
                      type="button"
                      onClick={() => setSectionCollapsed(c => ({ ...c, [standingsSectionKey]: !standingsCollapsed }))}
                      className="min-w-0 flex-1 flex items-center justify-between gap-3 text-left"
                    >
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate">Predicted final standings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSectionCollapsed(c => ({ ...c, [standingsSectionKey]: !standingsCollapsed }))}
                      className="text-slate-400 text-sm shrink-0 px-1"
                      aria-label={standingsCollapsed ? 'Expand standings prediction' : 'Collapse standings prediction'}
                    >
                      {standingsCollapsed ? '+' : '−'}
                    </button>
                  </div>

                  {!standingsCollapsed && (
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          {standingsEditable ? 'Hold and drag to reorder' : 'Standings are read-only'}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          {standingSaved[group.id] === 'saving' && <span className="text-xs text-slate-500">Saving…</span>}
                          {standingSaved[group.id] === 'saved'  && <span className="text-xs text-accent">✓ Saved</span>}
                          {standingSaved[group.id] === 'error'  && <span className="text-xs text-red-400">Error</span>}
                          {standingsAllowed && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={!standingsSubmitted}
                                onClick={() => unlockStandings(group.id)}
                                className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                                  !standingsSubmitted ? 'border-accent/50 bg-accent/10 text-accent' : 'border-slate-500 bg-slate-800 text-slate-300 hover:border-accent/50 hover:text-accent'
                                } disabled:cursor-default`}
                                title="Edit standings"
                              >
                                <PencilIcon />
                              </button>
                              <button
                                type="button"
                                disabled={standingsSubmitted || standingSaved[group.id] === 'saving'}
                                onClick={() => saveStandings(group.id, order)}
                                className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                                  standingsSubmitted ? 'border-accent/50 bg-accent/10 text-accent' : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-accent hover:border-accent/50'
                                } disabled:cursor-default`}
                                title="Save standings"
                              >
                                <CheckIcon />
                              </button>
                            </div>
                          )}
                        </span>
                      </div>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={e => handleDragEnd(group.id, e)}
                      >
                        <SortableContext items={order} strategy={verticalListSortingStrategy}>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-2">
                            {order.map((teamId, idx) => {
                              const team = teamMap[teamId]
                              if (!team) return null
                              return <SortableTeamRow key={teamId} teamId={teamId} idx={idx} team={team} disabled={!standingsEditable} />
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </section>

                <section className="order-1 lg:order-1 px-3 py-5 sm:p-5 flex flex-col gap-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Match predictions</div>

                  {days.length === 0 ? (
                    <p className="text-sm text-slate-500">No matches scheduled yet.</p>
                  ) : (
                    days.map(({ date, matches: dayMatches }) => {
                      const daySectionKey = `${group.id}:matches:${date.toISOString()}`
                      const dayCollapsed = sectionCollapsed[daySectionKey] ?? true

                      return (
                        <div key={date.toISOString()} className="rounded-lg border border-slate-700 bg-slate-900/30 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setSectionCollapsed(c => ({ ...c, [daySectionKey]: !dayCollapsed }))}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
                          >
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate">
                              {format(date, 'EEE, MMM d')}
                            </span>
                            <span className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                              <span>{dayMatches.length} match{dayMatches.length === 1 ? '' : 'es'}</span>
                              <span className="text-slate-400 text-xl font-light leading-none">{dayCollapsed ? '+' : '−'}</span>
                            </span>
                          </button>

                          {!dayCollapsed && (
                            <div className="p-2 sm:p-3 flex flex-col gap-2 border-t border-slate-700">
                              {dayMatches.map(match => {
                                const pred   = matchPreds[match.id] ?? { home: '', away: '' }
                                const locked = new Date(match.kickoff_at) <= now
                                const submitted = !!matchSubmitted[match.id]
                                const predictionsAllowed = predictionsOpen && !locked
                                const editable = predictionsAllowed && !submitted
                                const canSubmit = pred.home !== '' && pred.away !== ''
                                const time   = format(new Date(match.kickoff_at), 'HH:mm')

                                return (
                                  <div key={match.id} className={`rounded-lg px-3 sm:px-4 py-3 min-w-0 ${locked ? 'bg-slate-900/40' : 'bg-slate-900/70'}`}>
                                    <div className="text-xs text-slate-500 mb-2.5 flex items-center gap-2 min-w-0">
                                      <span>{time}</span>
                                      {predictionsAllowed && (
                                        <span className="flex items-center gap-1 text-slate-500" title="Locks at kickoff">
                                          <LockIcon open />
                                        </span>
                                      )}
                                      {locked && (
                                        <span className="flex items-center gap-1 text-yellow-600">
                                          <LockIcon /> Locked
                                        </span>
                                      )}
                                      {match.status === 'completed' && match.home_score !== null && (
                                        <span className="text-accent">Result: {match.home_score}–{match.away_score}</span>
                                      )}
                                      <span className="ml-auto text-xs shrink-0">
                                        {matchSaved[match.id] === 'saving' && <span className="text-slate-500">Saving…</span>}
                                        {matchSaved[match.id] === 'error'  && <span className="text-red-400">Error</span>}
                                      </span>
                                    </div>
                                    <div className={`grid items-center gap-2 sm:gap-3 min-w-0 ${
                                      predictionsAllowed
                                        ? 'grid-cols-[minmax(0,1fr)_3rem_auto_3rem_minmax(0,1fr)_2.25rem] sm:grid-cols-[minmax(0,1fr)_3.5rem_auto_3.5rem_minmax(0,1fr)_2.25rem]'
                                        : 'grid-cols-[minmax(0,1fr)_3rem_auto_3rem_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_3.5rem_auto_3.5rem_minmax(0,1fr)]'
                                    }`}>
                                      <span className="min-w-0 flex-[1_1_0] flex items-center justify-end gap-1.5 sm:gap-2">
                                        <span className="text-sm font-medium text-slate-200 truncate">{match.home_team?.short_name ?? match.home_team?.name ?? 'TBD'}</span>
                                        {match.home_team?.logo_url && <Image src={match.home_team.logo_url} alt="" width={20} height={20} className="object-contain shrink-0" />}
                                      </span>
                                      <select
                                        disabled={!editable}
                                        value={pred.home}
                                        onChange={e => setScore(match.id, 'home', e.target.value)}
                                        className="w-12 sm:w-14 h-9 text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                                      >
                                        <option value="">–</option>
                                        {Array.from({ length: 11 }, (_, i) => (
                                          <option key={i} value={i}>{i}</option>
                                        ))}
                                      </select>
                                      <span className="text-slate-500 font-bold text-sm">:</span>
                                      <select
                                        disabled={!editable}
                                        value={pred.away}
                                        onChange={e => setScore(match.id, 'away', e.target.value)}
                                        className="w-12 sm:w-14 h-9 text-center rounded-md bg-slate-700 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                                      >
                                        <option value="">–</option>
                                        {Array.from({ length: 11 }, (_, i) => (
                                          <option key={i} value={i}>{i}</option>
                                        ))}
                                      </select>
                                      <span className="min-w-0 flex-[1_1_0] flex items-center gap-1.5 sm:gap-2">
                                        {match.away_team?.logo_url && <Image src={match.away_team.logo_url} alt="" width={20} height={20} className="object-contain shrink-0" />}
                                        <span className="text-sm font-medium text-slate-200 truncate">{match.away_team?.short_name ?? match.away_team?.name ?? 'TBD'}</span>
                                      </span>
                                      {predictionsAllowed && (
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            disabled={!submitted || matchSaved[match.id] === 'saving'}
                                            onClick={() => unlockMatch(match.id)}
                                            className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                                              !submitted ? 'border-accent/50 bg-accent/10 text-accent' : 'border-slate-500 bg-slate-800 text-slate-300 hover:border-accent/50 hover:text-accent'
                                            } disabled:cursor-default`}
                                            title="Edit prediction"
                                          >
                                            <PencilIcon />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={submitted || !canSubmit || matchSaved[match.id] === 'saving'}
                                            onClick={() => saveMatch(match.id, pred.home, pred.away)}
                                            className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${
                                              submitted ? 'border-accent/50 bg-accent/10 text-accent' : canSubmit ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-accent hover:border-accent/50' : 'border-slate-700 bg-slate-800 text-slate-600'
                                            } disabled:cursor-default`}
                                            title="Save prediction"
                                          >
                                            <CheckIcon />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </section>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

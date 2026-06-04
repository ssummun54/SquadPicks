'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Round   { slug: string; type: string; prediction_window: string }
interface Season  { id: string; name: string; status: string; competitions: { name: string } | null; rounds?: Round[] }
interface Member  { user_id: string; role: string; profiles: { username: string; display_name: string | null } | null }
interface LbRow   { user_id: string; username: string; display_name: string | null; total_points: number; groupRank: number }

interface Enrollment { id: string; user_id: string; season_id: string; status: string; profiles: { username: string; display_name: string | null; first_name: string | null; last_name: string | null } | null }

interface Props {
  group:              { id: string; name: string; invite_code: string; zelle_info: string | null; cashapp_info: string | null }
  members:            Member[]
  seasons:            Season[]
  availableSeasons:   Season[]
  seasonLeaderboards: Record<string, LbRow[]>
  enrollments:        Enrollment[]
  currentUserId:      string | null
  isAdmin:            boolean
}

function predictionHref(season: Season, groupId: string) {
  const rounds = season.rounds ?? []
  const groupOpen    = rounds.some(r => r.slug === 'group_stage' && r.prediction_window === 'open')
  const seriesOpen   = rounds.some(r => r.slug === 'series'      && r.prediction_window === 'open')
  const finalOnly    = rounds.length > 0 && rounds.every(r => r.slug === 'final')
  const finalOpen    = rounds.some(r => r.slug === 'final'       && r.prediction_window === 'open')
  const knockoutOpen = rounds.some(r => r.type === 'knockout' && r.slug !== 'final' && r.slug !== 'series' && r.prediction_window === 'open')
  const path = seriesOpen ? 'series' : (finalOnly || (!groupOpen && finalOpen)) ? 'final' : (!groupOpen && knockoutOpen) ? 'knockout' : 'group-stage'
  return `/predict/${season.id}/${path}?from=${groupId}`
}

export function GroupPageClient({
  group, members, seasons, availableSeasons, seasonLeaderboards, enrollments, currentUserId, isAdmin,
}: Props) {
  const router = useRouter()
  const [activeSeasonId, setActiveSeasonId] = useState(seasons[0]?.id ?? '')
  const [showJoin, setShowJoin]             = useState(false)
  const [joiningId, setJoiningId]           = useState<string | null>(null)
  const [joinErr, setJoinErr]               = useState('')
  const [copied, setCopied]                 = useState(false)
  const [copiedPayment, setCopiedPayment]   = useState<'zelle' | 'cashapp' | null>(null)

  const handleJoinEvent = async (seasonId: string) => {
    setJoiningId(seasonId); setJoinErr('')
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('pick_group_seasons')
      .insert({ pick_group_id: group.id, season_id: seasonId })
    if (error) { setJoinErr(error.message); setJoiningId(null); return }
    // Auto-approve the admin
    if (currentUserId) {
      const { data: newEnrollment } = await supabase.from('event_enrollments' as any)
        .upsert({ user_id: currentUserId, pick_group_id: group.id, season_id: seasonId, status: 'approved' }, { onConflict: 'user_id,pick_group_id,season_id' })
        .select('id, user_id, season_id, status, profiles(username, display_name, first_name, last_name)')
        .single()
      if (newEnrollment) setEnrollmentList(prev => [...prev, newEnrollment as any])
    }
    setJoiningId(null); setShowJoin(false)
    router.refresh()
  }

  const copyCode = async () => {
    const url = `${window.location.origin}/join/${group.invite_code}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on SquadPicks`,
          text: `I've invited you to my prediction group — join here:`,
          url,
        })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyPayment = async (type: 'zelle' | 'cashapp', value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedPayment(type)
    setTimeout(() => setCopiedPayment(null), 2000)
  }

  const cashAppUrl = (value: string) => {
    const handle = value.trim().replace(/^https?:\/\/cash\.app\//i, '').replace(/^\/+/, '')
    const tag = handle.startsWith('$') ? handle : `$${handle}`
    return `https://cash.app/${encodeURIComponent(tag)}`
  }

  const [enrollmentList, setEnrollmentList] = useState<Enrollment[]>(enrollments)
  const [requesting, setRequesting]         = useState(false)
  const [requestedId, setRequestedId]       = useState<string | null>(null)
  const [reviewing, setReviewing]           = useState<string | null>(null)

  const myEnrollment = (seasonId: string) => {
    const found = enrollmentList.find(e => e.user_id === currentUserId && e.season_id === seasonId)
    if (!found && isAdmin) return { id: '', user_id: currentUserId ?? '', season_id: seasonId, status: 'approved', profiles: null }
    return found
  }

  const pendingForSeason = (seasonId: string) =>
    enrollmentList.filter(e => e.season_id === seasonId && e.status === 'pending')

  const [enrollErr, setEnrollErr] = useState('')

  const requestEnrollment = async (seasonId: string) => {
    if (!currentUserId) return
    setRequesting(true)
    setEnrollErr('')
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('event_enrollments' as any)
      .insert({ user_id: currentUserId, pick_group_id: group.id, season_id: seasonId, status: 'pending' })
      .select('id, user_id, season_id, status, profiles(username, display_name, first_name, last_name)')
      .single()
    if (error) { setEnrollErr(error.message); setRequesting(false); return }
    if (data) {
      setEnrollmentList(prev => [...prev, data as any])
      setRequestedId(seasonId)
    }
    setRequesting(false)
  }

  const reviewEnrollment = async (enrollmentId: string, status: 'approved' | 'denied') => {
    setReviewing(enrollmentId)
    const supabase = getSupabaseClient()
    await supabase.from('event_enrollments' as any)
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', enrollmentId)
    setEnrollmentList(prev => prev.map(e => e.id === enrollmentId ? { ...e, status } : e))
    setReviewing(null)
  }

  const activeSeason = seasons.find(s => s.id === activeSeasonId) ?? seasons[0]
  const lbRaw = activeSeasonId ? (seasonLeaderboards[activeSeasonId] ?? []) : []
  const approvedForActiveSeason = new Set(
    enrollmentList
      .filter(e => e.season_id === activeSeasonId && e.status === 'approved')
      .map(e => e.user_id)
  )
  const leaderboardMembers = members.filter(m => m.role === 'admin' || approvedForActiveSeason.has(m.user_id))

  // Merge leaderboard with approved event members so pending requests stay out of standings.
  const lb = leaderboardMembers.map(m => {
    const row = lbRaw.find(r => r.user_id === m.user_id)
    return {
      user_id:      m.user_id,
      username:     m.profiles?.username ?? '',
      display_name: m.profiles?.display_name ?? null,
      total_points: row?.total_points ?? null,
      groupRank:    row?.groupRank ?? null,
    }
  }).sort((a, b) => {
    if (a.total_points === null && b.total_points === null) return 0
    if (a.total_points === null) return 1
    if (b.total_points === null) return -1
    return b.total_points - a.total_points
  }).map((r, i) => ({ ...r, groupRank: i + 1 }))

  const [deleting, setDeleting]     = useState(false)
  const [zelleVal, setZelleVal]     = useState(group.zelle_info ?? '')
  const [cashappVal, setCashappVal] = useState(group.cashapp_info ?? '')
  const [editingPayment, setEditingPayment] = useState(false)
  const [savingPayment, setSavingPayment]   = useState(false)

  const savePayment = async () => {
    setSavingPayment(true)
    const supabase = getSupabaseClient()
    await supabase.from('pick_groups').update({
      zelle_info:   zelleVal.trim() || null,
      cashapp_info: cashappVal.trim() || null,
    } as any).eq('id', group.id)
    setSavingPayment(false)
    setEditingPayment(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return
    setDeleting(true)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('pick_groups').delete().eq('id', group.id)
    if (error) { alert(error.message); setDeleting(false); return }
    router.push('/groups')
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="animate-hero animate-hero-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100">{group.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          {/* Donation info + invite code */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
            {(group.zelle_info || group.cashapp_info || isAdmin) && (
              <div className="flex flex-col items-stretch gap-1">
                {!editingPayment && (
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-wide text-slate-400">Donation info</span>
                      {isAdmin && (
                        <button
                          onClick={() => setEditingPayment(true)}
                          className="text-xs font-semibold text-slate-500 transition-colors hover:text-accent"
                        >
                          {group.zelle_info || group.cashapp_info ? 'Edit' : 'Add'}
                        </button>
                      )}
                    </div>
                    {group.zelle_info || group.cashapp_info ? (
                      <div className="flex flex-wrap items-start gap-3">
                        {group.zelle_info && (
                          <div className="flex flex-col items-stretch gap-1">
                            <button
                              onClick={() => copyPayment('zelle', group.zelle_info as string)}
                              className="min-h-[42px] min-w-52 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-left text-lg font-bold text-slate-100 transition-colors hover:bg-accent/20 sm:text-center"
                            >
                              <span className="mr-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Zelle</span>
                              {group.zelle_info}
                            </button>
                            <span className="h-4 text-xs text-slate-500">{copiedPayment === 'zelle' ? 'Copied Zelle' : 'Tap to copy'}</span>
                          </div>
                        )}
                        {group.cashapp_info && (
                          <div className="flex flex-col items-stretch gap-1">
                            <a
                              href={cashAppUrl(group.cashapp_info)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => copyPayment('cashapp', group.cashapp_info as string)}
                              className="min-h-[42px] min-w-52 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-left text-lg font-bold text-slate-100 transition-colors hover:bg-accent/20 sm:text-center"
                            >
                              <span className="mr-2 text-sm font-semibold uppercase tracking-wide text-slate-500">CashApp</span>
                              {group.cashapp_info}
                            </a>
                            <span className="h-4 text-xs text-slate-500">{copiedPayment === 'cashapp' ? 'Copied CashApp' : 'Open Cash App'}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex min-h-[42px] min-w-64 items-center rounded-lg border border-dashed border-slate-700 bg-slate-900/25 px-4 py-2 text-sm text-slate-500">
                        Not added yet
                      </div>
                    )}
                  </div>
                )}

                {isAdmin && editingPayment && (
                  <div className="flex min-w-0 flex-col items-stretch gap-2 sm:w-[22rem]">
                    <span className="text-xs uppercase tracking-wide text-slate-400 sm:text-right">Donation info</span>
                    <div className="grid grid-cols-1 gap-2">
                      <input value={zelleVal} onChange={e => setZelleVal(e.target.value)} placeholder="Zelle"
                        className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent" />
                      <input value={cashappVal} onChange={e => setCashappVal(e.target.value)} placeholder="CashApp e.g. $Tag"
                        className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={savePayment} disabled={savingPayment} className="px-3 py-1 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors">
                        {savingPayment ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => { setEditingPayment(false); setZelleVal(group.zelle_info ?? ''); setCashappVal(group.cashapp_info ?? '') }}
                        className="px-3 py-1 rounded-lg border border-slate-600 text-slate-400 text-xs hover:text-slate-200 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Invite code column */}
            <div className="flex flex-col items-stretch gap-1 sm:items-end">
              <span className="text-xs uppercase tracking-wide text-slate-400">Invite code</span>
              <button onClick={copyCode}
                className="min-h-[42px] min-w-52 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-center font-mono text-lg font-bold tracking-widest text-accent transition-colors hover:bg-accent/20">
                {group.invite_code}
              </button>
              <span className="text-xs text-slate-500">
                {copied ? '✓ Link copied!' : 'Tap to share'}
              </span>
            </div>
          </div>

          {isAdmin && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors">
              {deleting ? 'Deleting…' : 'Delete group'}
            </button>
          )}
        </div>
      </div>

      {/* ── No events yet ─────────────────────────────────── */}
      {seasons.length === 0 && (
        <div className="animate-hero animate-hero-2 rounded-xl border border-dashed border-slate-600 bg-slate-800/40 p-8 flex flex-col items-center text-center gap-4">
          <div className="text-4xl">🏆</div>
          <div>
            <div className="font-bold text-slate-200 text-lg">No events joined yet</div>
            <div className="text-sm text-slate-400 mt-1">Add a tournament so your squad can start predicting.</div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowJoin(true)}
              className="px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
            >
              + Join an event
            </button>
          )}
        </div>
      )}

      {/* ── Event tabs ────────────────────────────────────── */}
      {seasons.length > 0 && (
        <div className="animate-hero animate-hero-2 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {seasons.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSeasonId(s.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  s.id === activeSeasonId
                    ? 'bg-brand text-white border-brand'
                    : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200'
                }`}
              >
                {(s.competitions as any)?.name ?? s.name}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setShowJoin(v => !v)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-slate-600 text-slate-400 hover:border-accent hover:text-accent transition-colors"
              >
                + Add event
              </button>
            )}
          </div>

          {/* Per-tab enrollment status + CTA */}
          {activeSeason && (() => {
            const me        = myEnrollment(activeSeason.id)
            const eventName = (activeSeason.competitions as any)?.name ?? activeSeason.name
            const justRequested = requestedId === activeSeason.id

            if (me?.status === 'approved') return (
              <div className="flex items-center gap-3">
                <Link href={predictionHref(activeSeason, group.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-colors">
                  Make your predictions →
                </Link>
                <span className="text-xs text-slate-500">{eventName}</span>
              </div>
            )

            if (me?.status === 'pending') return (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <button disabled className="px-4 py-2 rounded-lg bg-slate-700 text-slate-400 text-sm font-semibold cursor-not-allowed flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Requested
                  </button>
                  <span className="text-xs text-slate-500">
                    {justRequested ? 'Request sent! The owner will review it.' : 'Awaiting admin approval'}
                  </span>
                </div>
              </div>
            )

            if (me?.status === 'denied') return (
              <p className="text-sm text-red-400 px-4 py-2.5 rounded-lg border border-red-800/40 bg-red-950/20 w-fit">
                Request for {eventName} was denied. Contact the group owner.
              </p>
            )

            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => requestEnrollment(activeSeason.id)}
                    disabled={requesting}
                    className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
                  >
                    {requesting ? 'Requesting…' : `Request to join ${eventName}`}
                  </button>
                  <span className="text-xs text-slate-500">Admin must approve</span>
                </div>
                {enrollErr && <p className="text-xs text-red-400">{enrollErr}</p>}
              </div>
            )
          })()}

          {/* Admin: pending requests for active event */}
          {isAdmin && activeSeason && pendingForSeason(activeSeason.id).length > 0 && (
            <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                {pendingForSeason(activeSeason.id).length} pending request{pendingForSeason(activeSeason.id).length > 1 ? 's' : ''} — {(activeSeason.competitions as any)?.name ?? activeSeason.name}
              </p>
              {pendingForSeason(activeSeason.id).map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm text-slate-200">
                      {e.profiles?.first_name && e.profiles?.last_name
                        ? `${e.profiles.first_name} ${e.profiles.last_name}`
                        : (e.profiles?.display_name ?? e.profiles?.username)}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">@{e.profiles?.username}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => reviewEnrollment(e.id, 'approved')} disabled={reviewing === e.id} className="px-3 py-1 rounded-lg bg-green-700/30 text-green-400 border border-green-700/40 text-xs font-semibold hover:bg-green-700/50 disabled:opacity-50 transition-colors">Approve</button>
                    <button onClick={() => reviewEnrollment(e.id, 'denied')}   disabled={reviewing === e.id} className="px-3 py-1 rounded-lg bg-red-900/20 text-red-400 border border-red-800/40 text-xs font-semibold hover:bg-red-900/40 disabled:opacity-50 transition-colors">Deny</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Join event panel ──────────────────────────────── */}
      {showJoin && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">Add a tournament</span>
            <button onClick={() => setShowJoin(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
          </div>
          {joinErr && <p className="text-xs text-red-400">{joinErr}</p>}
          {availableSeasons.length === 0 ? (
            <p className="text-sm text-slate-500">No other active tournaments available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {availableSeasons.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{s.name}</div>
                    <div className="text-xs text-slate-400">{(s.competitions as any)?.name}</div>
                  </div>
                  <button
                    onClick={() => handleJoinEvent(s.id)}
                    disabled={joiningId === s.id}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
                  >
                    {joiningId === s.id ? 'Adding…' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Two-column: standings + members ───────────────── */}
      {seasons.length > 0 && (
        <div className="animate-hero animate-hero-3 grid lg:grid-cols-3 gap-6">

          {/* Standings — takes 2/3 */}
          <section className="lg:col-span-2">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-base font-bold text-slate-200">Standings</h2>
              {activeSeason && (
                <span className="text-xs text-slate-500">
                  {(activeSeason.competitions as any)?.name ?? activeSeason.name}
                </span>
              )}
            </div>
            {(
              <div className="rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left w-12">#</th>
                      <th className="px-4 py-3 text-left">Player</th>
                      <th className="px-4 py-3 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lb.map(row => {
                      const isMe = row.user_id === currentUserId
                      return (
                        <tr key={row.user_id} className={`border-t border-slate-700 ${isMe ? 'bg-brand/5' : 'bg-slate-800/40'}`}>
                          <td className="px-4 py-3 text-slate-400 font-mono text-sm">
                            {row.groupRank <= 3 ? ['🥇','🥈','🥉'][row.groupRank - 1] : `#${row.groupRank}`}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-200 flex items-center gap-2">
                              {row.display_name ?? row.username}
                              {isMe && <span className="text-xs px-1.5 py-0.5 rounded bg-brand/20 text-brand">You</span>}
                            </div>
                            <div className="text-xs text-slate-500">@{row.username}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-base">
                            {row.total_points !== null
                              ? <span className="text-accent">{row.total_points}</span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Members — takes 1/3 */}
          <section>
            <h2 className="text-base font-bold text-slate-200 mb-3">Members</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden">
              {members.map((m, i) => {
                const isMe = m.user_id === currentUserId
                const isOwner = m.role === 'admin'
                return (
                  <div
                    key={m.user_id}
                    className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-slate-700' : ''} ${isMe ? 'bg-brand/5' : ''}`}
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        {m.profiles?.display_name ?? m.profiles?.username}
                        {isMe && <span className="text-xs text-brand">You</span>}
                      </div>
                      <div className="text-xs text-slate-500">@{m.profiles?.username}</div>
                    </div>
                    {isOwner && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-500/30 text-yellow-400 bg-yellow-400/5">
                        owner
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {members.length === 1 && (
              <p className="text-xs text-slate-500 mt-3 text-center">
                Share the invite code above to bring your squad in.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Round   { slug: string; type: string; prediction_window: string }
interface Season  { id: string; name: string; status: string; competitions: { name: string } | null; rounds?: Round[] }
interface Member  { user_id: string; role: string; profiles: { username: string; display_name: string | null } | null }
interface LbRow   { user_id: string; username: string; display_name: string | null; total_points: number; groupRank: number }

interface Props {
  group:              { id: string; name: string; invite_code: string }
  members:            Member[]
  seasons:            Season[]
  availableSeasons:   Season[]
  seasonLeaderboards: Record<string, LbRow[]>
  currentUserId:      string | null
  isAdmin:            boolean
}

function predictionHref(season: Season, groupId: string) {
  const rounds = season.rounds ?? []
  const groupOpen    = rounds.some(r => r.slug === 'group_stage' && r.prediction_window === 'open')
  const finalOnly    = rounds.length > 0 && rounds.every(r => r.slug === 'final')
  const finalOpen    = rounds.some(r => r.slug === 'final' && r.prediction_window === 'open')
  const knockoutOpen = rounds.some(r => r.type === 'knockout' && r.slug !== 'final' && r.prediction_window === 'open')
  const path = (finalOnly || (!groupOpen && finalOpen)) ? 'final' : (!groupOpen && knockoutOpen) ? 'knockout' : 'group-stage'
  return `/predict/${season.id}/${path}?from=${groupId}`
}

export function GroupPageClient({
  group, members, seasons, availableSeasons, seasonLeaderboards, currentUserId, isAdmin,
}: Props) {
  const router = useRouter()
  const activeSeasonId = seasons[0]?.id ?? ''
  const [showJoin, setShowJoin]             = useState(false)
  const [joiningId, setJoiningId]           = useState<string | null>(null)
  const [joinErr, setJoinErr]               = useState('')
  const [copied, setCopied]                 = useState(false)

  const lb = activeSeasonId ? (seasonLeaderboards[activeSeasonId] ?? []) : []

  const handleJoinEvent = async (seasonId: string) => {
    setJoiningId(seasonId); setJoinErr('')
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('pick_group_seasons')
      .insert({ pick_group_id: group.id, season_id: seasonId })
    if (error) { setJoinErr(error.message); setJoiningId(null); return }
    setJoiningId(null); setShowJoin(false)
    router.refresh()
  }

  const copyCode = () => {
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Invite code</span>
          </div>
          <button
            onClick={copyCode}
            className="font-mono font-bold text-accent bg-accent/10 hover:bg-accent/20 px-4 py-2 rounded-lg border border-accent/20 tracking-widest text-lg transition-colors"
          >
            {group.invite_code}
          </button>
          <span className="text-xs text-slate-500">{copied ? '✓ Copied!' : 'Tap to copy'}</span>
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

      {/* ── Event tabs + picks CTA ────────────────────────── */}
      {seasons.length > 0 && (
        <div className="animate-hero animate-hero-2 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {seasons.map(s => (
              <Link
                key={s.id}
                href={predictionHref(s, group.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-brand/40 text-slate-200 bg-brand/10 hover:bg-brand hover:text-white hover:border-brand transition-colors"
              >
                {(s.competitions as any)?.name ?? s.name}
              </Link>
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
            <h2 className="text-base font-bold text-slate-200 mb-3">Standings</h2>
            {lb.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-8 text-center text-slate-400 text-sm">
                No points yet — check back after the first matches.
              </div>
            ) : (
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
                          <td className="px-4 py-3 text-right font-black text-accent text-base">{row.total_points}</td>
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

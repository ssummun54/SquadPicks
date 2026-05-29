'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Season    { id: string; name: string; status: string; competitions: { name: string } | null }
interface Member    { user_id: string; role: string; profiles: { username: string; display_name: string | null } | null }
interface LbRow     { user_id: string; username: string; display_name: string | null; total_points: number; groupRank: number }

interface Props {
  group:              { id: string; name: string; invite_code: string }
  members:            Member[]
  seasons:            Season[]
  availableSeasons:   Season[]
  seasonLeaderboards: Record<string, LbRow[]>
  currentUserId:      string | null
  isAdmin:            boolean
}

export function GroupPageClient({
  group, members, seasons, availableSeasons, seasonLeaderboards, currentUserId, isAdmin,
}: Props) {
  const router = useRouter()
  const [activeSeasonId, setActiveSeasonId] = useState<string>(seasons[0]?.id ?? '')
  const [showJoin, setShowJoin]             = useState(false)
  const [joiningId, setJoiningId]           = useState<string | null>(null)
  const [joinErr, setJoinErr]               = useState('')

  const lb = activeSeasonId ? (seasonLeaderboards[activeSeasonId] ?? []) : []

  const handleJoinEvent = async (seasonId: string) => {
    setJoiningId(seasonId); setJoinErr('')
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('pick_group_seasons')
      .insert({ pick_group_id: group.id, season_id: seasonId })
    if (error) { setJoinErr(error.message); setJoiningId(null); return }
    setJoiningId(null)
    setShowJoin(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-100">{group.name}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-slate-400">Invite code:</span>
          <span className="font-mono font-bold text-accent bg-accent/10 px-3 py-1 rounded-lg border border-accent/20 text-base tracking-widest">
            {group.invite_code}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Share this code with friends to invite them.</p>
      </div>

      {/* Season tabs */}
      {seasons.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {seasons.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSeasonId(s.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSeasonId === s.id
                  ? 'bg-brand text-white'
                  : 'border border-slate-700 text-slate-300 hover:border-accent'
              }`}
            >
              {(s.competitions as any)?.name
                ? `${(s.competitions as any).name} — ${s.name}`
                : s.name}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setShowJoin(v => !v)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-slate-600 text-slate-400 hover:border-accent hover:text-accent transition-colors"
            >
              + Join new event
            </button>
          )}
        </div>
      )}

      {/* Join new event panel */}
      {showJoin && availableSeasons.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-200">Add a tournament to this group</div>
          {joinErr && <p className="text-xs text-red-400">{joinErr}</p>}
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
        </div>
      )}

      {showJoin && availableSeasons.length === 0 && (
        <p className="text-sm text-slate-500">No other active tournaments available right now.</p>
      )}

      {/* Leaderboard for active season */}
      <section>
        <h2 className="text-lg font-bold text-slate-200 mb-4">
          Standings
          {activeSeasonId && seasons.find(s => s.id === activeSeasonId) && (
            <span className="text-sm font-normal text-slate-400 ml-2">
              — {seasons.find(s => s.id === activeSeasonId)!.name}
            </span>
          )}
        </h2>
        {lb.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400 text-sm">
            No points yet — leaderboard updates after each completed match.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left w-12">Rank</th>
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {lb.map((row) => {
                  const isMe = row.user_id === currentUserId
                  return (
                    <tr key={row.user_id} className={`border-t border-slate-700 ${isMe ? 'bg-brand/5' : 'bg-slate-800'}`}>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {row.groupRank <= 3 ? ['🥇','🥈','🥉'][row.groupRank - 1] : `#${row.groupRank}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200 flex items-center gap-2">
                          {row.display_name ?? row.username}
                          {isMe && <span className="text-xs px-1.5 py-0.5 rounded bg-brand/20 text-brand">You</span>}
                        </div>
                        <div className="text-xs text-slate-500">@{row.username}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-accent">{row.total_points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Members */}
      <section>
        <h2 className="text-lg font-bold text-slate-200 mb-3">Members ({members.length})</h2>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm">
              <span className="text-slate-300">{m.profiles?.display_name ?? m.profiles?.username}</span>
              {m.role === 'admin' && <span className="text-xs text-yellow-400">admin</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

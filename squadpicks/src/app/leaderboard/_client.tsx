'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Season        { id: string; name: string; year: number | null; status: string; competitions: { name: string } | null }
interface LbRow         { user_id: string; username: string; display_name: string | null; total_points: number; rank: number }
interface GroupSeason   { id: string; name: string; competitionName: string; rows: LbRow[] }
interface Group         { id: string; name: string; seasons: GroupSeason[] }

interface Props {
  seasons:      Season[]
  activeSeason: string | null
  globalRows:   LbRow[]
  groupsData:   Group[]
  myId:         string | null
}

const DEFAULT_SHOW = 10

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>
  if (rank === 2) return <span className="text-base">🥈</span>
  if (rank === 3) return <span className="text-base">🥉</span>
  return <span className="font-mono text-slate-400 text-sm">#{rank}</span>
}

function LeaderboardTable({ rows, myId }: { rows: LbRow[]; myId: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const myRow     = myId ? rows.find(r => r.user_id === myId) : null
  const visible   = expanded ? rows : rows.slice(0, DEFAULT_SHOW)
  const myOutside = !expanded && myRow && myRow.rank > DEFAULT_SHOW

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 py-4 text-center">No predictions yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left w-10">#</th>
              <th className="px-4 py-2.5 text-left">Player</th>
              <th className="px-4 py-2.5 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => {
              const isMe = row.user_id === myId
              return (
                <tr key={row.user_id} className={`border-t border-slate-700 ${isMe ? 'bg-brand/5' : i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                  <td className="px-4 py-2.5"><RankCell rank={row.rank} /></td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-200 flex items-center gap-1.5">
                      {row.display_name ?? row.username}
                      {isMe && <span className="text-xs px-1.5 py-0.5 rounded bg-brand/20 text-brand font-medium">You</span>}
                    </div>
                    <div className="text-slate-500 text-xs">@{row.username}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-accent">{row.total_points ?? 0}</td>
                </tr>
              )
            })}
            {myOutside && myRow && (
              <>
                <tr className="border-t border-slate-700">
                  <td colSpan={3} className="px-4 py-1 text-center text-slate-600 text-xs">• • •</td>
                </tr>
                <tr className="border-t border-slate-700 bg-brand/5">
                  <td className="px-4 py-2.5"><RankCell rank={myRow.rank} /></td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-200 flex items-center gap-1.5">
                      {myRow.display_name ?? myRow.username}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-brand/20 text-brand font-medium">You</span>
                    </div>
                    <div className="text-slate-500 text-xs">@{myRow.username}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-accent">{myRow.total_points ?? 0}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > DEFAULT_SHOW && (
        <button onClick={() => setExpanded(v => !v)} className="text-sm text-accent hover:text-accent/80 text-center py-1 transition-colors">
          {expanded ? 'Show less' : `Show all ${rows.length} players`}
        </button>
      )}
    </div>
  )
}

function GroupCard({ group, myId }: { group: Group; myId: string | null }) {
  const [activeSeasonId, setActiveSeasonId] = useState(group.seasons[0]?.id ?? '')
  const activeSeason = group.seasons.find(s => s.id === activeSeasonId) ?? group.seasons[0]

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      {/* Group header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-200">{group.name}</h2>
        <Link href={`/groups/${group.id}`} className="text-xs text-accent hover:text-accent/80 transition-colors">
          View group →
        </Link>
      </div>

      {/* Event switcher — only shown if group is in multiple events */}
      {group.seasons.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {group.seasons.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSeasonId(s.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                activeSeasonId === s.id
                  ? 'bg-brand text-white border-brand'
                  : 'border-slate-600 text-slate-400 hover:border-accent hover:text-accent'
              }`}
            >
              {s.competitionName}
            </button>
          ))}
        </div>
      )}

      {/* Single event label if only one */}
      {group.seasons.length === 1 && (
        <p className="text-xs text-slate-500">{group.seasons[0].competitionName}</p>
      )}

      <LeaderboardTable rows={activeSeason?.rows ?? []} myId={myId} />
    </div>
  )
}

export function LeaderboardClient({ seasons, activeSeason, globalRows, groupsData, myId }: Props) {
  const [tab, setTab] = useState<'groups' | 'global'>(groupsData.length > 0 ? 'groups' : 'global')
  const activeSeasonMeta = seasons.find(s => s.id === activeSeason)

  return (
    <div className="flex flex-col gap-6">

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl w-fit border border-slate-700">
        {myId && (
          <button
            onClick={() => setTab('groups')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'groups' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            My Groups
          </button>
        )}
        <button
          onClick={() => setTab('global')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'global' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Global
        </button>
      </div>

      {/* My Groups */}
      {tab === 'groups' && myId && (
        groupsData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 p-10 flex flex-col items-center text-center gap-4">
            <p className="text-slate-400 text-sm">You haven&apos;t joined any groups yet.</p>
            <Link href="/groups" className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors">
              Go to my groups
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groupsData.map(group => (
              <GroupCard key={group.id} group={group} myId={myId} />
            ))}
          </div>
        )
      )}

      {/* Global */}
      {tab === 'global' && (
        <div className="flex flex-col gap-4">
          {/* Season pills */}
          {seasons.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {seasons.map(s => (
                <a
                  key={s.id}
                  href={`/leaderboard?season=${s.id}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    activeSeason === s.id
                      ? 'bg-brand text-white border-brand'
                      : 'border-slate-700 text-slate-300 hover:border-accent hover:text-accent'
                  }`}
                >
                  {(s.competitions as any)?.name ?? s.name}
                </a>
              ))}
            </div>
          )}
          <div className="max-w-2xl">
            {activeSeasonMeta && (
              <h2 className="text-base font-bold text-slate-200 mb-3">
                {(activeSeasonMeta.competitions as any)?.name ?? activeSeasonMeta.name}
              </h2>
            )}
            <LeaderboardTable rows={globalRows} myId={myId} />
          </div>
        </div>
      )}

      {!myId && (
        <p className="text-sm text-slate-500 text-center">
          <Link href="/login" className="text-accent hover:text-accent/80">Sign in</Link> to see your groups&apos; leaderboards.
        </p>
      )}
    </div>
  )
}

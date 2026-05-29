'use client'

import { useState } from 'react'

interface Row {
  user_id: string; username: string; display_name: string | null
  total_points: number; rank: number
}

const DEFAULT_SHOW = 10

export function LeaderboardClient({ rows, myId }: { rows: Row[]; myId: string | null }) {
  const [expanded, setExpanded] = useState(false)

  // Always show user's own row even if outside top 10
  const myRow   = myId ? rows.find(r => r.user_id === myId) : null
  const visible = expanded ? rows : rows.slice(0, DEFAULT_SHOW)
  const myOutsideTop = !expanded && myRow && myRow.rank > DEFAULT_SHOW

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-10 text-center text-slate-400">
        No predictions yet — be the first to predict!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
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
            {visible.map((row, i) => {
              const isMe = row.user_id === myId
              return (
                <tr
                  key={row.user_id}
                  className={`border-t border-slate-700 ${
                    isMe ? 'bg-brand/5' : i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {row.rank <= 3 ? ['🥇','🥈','🥉'][row.rank - 1] : `#${row.rank}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200 flex items-center gap-2">
                      {row.display_name ?? row.username}
                      {isMe && <span className="text-xs px-1.5 py-0.5 rounded bg-brand/20 text-brand font-medium">You</span>}
                    </div>
                    <div className="text-slate-500 text-xs">@{row.username}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-accent">
                    {row.total_points ?? 0}
                  </td>
                </tr>
              )
            })}

            {/* Always show user's row if outside visible range */}
            {myOutsideTop && myRow && (
              <>
                <tr className="border-t border-slate-700">
                  <td colSpan={3} className="px-4 py-1 text-center text-slate-600 text-xs">• • •</td>
                </tr>
                <tr className="border-t border-slate-700 bg-brand/5">
                  <td className="px-4 py-3 font-mono text-slate-400">#{myRow.rank}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200 flex items-center gap-2">
                      {myRow.display_name ?? myRow.username}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-brand/20 text-brand font-medium">You</span>
                    </div>
                    <div className="text-slate-500 text-xs">@{myRow.username}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-accent">{myRow.total_points ?? 0}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > DEFAULT_SHOW && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-sm text-accent hover:text-accent/80 text-center py-2 transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${rows.length} players`}
        </button>
      )}
    </div>
  )
}

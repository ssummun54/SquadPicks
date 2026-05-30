'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Sport  { id: string; name: string; slug: string }
interface Season {
  id: string; name: string; year: number | null; status: string
  competitions: {
    id: string; name: string; short_name: string | null; slug: string; logo_url: string | null
    host_country: string | null; sport_id: string
    sports: { name: string; slug: string } | null
  } | null
  rounds?: { slug: string; type: string; prediction_window: string }[]
}

interface Props {
  sports:  Sport[]
  seasons: Season[]
}

const STATUS_LABEL: Record<string, string> = {
  active:    'Live',
  upcoming:  'Upcoming',
  completed: 'Finished',
}
const STATUS_COLOR: Record<string, string> = {
  active:    'bg-brand/20 text-brand',
  upcoming:  'bg-yellow-400/20 text-yellow-300',
  completed: 'bg-slate-700 text-slate-400',
}


export function SeasonsClient({ sports, seasons }: Props) {
  const [sportFilter, setSportFilter]   = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch]             = useState('')

  const filtered = useMemo(() => {
    return seasons.filter(s => {
      const comp = s.competitions
      if (sportFilter !== 'all' && comp?.sports?.slug !== sportFilter) return false
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !s.name.toLowerCase().includes(q) &&
          !comp?.name.toLowerCase().includes(q) &&
          !comp?.host_country?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [seasons, sportFilter, statusFilter, search])

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search by name or country…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-accent transition-colors"
        />

        <div className="flex gap-2 flex-wrap">
          {/* Sport filter */}
          <select
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-accent transition-colors"
          >
            <option value="all">All sports</option>
            {sports.map(sp => (
              <option key={sp.id} value={sp.slug}>{sp.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:border-accent transition-colors"
          >
            <option value="all">All statuses</option>
            <option value="active">Live</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Finished</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-10 text-center text-slate-400 text-sm">
          No events match your filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(season => {
            const comp = season.competitions
            return (
              <div
                key={season.id}
                className="rounded-xl border border-slate-700 bg-slate-800 p-5 flex flex-col gap-3 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">{comp?.sports?.name ?? 'Sport'}</div>
                    <div className="font-bold text-slate-100 mt-0.5">{comp?.name ?? 'Tournament'}</div>
                    <div className="text-sm text-slate-300">{season.name}</div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[season.status] ?? STATUS_COLOR.completed}`}>
                    {STATUS_LABEL[season.status] ?? season.status}
                  </span>
                </div>

                {comp?.host_country && (
                  <div className="text-xs text-slate-400">
                    {comp.host_country}
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-1">
                  <Link
                    href={`/seasons/${season.id}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors"
                  >
                    View event
                  </Link>
                  <Link
                    href={`/leaderboard?season=${season.id}`}
                    className="flex-1 text-center px-3 py-2 rounded-lg border border-slate-600 text-slate-300 text-xs font-medium hover:border-accent hover:text-accent transition-colors"
                  >
                    Leaderboard
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

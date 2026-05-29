'use client'

import { useState, useTransition } from 'react'
import { overrideMatchScore, scoreGroupStandings, triggerSync } from './_actions'

export interface MatchRow {
  id: string
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
  home_team: { id: string; name: string; short_name: string | null } | null
  away_team: { id: string; name: string; short_name: string | null } | null
  external_id: string | null
}

export interface GroupRow {
  id: string
  name: string
  teams: { team_id: string; team_name: string; final_position: number | null }[]
}

export function SeedFixturesButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string>('')

  function handleSeed() {
    if (!confirm('This will upsert all WC2026 fixtures from api-football.com. Continue?')) return
    setResult('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/seed-fixtures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const data = await res.json()
        if (!res.ok) { setResult(data.error ?? 'Failed'); return }
        setResult(
          `✓ ${data.inserted} inserted, ${data.updated} updated` +
          (data.unmatched?.length ? ` · ${data.unmatched.length} unmatched (check console)` : '')
        )
        if (data.unmatched?.length) console.warn('Unmatched fixtures:', data.unmatched)
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSeed}
        disabled={isPending}
        className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
      >
        {isPending ? 'Seeding…' : 'Seed fixtures from API'}
      </button>
      {result && <span className="text-sm text-slate-400">{result}</span>}
    </div>
  )
}

export function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string>('')

  function handleSync() {
    setResult('')
    startTransition(async () => {
      try {
        const { synced, results } = await triggerSync()
        setResult(synced > 0 ? `✓ Synced ${synced} match(es)` : 'No new results')
        console.log(results)
      } catch (err) {
        setResult(err instanceof Error ? err.message : 'Sync failed')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-40 transition-colors"
      >
        {isPending ? 'Syncing…' : 'Sync scores now'}
      </button>
      {result && <span className="text-sm text-slate-400">{result}</span>}
    </div>
  )
}

export function MatchOverrideForm({ match }: { match: MatchRow }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '')
  const [away, setAway] = useState(match.away_score?.toString() ?? '')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setDone(false)
    startTransition(async () => {
      try {
        await overrideMatchScore(match.id, parseInt(home), parseInt(away))
        setDone(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number" min="0" max="99"
        value={home}
        onChange={e => { setHome(e.target.value); setDone(false) }}
        disabled={isPending}
        className="w-14 text-center px-2 py-1.5 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
      />
      <span className="text-slate-500 text-sm">–</span>
      <input
        type="number" min="0" max="99"
        value={away}
        onChange={e => { setAway(e.target.value); setDone(false) }}
        disabled={isPending}
        className="w-14 text-center px-2 py-1.5 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isPending || home === '' || away === ''}
        className="px-3 py-1.5 rounded bg-brand text-white text-xs font-medium hover:bg-brand-dark disabled:opacity-40 transition-colors"
      >
        {isPending ? '…' : done ? '✓' : match.status === 'completed' ? 'Override' : 'Save'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  )
}

export function GroupStandingsForm({ group }: { group: GroupRow }) {
  const [pos, setPos] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.teams.map(t => [t.team_id, t.final_position?.toString() ?? '']))
  )
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const positions = Object.entries(pos).map(([teamId, p]) => ({ teamId, position: parseInt(p) }))
    if (positions.some(({ position }) => isNaN(position) || position < 1 || position > 4)) {
      setError('All positions must be 1–4'); return
    }
    const unique = new Set(positions.map(p => p.position))
    if (unique.size !== positions.length) {
      setError('Each position must be unique'); return
    }
    setError(''); setDone(false)
    startTransition(async () => {
      try {
        await scoreGroupStandings(group.id, positions)
        setDone(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {group.teams.sort((a, b) => (a.final_position ?? 99) - (b.final_position ?? 99)).map(team => (
        <div key={team.team_id} className="flex items-center gap-3">
          <span className="text-sm text-slate-300 flex-1 truncate">{team.team_name}</span>
          <select
            value={pos[team.team_id] ?? ''}
            onChange={e => { setPos(prev => ({ ...prev, [team.team_id]: e.target.value })); setDone(false) }}
            disabled={isPending}
            className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent"
          >
            <option value="">—</option>
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      ))}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 px-3 py-1.5 rounded bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-40 transition-colors"
      >
        {isPending ? 'Saving…' : done ? '✓ Saved' : 'Save standings'}
      </button>
    </form>
  )
}

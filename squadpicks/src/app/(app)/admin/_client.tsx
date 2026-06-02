'use client'

import { useState, useTransition } from 'react'
import { overrideMatchScore, scoreGroupStandings, triggerSync, markSeasonCompleted } from './_actions'

export interface MatchRow {
  id: string
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
  result_method: '90' | 'ET' | 'PK' | null
  penalty_winner_id: string | null
  round_type: string
  home_team: { id: string; name: string; short_name: string | null } | null
  away_team: { id: string; name: string; short_name: string | null } | null
  external_id: string | null
}

export interface GroupRow {
  id: string
  name: string
  teams: { team_id: string; team_name: string; final_position: number | null }[]
}

export function SeedTeamsButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string>('')

  function handleSeed() {
    if (!confirm('Pull all WC2026 teams + group assignments from api-football.com. Continue?')) return
    setResult('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/seed-teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const data = await res.json()
        if (!res.ok) { setResult(data.error ?? 'Failed'); return }
        if (data.message) { setResult(data.message); return }
        setResult(
          `✓ ${data.teamsUpserted} teams, ${data.groupLinksUpserted} group links` +
          (data.unmatched?.length ? ` · ${data.unmatched.length} unmatched (check console)` : '')
        )
        if (data.unmatched?.length) console.warn('Unmatched:', data.unmatched)
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
        {isPending ? 'Seeding…' : 'Seed teams from API'}
      </button>
      {result && <span className="text-sm text-slate-400">{result}</span>}
    </div>
  )
}

export function SeedCLFinalButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string>('')

  function handleSeed() {
    setResult('')
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/seed-cl-final', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const data = await res.json()
        if (!res.ok) { setResult(data.error ?? 'Failed'); return }
        setResult(data.results?.join(' · ') ?? 'Done')
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
        {isPending ? 'Seeding…' : 'Seed CL Final from API'}
      </button>
      {result && <span className="text-sm text-slate-400">{result}</span>}
    </div>
  )
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
  const [method, setMethod] = useState<'90' | 'ET' | 'PK'>(match.result_method ?? '90')
  const [penaltyWinner, setPenaltyWinner] = useState(match.penalty_winner_id ?? match.home_team?.id ?? '')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const isKnockout = match.round_type === 'knockout'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setDone(false)
    if (isKnockout && method === 'PK' && !penaltyWinner) {
      setError('Pick penalty winner')
      return
    }
    startTransition(async () => {
      try {
        await overrideMatchScore(
          match.id,
          parseInt(home),
          parseInt(away),
          isKnockout ? method : null,
          isKnockout && method === 'PK' ? penaltyWinner : null
        )
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
      {isKnockout && (
        <>
          <select
            value={method}
            onChange={e => { setMethod(e.target.value as '90' | 'ET' | 'PK'); setDone(false) }}
            disabled={isPending}
            className="px-2 py-1.5 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="90">90</option>
            <option value="ET">ET</option>
            <option value="PK">PKs</option>
          </select>
          {method === 'PK' && (
            <select
              value={penaltyWinner}
              onChange={e => { setPenaltyWinner(e.target.value); setDone(false) }}
              disabled={isPending}
              className="px-2 py-1.5 rounded bg-slate-900 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
            >
              {match.home_team && <option value={match.home_team.id}>{match.home_team.short_name ?? match.home_team.name}</option>}
              {match.away_team && <option value={match.away_team.id}>{match.away_team.short_name ?? match.away_team.name}</option>}
            </select>
          )}
        </>
      )}
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

export function MarkSeasonCompletedButton({ seasonId, seasonName }: { seasonId: string; seasonName: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handle() {
    if (!confirm(`Mark "${seasonName}" as completed? This cannot be undone from the UI.`)) return
    startTransition(async () => {
      await markSeasonCompleted(seasonId)
      setDone(true)
    })
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isPending || done}
      className="px-3 py-1.5 rounded-lg border border-red-700 text-red-400 text-sm font-medium hover:bg-red-950/40 disabled:opacity-40 transition-colors"
    >
      {isPending ? 'Saving…' : done ? '✓ Marked completed' : 'Mark season as completed'}
    </button>
  )
}

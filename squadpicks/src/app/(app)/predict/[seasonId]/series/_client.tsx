'use client'

import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Team  { id: string; name: string; short_name: string }
interface Match { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; match_day: number; venue: string; home_team: Team | null; away_team: Team | null }
interface GamePred  { match_id: string; home_score: number; away_score: number }
interface SeriesPred { predicted_winner_id: string; predicted_games: number }

interface Props {
  seasonId:    string
  pickGroupId: string
  matches:     Match[]
  gamePreds:   GamePred[]
  seriesPred:  SeriesPred | null
  teamA:       Team | null  // first home team (Knicks)
  teamB:       Team | null  // first away team (Spurs)
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function SeriesClient({ seasonId, pickGroupId, matches, gamePreds, seriesPred, teamA, teamB }: Props) {
  const supabase = getSupabaseClient()

  // Series prediction
  const [champion, setChampion] = useState<string>(seriesPred?.predicted_winner_id ?? '')
  const [inGames,  setInGames]  = useState<number | null>(seriesPred?.predicted_games ?? null)
  const [savingSeries, setSavingSeries] = useState(false)
  const [seriesSaved,  setSeriesSaved]  = useState(!!seriesPred)
  const seriesLocked = matches[0]?.status !== 'scheduled'

  // Game winner predictions — home_score=1,away_score=0 means home wins; 0,1 = away wins
  const winnerOf = (pred: GamePred | undefined) => {
    if (!pred) return null
    return pred.home_score > pred.away_score ? 'home' : 'away'
  }

  const [gamePick, setGamePick] = useState<Record<string, 'home' | 'away' | null>>(() => {
    const map: Record<string, 'home' | 'away' | null> = {}
    for (const m of matches) {
      const p = gamePreds.find(p => p.match_id === m.id)
      map[m.id] = winnerOf(p)
    }
    return map
  })
  const [savingGame, setSavingGame] = useState<string | null>(null)
  const [savedGame,  setSavedGame]  = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const m of matches) map[m.id] = !!gamePreds.find(p => p.match_id === m.id)
    return map
  })

  const saveSeries = async () => {
    if (!champion || !inGames) return
    setSavingSeries(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('series_predictions' as any).upsert({
      user_id:             user?.id,
      pick_group_id:       pickGroupId,
      season_id:           seasonId,
      predicted_winner_id: champion,
      predicted_games:     inGames,
      updated_at:          new Date().toISOString(),
    }, { onConflict: 'user_id,pick_group_id,season_id' })
    setSavingSeries(false)
    setSeriesSaved(true)
  }

  const saveGame = async (matchId: string, pick: 'home' | 'away') => {
    setSavingGame(matchId)
    const { data: { user } } = await supabase.auth.getUser()
    await (supabase.from('match_predictions') as any).upsert({
      user_id:       user?.id ?? '',
      match_id:      matchId,
      pick_group_id: pickGroupId,
      home_score:    pick === 'home' ? 1 : 0,
      away_score:    pick === 'away' ? 1 : 0,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id,match_id,pick_group_id' })
    setSavingGame(null)
    setSavedGame(prev => ({ ...prev, [matchId]: true }))
  }

  const pickGame = (matchId: string, side: 'home' | 'away') => {
    setGamePick(prev => ({ ...prev, [matchId]: side }))
    setSavedGame(prev => ({ ...prev, [matchId]: false }))
    saveGame(matchId, side)
  }

  const seriesChampName = champion === teamA?.id ? teamA?.name : champion === teamB?.id ? teamB?.name : ''

  return (
    <div className="flex flex-col gap-6 animate-hero animate-hero-3">

      {/* ── Scoring ──────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Scoring</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-black text-accent">+5 pts</span>
            <span className="text-sm font-semibold text-slate-200">In X games</span>
            <span className="text-xs text-slate-400">Nail the series length</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-black text-accent">3 pts</span>
            <span className="text-sm font-semibold text-slate-200">Series champion</span>
            <span className="text-xs text-slate-400">Pick who lifts the trophy</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-black text-accent">1 pt</span>
            <span className="text-sm font-semibold text-slate-200">Game winner</span>
            <span className="text-xs text-slate-400">Per correct game pick</span>
          </div>
        </div>
      </div>

      {/* ── Series prediction ─────────────────────────── */}
      <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-200">Series prediction</h2>
          {seriesLocked && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Locked
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Who wins the championship?</p>
          <div className="flex gap-3">
            {[teamA, teamB].filter(Boolean).map(t => (
              <button key={t!.id} disabled={seriesLocked}
                onClick={() => { setChampion(t!.id); setSeriesSaved(false) }}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors ${
                  champion === t!.id
                    ? 'border-brand bg-brand/20 text-brand'
                    : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {t!.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400 uppercase tracking-wide">In how many games?</p>
          <div className="flex gap-2">
            {[4, 5, 6, 7].map(n => (
              <button key={n} disabled={seriesLocked}
                onClick={() => { setInGames(n); setSeriesSaved(false) }}
                className={`w-12 h-10 rounded-lg border text-sm font-bold transition-colors ${
                  inGames === n
                    ? 'border-brand bg-brand/20 text-brand'
                    : 'border-slate-600 text-slate-400 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {!seriesLocked && (
          <button onClick={saveSeries} disabled={!champion || !inGames || savingSeries}
            className={`w-fit px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              seriesSaved
                ? 'bg-green-900/30 text-green-400 border border-green-800/40'
                : 'bg-brand text-white hover:bg-brand-dark disabled:opacity-40'
            }`}
          >
            {savingSeries ? 'Saving…' : seriesSaved ? `✓ ${seriesChampName} in ${inGames}` : 'Save series prediction'}
          </button>
        )}
        {seriesLocked && seriesPred && (
          <p className="text-xs text-slate-500">Your pick: <span className="text-slate-300 font-medium">{seriesChampName} in {inGames}</span></p>
        )}
        {seriesLocked && !seriesPred && (
          <p className="text-xs text-slate-500">Series prediction locked — Game 1 has already tipped off.</p>
        )}
      </section>

      {/* ── Game winner predictions ────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-slate-200">Game predictions</h2>

        {matches.map(m => {
          const locked   = m.status !== 'scheduled' || m.match_day > 4
          const done     = m.status === 'completed'
          const pick     = gamePick[m.id]
          const isSaving = savingGame === m.id
          const isSaved  = savedGame[m.id]

          const actualWinner = done && m.home_score !== null
            ? (m.home_score > m.away_score! ? m.home_team : m.away_team)
            : null

          return (
            <div key={m.id} className={`rounded-xl border p-4 flex flex-col gap-3 ${done ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-700 bg-slate-800/60'}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Game {m.match_day}</span>
                  {m.match_day > 4 && <span className="ml-2 text-xs text-slate-600">if necessary</span>}
                  <p className="text-xs text-slate-500 mt-0.5">{fmt(m.kickoff_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {done && actualWinner && (
                    <span className="text-xs font-bold text-green-400 bg-green-950/30 border border-green-800/30 px-2 py-1 rounded-lg">
                      {actualWinner.short_name} wins
                    </span>
                  )}
                  {locked && !done && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Locked
                    </span>
                  )}
                  {!locked && isSaved && (
                    <span className="text-xs text-green-400">✓ Saved</span>
                  )}
                  {isSaving && <span className="text-xs text-slate-500">Saving…</span>}
                </div>
              </div>

              <div className="flex gap-3">
                {[
                  { side: 'home' as const, team: m.home_team },
                  { side: 'away' as const, team: m.away_team },
                ].map(({ side, team }) => (
                  <button
                    key={side}
                    disabled={locked}
                    onClick={() => pickGame(m.id, side)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      pick === side
                        ? 'border-brand bg-brand/20 text-brand'
                        : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {team?.short_name ?? team?.name ?? side}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}

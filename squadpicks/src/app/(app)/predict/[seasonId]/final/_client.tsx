'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { getSupabaseClient } from '@/lib/supabase/client'

type Method = '90' | 'ET' | 'PK'

interface Team  { id: string; name: string; short_name: string | null; logo_url: string | null }
interface Match { id: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; result_method: string | null; home_team: Team | null; away_team: Team | null }
interface Pred  { match_id: string; home_score: number; away_score: number; predicted_method: string | null }

interface Props {
  match:        Match
  pickGroupId:  string
  existingPred: Pred | null
}

export function FinalClient({ match, pickGroupId, existingPred }: Props) {
  const [home,   setHome]   = useState(existingPred ? String(existingPred.home_score) : '')
  const [away,   setAway]   = useState(existingPred ? String(existingPred.away_score) : '')
  const [method, setMethod] = useState<Method | ''>(existingPred?.predicted_method as Method ?? '')
  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')

  const userIdRef = useRef<string | null>(null)
  const locked    = new Date(match.kickoff_at) <= new Date()

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null
    })
    if (existingPred) setStatus('saved')
  }, [existingPred])

  const canSave = home !== '' && away !== '' && method !== '' && !locked

  const handleSave = async () => {
    if (!canSave || !userIdRef.current) return
    setStatus('saving')
    const { error } = await getSupabaseClient().from('match_predictions').upsert(
      {
        user_id:            userIdRef.current,
        match_id:           match.id,
        pick_group_id:      pickGroupId,
        home_score:         Number(home),
        away_score:         Number(away),
        predicted_method:   method,
      },
      { onConflict: 'user_id,match_id,pick_group_id' }
    )
    setStatus(error ? 'error' : 'saved')
  }

  const kickoff = format(new Date(match.kickoff_at), 'EEE d MMM · HH:mm')

  return (
    <div className="animate-hero animate-hero-3 flex flex-col gap-6">

      {/* Match card */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col gap-6">
        <div className="text-sm text-slate-400 text-center">{kickoff}{locked && ' · Locked'}</div>

        {/* Teams + score */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            {match.home_team?.logo_url && (
              <Image src={match.home_team.logo_url} alt="" width={48} height={48} className="object-contain" />
            )}
            <span className="font-bold text-slate-200 text-center">{match.home_team?.name ?? 'TBD'}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              disabled={locked}
              value={home}
              onChange={e => { setHome(e.target.value); setStatus('idle') }}
              className="w-16 h-12 text-center text-xl font-black rounded-lg bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-accent disabled:opacity-40 cursor-pointer"
            >
              <option value="">–</option>
              {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <span className="text-slate-400 font-black text-2xl">:</span>
            <select
              disabled={locked}
              value={away}
              onChange={e => { setAway(e.target.value); setStatus('idle') }}
              className="w-16 h-12 text-center text-xl font-black rounded-lg bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-accent disabled:opacity-40 cursor-pointer"
            >
              <option value="">–</option>
              {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            {match.away_team?.logo_url && (
              <Image src={match.away_team.logo_url} alt="" width={48} height={48} className="object-contain" />
            )}
            <span className="font-bold text-slate-200 text-center">{match.away_team?.name ?? 'TBD'}</span>
          </div>
        </div>

        {/* Method picker */}
        <div className="flex flex-col gap-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide text-center">Decided in</div>
          <div className="flex gap-3 justify-center">
            {(['90', 'ET', 'PK'] as Method[]).map(m => (
              <button
                key={m}
                disabled={locked}
                onClick={() => { setMethod(m); setStatus('idle') }}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 ${
                  method === m
                    ? 'bg-accent text-white'
                    : 'border border-slate-600 text-slate-300 hover:border-accent hover:text-accent'
                }`}
              >
                {m === '90' ? '90 mins' : m === 'ET' ? 'Extra time' : 'Penalties'}
              </button>
            ))}
          </div>
        </div>

        {/* Actual result if completed */}
        {match.status === 'completed' && match.home_score !== null && (
          <div className="text-center text-sm text-accent">
            Result: {match.home_score}–{match.away_score}
            {match.result_method && match.result_method !== '90' && ` (${match.result_method === 'ET' ? 'AET' : 'PKs'})`}
          </div>
        )}
      </div>

      {/* Save */}
      {!locked && (
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {status === 'saving' && <span className="text-slate-400">Saving…</span>}
            {status === 'saved'  && <span className="text-accent">✓ Prediction saved</span>}
            {status === 'error'  && <span className="text-red-400">Save failed — try again</span>}
            {status === 'idle' && !canSave && (
              <span className="text-slate-500 text-xs">Select score + method to save</span>
            )}
          </span>
          <button
            onClick={handleSave}
            disabled={!canSave || status === 'saving'}
            className="px-6 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark disabled:opacity-40 transition-colors"
          >
            {status === 'saved' ? 'Update prediction' : 'Save prediction'}
          </button>
        </div>
      )}
    </div>
  )
}

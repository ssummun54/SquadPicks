// Smart score sync — called by Vercel Cron (every 2h) or manually from admin.
//
// Strategy:
//   1. Query our DB for matches where kickoff_at + 2h ≤ now AND status != completed
//   2. If nothing is due → return immediately (zero API calls on non-match days)
//   3. Fetch each due match individually from football-data.org
//   4. Update scores, run scoring functions, revalidate leaderboard

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseService } from '@/lib/supabase/service'
import { getMatchById, getPenaltyWinnerId, FINISHED_STATUSES, LIVE_STATUSES } from '@/lib/football-api'

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000

export async function GET(req: NextRequest) { return handler(req) }
export async function POST(req: NextRequest) { return handler(req) }

async function handler(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const body = await req.json().catch(() => ({}))
  const secret = authHeader?.replace('Bearer ', '') ?? body.secret

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = getSupabaseService()

  const dueCutoff = new Date(Date.now() - MATCH_DURATION_MS).toISOString()

  const { data: dueMatches, error: dueErr } = await service
    .from('matches')
    .select('id, external_id, home_team_id, away_team_id, rounds!inner(type)')
    .lte('kickoff_at', dueCutoff)
    .neq('status', 'completed')
    .not('external_id', 'is', null)

  if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 500 })

  if (!dueMatches || dueMatches.length === 0) {
    return NextResponse.json({ message: 'No matches due', synced: 0 })
  }

  const results: string[] = []

  for (const dbMatch of dueMatches) {
    let match
    try {
      match = await getMatchById(dbMatch.external_id!)
    } catch (err) {
      results.push(`FAIL ${dbMatch.external_id}: ${(err as Error).message}`)
      continue
    }

    const status = match.status

    if (LIVE_STATUSES.has(status)) {
      await service.from('matches').update({ status: 'live' }).eq('id', dbMatch.id)
      results.push(`LIVE ${dbMatch.external_id}`)
      continue
    }

    if (!FINISHED_STATUSES.has(status)) continue

    const homeScore = match.score.fullTime.home
    const awayScore = match.score.fullTime.away
    if (homeScore === null || awayScore === null) continue

    const roundType = (dbMatch as { rounds?: { type?: string } | { type?: string }[] }).rounds
    const isKnockout = Array.isArray(roundType) ? roundType[0]?.type === 'knockout' : roundType?.type === 'knockout'
    const isPenalties = match.score.duration === 'PENALTY_SHOOTOUT'
    const resultMethod = match.score.duration === 'PENALTY_SHOOTOUT'
      ? 'PK'
      : match.score.duration === 'EXTRA_TIME'
        ? 'ET'
        : '90'

    const penaltyWinnerId = isPenalties
      ? getPenaltyWinnerId(match, dbMatch.home_team_id!, dbMatch.away_team_id!)
      : null

    const { error: updateErr } = await service
      .from('matches')
      .update({
        home_score:        homeScore,
        away_score:        awayScore,
        penalty_winner_id: penaltyWinnerId,
        result_method:     isKnockout ? resultMethod : null,
        status:            'completed',
      })
      .eq('id', dbMatch.id)

    if (updateErr) {
      results.push(`FAIL ${dbMatch.external_id}: ${updateErr.message}`)
      continue
    }

    if (isKnockout) {
      await service.rpc('score_knockout_predictions', { p_match_id: dbMatch.id })
    } else {
      await service.rpc('score_match_predictions', { p_match_id: dbMatch.id })
    }

    results.push(`OK ${dbMatch.external_id} (${homeScore}–${awayScore}${isPenalties ? ' pens' : ''})`)
  }

  if (results.some(r => r.startsWith('OK'))) {
    revalidatePath('/leaderboard')
  }

  return NextResponse.json({
    checked: dueMatches.length,
    synced:  results.filter(r => r.startsWith('OK')).length,
    results,
  })
}

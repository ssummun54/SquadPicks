// Smart score sync — called by Vercel Cron (hourly) or manually.
//
// Strategy:
//   1. Query our own DB for matches where kickoff_at + 2.5h ≤ now AND status != completed
//   2. If nothing is due → return immediately (zero API calls on non-match days)
//   3. Fetch only those specific fixture IDs from api-football.com
//   4. Update scores, run scoring functions, revalidate leaderboard
//
// This means on a day with no matches the cron costs nothing.
// On match days it runs targeted fetches only when games are expected to be finished.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseService } from '@/lib/supabase/service'
import { getFixturesByIds, getPenaltyWinnerId, FINISHED_STATUSES, LIVE_STATUSES } from '@/lib/football-api'

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000  // 2h — cron runs every 2h, start checking when matches are likely done

export async function GET(req: NextRequest) {
  return handler(req)
}

export async function POST(req: NextRequest) {
  return handler(req)
}

async function handler(req: NextRequest) {
  // Auth: Vercel Cron sends CRON_SECRET as Authorization header
  const authHeader = req.headers.get('authorization')
  const body = await req.json().catch(() => ({}))
  const secret = authHeader?.replace('Bearer ', '') ?? body.secret

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = getSupabaseService()

  // 1. Find matches in our DB that are "due" — kicked off 2.5h+ ago but not yet completed
  const dueCutoff = new Date(Date.now() - MATCH_DURATION_MS).toISOString()

  const { data: dueMatches, error: dueErr } = await service
    .from('matches')
    .select('id, external_id, home_team_id, away_team_id, rounds!inner(type)')
    .lte('kickoff_at', dueCutoff)
    .neq('status', 'completed')
    .not('external_id', 'is', null)

  if (dueErr) {
    return NextResponse.json({ error: dueErr.message }, { status: 500 })
  }

  // Nothing due — exit without touching the API
  if (!dueMatches || dueMatches.length === 0) {
    return NextResponse.json({ message: 'No matches due', synced: 0 })
  }

  // 2. Fetch only those specific fixtures from api-football.com
  const externalIds = dueMatches.map(m => m.external_id!)

  let fixtures
  try {
    fixtures = await getFixturesByIds(externalIds)
  } catch (err) {
    return NextResponse.json(
      { error: `API fetch failed: ${(err as Error).message}` },
      { status: 502 }
    )
  }

  // Index DB rows by external_id
  const dbById = new Map(dueMatches.map(m => [m.external_id!, m]))

  const results: string[] = []

  for (const fixture of fixtures) {
    const extId   = String(fixture.fixture.id)
    const dbMatch = dbById.get(extId)
    if (!dbMatch) continue

    const statusShort = fixture.fixture.status.short

    // Still in progress — mark as live but don't score yet
    if (LIVE_STATUSES.has(statusShort)) {
      await service.from('matches').update({ status: 'live' }).eq('id', dbMatch.id)
      results.push(`LIVE ${extId}`)
      continue
    }

    // Not finished and not live — skip
    if (!FINISHED_STATUSES.has(statusShort)) continue

    const homeScore = fixture.score.fulltime.home ?? fixture.goals.home
    const awayScore = fixture.score.fulltime.away ?? fixture.goals.away
    if (homeScore === null || awayScore === null) continue

    const isKnockout  = (dbMatch as any).rounds?.type === 'knockout'
    const isPenalties = statusShort === 'PEN'

    const penaltyWinnerId = isPenalties
      ? getPenaltyWinnerId(fixture, dbMatch.home_team_id!, dbMatch.away_team_id!)
      : null

    // Update match
    const { error: updateErr } = await service
      .from('matches')
      .update({
        home_score:        homeScore,
        away_score:        awayScore,
        penalty_winner_id: penaltyWinnerId,
        status:            'completed',
      })
      .eq('id', dbMatch.id)

    if (updateErr) {
      results.push(`FAIL ${extId}: ${updateErr.message}`)
      continue
    }

    // Score predictions
    await service.rpc('score_match_predictions', { p_match_id: dbMatch.id })

    if (isKnockout) {
      await service.rpc('score_bracket_predictions', { p_match_id: dbMatch.id })
    }

    results.push(`OK ${extId} (${homeScore}–${awayScore}${isPenalties ? ' pens' : ''})`)
  }

  // Revalidate leaderboard only if something was scored
  if (results.some(r => r.startsWith('OK'))) {
    revalidatePath('/leaderboard')
  }

  return NextResponse.json({
    checked: dueMatches.length,
    synced:  results.filter(r => r.startsWith('OK')).length,
    results,
  })
}

// One-time (re-runnable) endpoint to seed WC2026 matches from football-data.org.
//
// Call once after the draw + schedule are published:
//   POST /api/admin/seed-fixtures
//
// Prerequisites:
//   - schema.sql + seed_wc2026.sql already run
//   - "Seed teams from API" already run (teams + group_teams populated)
//
// What it does:
//   1. Fetches all WC2026 matches from football-data.org
//   2. Maps stage → our rounds.slug
//   3. Matches home/away team names to our teams table
//   4. For group stage: resolves group_id from match.group label
//   5. Upserts matches with external_id (safe to re-run)

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseService } from '@/lib/supabase/service'
import {
  getWCMatches,
  stageToRoundSlug,
  groupLabelToSlug,
  mapStatus,
  WC_CODE,
  WC_SEASON,
} from '@/lib/football-api'

function normaliseName(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().trim()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const body = await req.json().catch(() => ({}))
  const dryRun = body.dryRun === true
  const bearerSecret = authHeader?.replace('Bearer ', '') ?? body.secret
  const isBearer = process.env.CRON_SECRET && bearerSecret === process.env.CRON_SECRET

  if (!isBearer) {
    const { getSupabaseServer } = await import('@/lib/supabase/server')
    const supabase = await getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
    if (!user || !adminIds.includes(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const service = getSupabaseService()

  // ── Load reference data ──────────────────────────────────────────────────────
  const [teamsRes, roundsRes, groupsRes] = await Promise.all([
    service.from('teams').select('id, name, short_name'),
    service.from('rounds').select('id, slug, type').in('season_id', ['00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200']),
    service.from('tournament_groups').select('id, slug'),
  ])

  if (teamsRes.error)  return NextResponse.json({ error: teamsRes.error.message },  { status: 500 })
  if (roundsRes.error) return NextResponse.json({ error: roundsRes.error.message }, { status: 500 })
  if (groupsRes.error) return NextResponse.json({ error: groupsRes.error.message }, { status: 500 })

  const teamByName  = new Map<string, string>()
  const groupRoundBySlug = new Map<string, string>()
  const knockoutRoundBySlug = new Map<string, string>()
  const groupBySlug = new Map<string, string>()

  for (const t of teamsRes.data!) {
    teamByName.set(normaliseName(t.name), t.id)
    if (t.short_name) teamByName.set(normaliseName(t.short_name), t.id)
  }
  for (const r of (roundsRes.data as { id: string; slug: string; type: string }[])) {
    if (r.type === 'group') groupRoundBySlug.set(r.slug, r.id)
    else knockoutRoundBySlug.set(r.slug, r.id)
  }
  for (const g of groupsRes.data!)  groupBySlug.set(g.slug, g.id)

  // ── Fetch matches from football-data.org ────────────────────────────────────
  let matches
  try {
    matches = await getWCMatches()
  } catch (err) {
    return NextResponse.json({ error: `API fetch failed: ${(err as Error).message}` }, { status: 502 })
  }

  if (matches.length === 0) {
    return NextResponse.json({ message: 'No WC2026 matches available from API yet', inserted: 0 })
  }

  const report: { inserted: number; updated: number; unmatched: string[]; preview?: any[] } = { inserted: 0, updated: 0, unmatched: [] }

  for (const match of matches) {
    const externalId = String(match.id)

    const roundSlug = stageToRoundSlug(match.stage)
    if (!roundSlug) {
      report.unmatched.push(`Unknown stage "${match.stage}" (match ${externalId})`)
      continue
    }
    const isKnockoutStage = roundSlug !== 'group_stage'
    const roundId = isKnockoutStage
      ? knockoutRoundBySlug.get(roundSlug)
      : groupRoundBySlug.get(roundSlug)
    if (!roundId) {
      report.unmatched.push(`Round slug "${roundSlug}" not in DB`)
      continue
    }

    // Skip TBD matches (knockout rounds where teams aren't decided yet)
    if (!match.homeTeam?.name || !match.awayTeam?.name) continue

    const homeId = teamByName.get(normaliseName(match.homeTeam.name))
      ?? teamByName.get(normaliseName(match.homeTeam.tla))
    const awayId = teamByName.get(normaliseName(match.awayTeam.name))
      ?? teamByName.get(normaliseName(match.awayTeam.tla))

    if (!homeId) report.unmatched.push(`Home team not found: "${match.homeTeam.name}" (match ${externalId})`)
    if (!awayId) report.unmatched.push(`Away team not found: "${match.awayTeam.name}" (match ${externalId})`)
    if (!homeId || !awayId) continue

    const groupSlug = groupLabelToSlug(match.group)
    const groupId   = groupSlug ? (groupBySlug.get(groupSlug) ?? null) : null

    const row = {
      external_id:  externalId,
      round_id:     roundId,
      group_id:     groupId,
      home_team_id: homeId,
      away_team_id: awayId,
      kickoff_at:   match.utcDate,
      venue:        match.venue ?? null,
      status:       mapStatus(match.status),
      home_score:   match.score.fullTime.home ?? null,
      away_score:   match.score.fullTime.away ?? null,
    }

    const { data: existing } = await service
      .from('matches')
      .select('id')
      .eq('external_id', externalId)
      .maybeSingle()

    if (existing) {
      report.updated++
      continue
    }

    if (dryRun) {
      report.inserted++
      report.preview = report.preview ?? []
      ;(report.preview as any[]).push({ externalId, round: roundSlug, home: match.homeTeam?.name, away: match.awayTeam?.name, kickoff: match.utcDate })
      continue
    }

    const { error } = await service
      .from('matches')
      .insert(row)

    if (error) {
      report.unmatched.push(`DB error for match ${externalId}: ${error.message}`)
    } else {
      report.inserted++
    }
  }

  return NextResponse.json({
    total:     matches.length,
    inserted:  report.inserted,
    updated:   report.updated,
    unmatched: report.unmatched,
    preview:   report.preview,
    dryRun,
    competition: WC_CODE,
    season:      WC_SEASON,
  })
}

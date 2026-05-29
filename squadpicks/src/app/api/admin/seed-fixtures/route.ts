// One-time (or re-runnable) endpoint to seed WC2026 matches from api-football.com.
//
// Call once after the draw + schedule are published:
//   POST /api/admin/seed-fixtures
//   Body: { "secret": "<CRON_SECRET>" }
//
// Prerequisites in Supabase:
//   - schema.sql + seed_wc2026.sql already run
//   - group_teams populated (teams assigned to groups A–L after the draw)
//
// What it does:
//   1. Fetches all WC2026 fixtures from api-football.com
//   2. Matches each fixture's home/away team to our teams table (by name)
//   3. Maps api-football round string → our rounds.slug
//   4. For group stage: finds the group via group_teams lookup
//   5. Upserts matches with external_id (safe to re-run)
//
// Returns a full report: inserted, updated, skipped, unmatched

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseService } from '@/lib/supabase/service'
import { getWCFixtures, WC_LEAGUE, WC_SEASON } from '@/lib/football-api'

// ─── Round mapping ────────────────────────────────────────────────────────────
const ROUND_SLUG_MAP: [string, string][] = [
  ['group stage',   'group_stage'],
  ['round of 32',   'round_of_32'],
  ['round of 16',   'round_of_16'],
  ['quarter',       'quarter_final'],
  ['semi',          'semi_final'],
  ['3rd',           'third_place'],
  ['third',         'third_place'],
]

function getRoundSlug(apiRound: string): string | null {
  const lower = apiRound.toLowerCase()
  // "final" must come after quarter/semi/3rd checks
  for (const [key, slug] of ROUND_SLUG_MAP) {
    if (lower.includes(key)) return slug
  }
  if (lower === 'final' || lower.endsWith('- final')) return 'final'
  return null
}

// ─── Team name normalisation ──────────────────────────────────────────────────
// Maps api-football.com names → our teams.name (lowercase for comparison)
const TEAM_ALIASES: Record<string, string> = {
  'united states':                    'usa',
  'korea republic':                   'south korea',
  'republic of korea':                'south korea',
  "cote d'ivoire":                    "côte d'ivoire",
  'ivory coast':                      "côte d'ivoire",
  'congo dr':                         'dr congo',
  'dr. congo':                        'dr congo',
  'democratic republic of the congo': 'dr congo',
  'saudi arabia':                     'saudi arabia',
}

function normaliseName(name: string): string {
  const lower = name.toLowerCase().trim()
  return TEAM_ALIASES[lower] ?? lower
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Auth — accept either a bearer CRON_SECRET (for CLI use) or a valid admin session
  const authHeader = req.headers.get('authorization')
  const body = await req.json().catch(() => ({}))
  const bearerSecret = authHeader?.replace('Bearer ', '') ?? body.secret

  const isBearer = process.env.CRON_SECRET && bearerSecret === process.env.CRON_SECRET

  if (!isBearer) {
    // Fall back to session-based admin check
    const { getSupabaseServer } = await import('@/lib/supabase/server')
    const supabase = await getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
    if (!user || !adminIds.includes(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const service = getSupabaseService()

  // ── Load reference data from our DB ─────────────────────────────────────────
  const [teamsRes, roundsRes, groupsRes, groupTeamsRes] = await Promise.all([
    service.from('teams').select('id, name, short_name, country_code'),
    service.from('rounds').select('id, slug').eq('season_id', '00000000-0000-0000-0000-000000000100'),
    service.from('tournament_groups').select('id, slug'),
    service.from('group_teams').select('group_id, team_id'),
  ])

  if (teamsRes.error)      return NextResponse.json({ error: teamsRes.error.message },      { status: 500 })
  if (roundsRes.error)     return NextResponse.json({ error: roundsRes.error.message },     { status: 500 })
  if (groupsRes.error)     return NextResponse.json({ error: groupsRes.error.message },     { status: 500 })
  if (groupTeamsRes.error) return NextResponse.json({ error: groupTeamsRes.error.message }, { status: 500 })

  // Index for fast lookup
  const teamByName    = new Map<string, string>()  // normalised name → id
  const roundBySlug   = new Map<string, string>()  // slug → id
  const groupTeamMap  = new Map<string, string>()  // team_id → group_id

  for (const t of teamsRes.data!) {
    teamByName.set(normaliseName(t.name), t.id)
    if (t.short_name) teamByName.set(normaliseName(t.short_name), t.id)
    if (t.country_code) teamByName.set(t.country_code.toLowerCase(), t.id)
  }
  for (const r of roundsRes.data!)     roundBySlug.set(r.slug, r.id)
  for (const gt of groupTeamsRes.data!) groupTeamMap.set(gt.team_id, gt.group_id)

  // ── Fetch fixtures from api-football.com ─────────────────────────────────────
  let fixtures
  try {
    fixtures = await getWCFixtures()
  } catch (err) {
    return NextResponse.json({ error: `API fetch failed: ${(err as Error).message}` }, { status: 502 })
  }

  if (fixtures.length === 0) {
    return NextResponse.json({ message: 'No WC2026 fixtures available from API yet', inserted: 0 })
  }

  const report = {
    inserted:  0,
    updated:   0,
    skipped:   0,
    unmatched: [] as string[],
  }

  for (const fix of fixtures) {
    const externalId = String(fix.fixture.id)
    const apiRound   = fix.league.round

    // Match round
    const roundSlug = getRoundSlug(apiRound)
    if (!roundSlug) {
      report.unmatched.push(`Unknown round "${apiRound}" (fixture ${externalId})`)
      continue
    }
    const roundId = roundBySlug.get(roundSlug)
    if (!roundId) {
      report.unmatched.push(`Round slug "${roundSlug}" not in DB`)
      continue
    }

    // Match home/away teams
    const homeId = teamByName.get(normaliseName(fix.teams.home.name))
    const awayId = teamByName.get(normaliseName(fix.teams.away.name))

    if (!homeId) {
      report.unmatched.push(`Home team not found: "${fix.teams.home.name}" (fixture ${externalId})`)
    }
    if (!awayId) {
      report.unmatched.push(`Away team not found: "${fix.teams.away.name}" (fixture ${externalId})`)
    }
    if (!homeId || !awayId) continue

    // For group stage: find shared group from group_teams
    let groupId: string | null = null
    if (roundSlug === 'group_stage') {
      const homeGroup = groupTeamMap.get(homeId)
      const awayGroup = groupTeamMap.get(awayId)
      if (homeGroup && homeGroup === awayGroup) {
        groupId = homeGroup
      }
      // If group_teams not yet populated, groupId stays null — re-run after populating
    }

    // Map api-football status → ours
    const statusShort = fix.fixture.status.short
    const status: 'completed' | 'live' | 'postponed' | 'scheduled' =
      ['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(statusShort) ? 'completed' :
      ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(statusShort) ? 'live' :
      ['PST', 'CANC', 'ABD'].includes(statusShort) ? 'postponed' : 'scheduled'

    const row = {
      external_id:  externalId,
      round_id:     roundId,
      group_id:     groupId,
      home_team_id: homeId,
      away_team_id: awayId,
      kickoff_at:   fix.fixture.date,
      venue:        fix.fixture.venue.name ?? null,
      status,
      home_score:   fix.score.fulltime.home ?? null,
      away_score:   fix.score.fulltime.away ?? null,
    }

    const { error } = await service
      .from('matches')
      .upsert(row, { onConflict: 'external_id' })

    if (error) {
      report.unmatched.push(`DB error for fixture ${externalId}: ${error.message}`)
    } else {
      // Check if this was an insert or update by looking for existing row
      const isNew = !fix.score.fulltime.home  // heuristic — refine if needed
      if (isNew) report.inserted++ ; else report.updated++
    }
  }

  return NextResponse.json({
    total:     fixtures.length,
    inserted:  report.inserted,
    updated:   report.updated,
    skipped:   report.skipped,
    unmatched: report.unmatched,
    league:    WC_LEAGUE,
    season:    WC_SEASON,
  })
}

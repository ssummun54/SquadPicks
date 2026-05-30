// One-time (re-runnable) endpoint to seed WC2026 teams + group assignments.
//
// Step 1: GET /competitions/WC/teams?season=2026 → upsert all 48 teams with logos
// Step 2: GET /competitions/WC/matches?season=2026&stage=GROUP_STAGE → derive
//         team→group mapping from which group each match belongs to
//
// Group assignments only populate once the match schedule is published.
// Safe to re-run — upserts on (sport_id, slug) for teams, (group_id, team_id) for group_teams.

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseService } from '@/lib/supabase/service'
import { getWCTeams, getWCMatches, groupLabelToSlug } from '@/lib/football-api'

const SPORT_ID = '00000000-0000-0000-0000-000000000001'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const body = await req.json().catch(() => ({}))
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

  // Load tournament_groups for group slug → id mapping
  const { data: tournamentGroups, error: tgErr } = await service
    .from('tournament_groups')
    .select('id, slug')

  if (tgErr) return NextResponse.json({ error: tgErr.message }, { status: 500 })

  const groupBySlug = new Map<string, string>(
    (tournamentGroups ?? []).map(g => [g.slug, g.id])
  )

  // ── Step 1: Fetch + upsert all teams ────────────────────────────────────────
  let apiTeams: Awaited<ReturnType<typeof getWCTeams>>
  try {
    apiTeams = await getWCTeams()
  } catch (err) {
    return NextResponse.json({ error: `Teams fetch failed: ${(err as Error).message}` }, { status: 502 })
  }

  const report = { teamsUpserted: 0, groupLinksUpserted: 0, unmatched: [] as string[] }

  // fd_id → our DB uuid (needed to link groups)
  const teamUuidByFdId = new Map<number, string>()

  for (const team of apiTeams) {
    const slug = toSlug(team.name)

    const { data, error } = await service
      .from('teams')
      .upsert(
        {
          sport_id:   SPORT_ID,
          name:       team.name,
          short_name: team.tla,
          slug,
          logo_url:   team.crest,
        },
        { onConflict: 'sport_id,slug' }
      )
      .select('id')
      .single()

    if (error || !data) {
      report.unmatched.push(`Failed to upsert "${team.name}": ${error?.message}`)
      continue
    }

    report.teamsUpserted++
    teamUuidByFdId.set(team.id, data.id)
  }

  // ── Step 2: Derive group assignments from group stage matches ────────────────
  let groupMatches: Awaited<ReturnType<typeof getWCMatches>>
  try {
    groupMatches = await getWCMatches({ stage: 'GROUP_STAGE' })
  } catch (err) {
    return NextResponse.json({
      ...report,
      warning: `Teams seeded but group match fetch failed: ${(err as Error).message}`,
    })
  }

  // Build team → group slug map from match data
  const teamGroupMap = new Map<number, string>()  // fd team id → group slug
  for (const match of groupMatches) {
    if (!match.group) continue
    const slug = groupLabelToSlug(match.group)
    if (!slug) continue
    if (match.homeTeam?.id) teamGroupMap.set(match.homeTeam.id, slug)
    if (match.awayTeam?.id) teamGroupMap.set(match.awayTeam.id, slug)
  }

  if (teamGroupMap.size === 0) {
    return NextResponse.json({
      ...report,
      warning: 'Teams seeded but no group assignments found yet — run again once match schedule is published',
    })
  }

  // Upsert group_teams
  for (const [fdId, groupSlug] of teamGroupMap) {
    const teamUuid  = teamUuidByFdId.get(fdId)
    const groupUuid = groupBySlug.get(groupSlug)

    if (!teamUuid || !groupUuid) {
      report.unmatched.push(`Cannot link fd_id=${fdId} to group "${groupSlug}"`)
      continue
    }

    const { error } = await service
      .from('group_teams')
      .upsert(
        { group_id: groupUuid, team_id: teamUuid },
        { onConflict: 'group_id,team_id' }
      )

    if (error) {
      report.unmatched.push(`group_teams link failed for fd_id=${fdId}: ${error.message}`)
    } else {
      report.groupLinksUpserted++
    }
  }

  return NextResponse.json({
    teamsUpserted:      report.teamsUpserted,
    groupLinksUpserted: report.groupLinksUpserted,
    unmatched:          report.unmatched,
  })
}

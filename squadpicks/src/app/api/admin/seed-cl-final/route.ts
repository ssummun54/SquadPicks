// Pulls the CL 2025-26 Final match from football-data.org and upserts it.
// Prerequisites: seed_cl_2026.sql already run.

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseService } from '@/lib/supabase/service'

const CL_CODE    = 'CL'
const CL_SEASON  = 2025
const SEASON_ID  = '00000000-0000-0000-0002-000000000100'
const ROUND_ID   = '00000000-0000-0002-0001-000000000000'

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

  // Fetch CL Final from football-data.org
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${CL_CODE}/matches?season=${CL_SEASON}&stage=FINAL`,
    { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! }, cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ error: `API error ${res.status}` }, { status: 502 })

  const json = await res.json()
  const matches = json.matches ?? []
  if (matches.length === 0) return NextResponse.json({ error: 'No CL Final match found yet' }, { status: 404 })

  const service = getSupabaseService()

  const results = []
  for (const match of matches) {
    if (!match.homeTeam?.name || !match.awayTeam?.name) continue

    // Upsert home team
    const upsertTeam = async (team: any) => {
      const slug = team.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
      const { data, error } = await service.from('teams').upsert(
        { sport_id: '00000000-0000-0000-0000-000000000001', name: team.name, short_name: team.tla, slug, logo_url: team.crest },
        { onConflict: 'sport_id,slug' }
      ).select('id').single()
      if (error) throw new Error(`Team upsert failed: ${error.message}`)
      return data!.id
    }

    const [homeId, awayId] = await Promise.all([upsertTeam(match.homeTeam), upsertTeam(match.awayTeam)])

    const status = ['FINISHED', 'AWARDED'].includes(match.status) ? 'completed'
      : ['IN_PLAY', 'PAUSED', 'LIVE'].includes(match.status) ? 'live'
      : ['POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(match.status) ? 'postponed'
      : 'scheduled'

    const { error } = await service.from('matches').upsert({
      external_id:  String(match.id),
      round_id:     ROUND_ID,
      group_id:     null,
      home_team_id: homeId,
      away_team_id: awayId,
      kickoff_at:   match.utcDate,
      status,
      home_score:   match.score.fullTime.home ?? null,
      away_score:   match.score.fullTime.away ?? null,
    }, { onConflict: 'external_id' })

    if (error) results.push(`FAIL: ${error.message}`)
    else results.push(`OK: ${match.homeTeam.name} vs ${match.awayTeam.name} — ${match.utcDate}`)
  }

  return NextResponse.json({ results })
}

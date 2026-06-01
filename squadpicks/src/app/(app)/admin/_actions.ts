'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseService } from '@/lib/supabase/service'

async function requireAdmin() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!user || !adminIds.includes(user.id)) throw new Error('Unauthorized')
}

// Manual score override (fallback when API sync misses a match)
export async function overrideMatchScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
  resultMethod: '90' | 'ET' | 'PK' | null = null,
  penaltyWinnerId: string | null = null
) {
  await requireAdmin()

  const service = getSupabaseService()

  const { data: match, error } = await service
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      result_method: resultMethod,
      penalty_winner_id: resultMethod === 'PK' ? penaltyWinnerId : null,
      status: 'completed',
    })
    .eq('id', matchId)
    .select('id, rounds!inner(type)')
    .single()

  if (error) throw new Error(error.message)

  await service.rpc('score_match_predictions', { p_match_id: matchId })

  const roundType = (match as { rounds?: { type?: string } | { type?: string }[] }).rounds
  const isKnockout = Array.isArray(roundType) ? roundType[0]?.type === 'knockout' : roundType?.type === 'knockout'

  if (isKnockout) {
    await service.rpc('score_bracket_predictions', { p_match_id: matchId })
  }

  revalidatePath('/leaderboard')
}

// Set final standings for a group and score group predictions
export async function scoreGroupStandings(
  groupId: string,
  positions: { teamId: string; position: number }[]
) {
  await requireAdmin()

  const service = getSupabaseService()

  await Promise.all(
    positions.map(({ teamId, position }) =>
      service
        .from('group_teams')
        .update({ final_position: position })
        .eq('group_id', groupId)
        .eq('team_id', teamId)
    )
  )

  await service.rpc('score_group_predictions', { p_group_id: groupId })

  revalidatePath('/leaderboard')
}

// Mark a season as completed
export async function markSeasonCompleted(seasonId: string) {
  await requireAdmin()
  const service = getSupabaseService()
  const { error } = await service
    .from('seasons')
    .update({ status: 'completed' })
    .eq('id', seasonId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/leaderboard')
}

// Trigger a manual sync (same logic as cron, but called from admin UI)
export async function triggerSync(): Promise<{ synced: number; results: string[] }> {
  await requireAdmin()

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/sync-scores`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.CRON_SECRET }),
    }
  )

  if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
  return res.json()
}

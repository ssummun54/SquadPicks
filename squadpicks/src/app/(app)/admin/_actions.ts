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
export async function overrideMatchScore(matchId: string, homeScore: number, awayScore: number) {
  await requireAdmin()

  const service = getSupabaseService()

  const { data: match, error } = await service
    .from('matches')
    .update({ home_score: homeScore, away_score: awayScore, status: 'completed' })
    .eq('id', matchId)
    .select('id, rounds!inner(type)')
    .single()

  if (error) throw new Error(error.message)

  await service.rpc('score_match_predictions', { p_match_id: matchId })

  if ((match as any).rounds?.type === 'knockout') {
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

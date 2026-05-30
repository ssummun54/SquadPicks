'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseService } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export async function createGroupAction(name: string, seasonId: string) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const service = getSupabaseService()

  // Create group
  const { data: group, error: gErr } = await service
    .from('pick_groups')
    .insert({ name, created_by: user.id })
    .select('id')
    .single()

  if (gErr || !group) return { error: gErr?.message ?? 'Failed to create group' }

  // Add creator as owner/member (service role bypasses RLS)
  const { error: mErr } = await service
    .from('pick_group_members')
    .insert({ pick_group_id: group.id, user_id: user.id, role: 'admin' })

  if (mErr) return { error: mErr.message }

  // Link season
  const { error: sErr } = await service
    .from('pick_group_seasons')
    .insert({ pick_group_id: group.id, season_id: seasonId })

  if (sErr) return { error: sErr.message }

  redirect(`/groups/${group.id}`)
}

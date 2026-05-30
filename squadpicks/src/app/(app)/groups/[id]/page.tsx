import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { GroupPageClient } from './_client'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Group' }

export default async function GroupPage({ params }: Props) {
  const { id } = await params
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const [groupRes, membersRes, groupSeasonsRes, availableSeasonsRes] = await Promise.all([
    supabase.from('pick_groups').select('id, name, invite_code, created_by').eq('id', id).single(),
    supabase.from('pick_group_members').select('user_id, role, profiles(username, display_name)').eq('pick_group_id', id),
    supabase
      .from('pick_group_seasons')
      .select('season_id, seasons(id, name, status, competitions(name), rounds(slug, type, prediction_window))')
      .eq('pick_group_id', id)
      .order('joined_at', { ascending: true }),
    // Seasons this group has NOT joined yet (for the "Join new event" button)
    supabase.from('seasons').select('id, name, status, competitions(name), rounds(slug, type, prediction_window)').neq('status', 'completed'),
  ])

  if (!groupRes.data) notFound()

  const group   = groupRes.data as any
  const members = (membersRes.data ?? []) as any[]
  const joinedSeasons = (groupSeasonsRes.data ?? []).map((r: any) => r.seasons).filter(Boolean) as any[]
  const joinedSeasonIds = new Set(joinedSeasons.map((s: any) => s.id))
  const availableSeasons = (availableSeasonsRes.data ?? []).filter((s: any) => !joinedSeasonIds.has(s.id)) as any[]

  // Per-season leaderboard filtered to group members
  const memberIds = members.map(m => m.user_id)
  const seasonLeaderboards: Record<string, any[]> = {}
  for (const season of joinedSeasons) {
    const { data } = await supabase
      .from('pick_group_leaderboard')
      .select('*')
      .eq('season_id', season.id)
      .eq('pick_group_id', id)
      .order('rank')
    seasonLeaderboards[season.id] = (data ?? []).map((r: any, i: number) => ({ ...r, groupRank: i + 1 }))
  }

  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin'

  return (
    <GroupPageClient
      group={group}
      members={members}
      seasons={joinedSeasons}
      availableSeasons={availableSeasons}
      seasonLeaderboards={seasonLeaderboards}
      currentUserId={user?.id ?? null}
      isAdmin={isAdmin}
    />
  )
}

import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseService } from '@/lib/supabase/service'
import { JoinConfirm } from './_client'

interface Props { params: Promise<{ code: string }> }

export default async function JoinPage({ params }: Props) {
  const { code } = await params
  const supabase  = await getSupabaseServer()
  const service   = getSupabaseService()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/register?redirect=/join/${code}`)

  const { data: group } = await service
    .from('pick_groups')
    .select('id, name, pick_group_members(count)')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!group) redirect('/groups?error=invalid-code')

  // Already a member — skip confirmation
  const { data: existing } = await service
    .from('pick_group_members')
    .select('user_id')
    .eq('pick_group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existing) redirect(`/groups/${group.id}`)

  const memberCount = (group.pick_group_members as any)?.[0]?.count ?? 0

  return <JoinConfirm groupId={group.id} groupName={group.name} memberCount={memberCount} code={code.toUpperCase()} />
}

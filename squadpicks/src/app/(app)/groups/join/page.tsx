'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function JoinGroupPage() {
  const router = useRouter()
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError('Enter an invite code'); return }
    setLoading(true); setError('')

    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    const { data: group, error: gErr } = await supabase
      .from('pick_groups')
      .select('id, name')
      .eq('invite_code', trimmed)
      .single()

    if (gErr || !group) { setError('Group not found. Double-check the code.'); setLoading(false); return }

    const { error: mErr } = await supabase
      .from('pick_group_members')
      .insert({ pick_group_id: group.id, user_id: user.id, role: 'member' })

    if (mErr && mErr.code !== '23505') { setError(mErr.message); setLoading(false); return }

    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-black text-slate-100 mb-1">Join a group</h1>
      <p className="text-slate-400 text-sm mb-8">Enter the 8-character invite code from your friend.</p>

      <div className="flex flex-col gap-4">
        <Input
          label="Invite code"
          id="code"
          placeholder="e.g. AB3F7C9D"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          className="font-mono text-lg tracking-widest"
          maxLength={8}
          error={error}
        />
        <Button onClick={handleJoin} loading={loading} size="lg" className="w-full">
          Join group
        </Button>
      </div>
    </div>
  )
}

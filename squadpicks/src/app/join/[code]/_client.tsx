'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Props {
  groupId:     string
  groupName:   string
  memberCount: number
  code:        string
}

export function JoinConfirm({ groupId, groupName, memberCount, code }: Props) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError]     = useState('')

  const accept = async () => {
    setJoining(true)
    setError('')
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/register?redirect=/join/${code}`); return }

    const { error: err } = await supabase
      .from('pick_group_members')
      .insert({ pick_group_id: groupId, user_id: user.id, role: 'member' })

    if (err) { setError(err.message); setJoining(false); return }
    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl flex flex-col items-center text-center gap-6">
        <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center text-3xl">
          👥
        </div>

        <div>
          <p className="text-sm text-slate-400 mb-1">You&apos;ve been invited to join</p>
          <h1 className="text-2xl font-black text-slate-100">{groupName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 w-full">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={accept}
            disabled={joining}
            className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {joining ? 'Joining…' : 'Accept invite'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            disabled={joining}
            className="w-full py-2.5 rounded-lg border border-slate-600 text-slate-400 text-sm hover:border-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

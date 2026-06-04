'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { createGroupAction } from './_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  name:     z.string().min(2, 'At least 2 characters').max(40, 'Max 40 characters'),
  seasonId: z.string().min(1, 'Select a tournament'),
})
type Fields = z.infer<typeof schema>

export default function NewGroupPage() {
  const router = useRouter()
  const [seasons, setSeasons] = useState<{ id: string; name: string; competitions: { name: string } | null }[]>([])
  const [serverErr, setServerErr] = useState('')

  // Join form state
  const [code, setCode]         = useState('')
  const [joinErr, setJoinErr]   = useState('')
  const [joining, setJoining]   = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })
  const seasonId = watch('seasonId')

  useEffect(() => {
    getSupabaseClient()
      .from('seasons')
      .select('id, name, competitions(name)')
      .neq('status', 'completed')
      .order('year', { ascending: false })
      .then(({ data }) => { if (data) setSeasons(data as any) })
  }, [])

  const onSubmit = async (data: Fields) => {
    setServerErr('')
    const result = await createGroupAction(data.name, data.seasonId)
    if (result?.error) setServerErr(result.error)
  }

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setJoinErr('Enter an invite code'); return }
    setJoining(true); setJoinErr('')

    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setJoinErr('Not signed in'); setJoining(false); return }

    const { data: group, error: gErr } = await supabase
      .from('pick_groups').select('id, name').eq('invite_code', trimmed).single()

    if (gErr || !group) { setJoinErr('Group not found. Double-check the code.'); setJoining(false); return }

    const { error: mErr } = await supabase
      .from('pick_group_members')
      .insert({ pick_group_id: group.id, user_id: user.id, role: 'member' })

    if (mErr && mErr.code !== '23505') { setJoinErr(mErr.message); setJoining(false); return }

    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-black text-slate-100">Groups</h1>
        <p className="text-slate-400 text-sm mt-1">Create a new group or join one with an invite code.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 items-start">

        {/* Create */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-bold text-slate-100">Create a group</h2>
            <p className="text-xs text-slate-400 mt-1">An invite code is generated automatically. You can add more tournaments later.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Group name"
              id="name"
              placeholder="e.g. The Office WC2026"
              error={errors.name?.message}
              {...register('name')}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="seasonId" className="text-sm font-medium text-slate-300">Starting tournament</label>
              <select
                id="seasonId"
                {...register('seasonId')}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 text-sm focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">Select a tournament…</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {(s.competitions as any)?.name ? `${(s.competitions as any).name} — ` : ''}{s.name}
                  </option>
                ))}
              </select>
              {errors.seasonId && <span className="text-xs text-red-400">{errors.seasonId.message}</span>}
            </div>

            {serverErr && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{serverErr}</p>
            )}

            <Button type="submit" loading={isSubmitting} disabled={!seasonId} className="w-full">
              Create group
            </Button>
          </form>
        </div>

        {/* Join */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-bold text-slate-100">Join a group</h2>
            <p className="text-xs text-slate-400 mt-1">Enter the 8-character invite code shared by your group owner.</p>
          </div>

          <div className="flex flex-col gap-4">
            <Input
              label="Invite code"
              id="code"
              placeholder="e.g. AB3F7C9D"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="font-mono text-lg tracking-widest"
              maxLength={8}
              error={joinErr}
            />
            <Button onClick={handleJoin} loading={joining} className="w-full">
              Join group
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

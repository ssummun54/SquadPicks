'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

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
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setServerErr('Not signed in'); return }

    // Create group (no season_id — groups are season-agnostic)
    const { data: group, error: gErr } = await supabase
      .from('pick_groups')
      .insert({ name: data.name, created_by: user.id })
      .select('id')
      .single()

    if (gErr || !group) { setServerErr(gErr?.message ?? 'Failed to create group'); return }

    // Add creator as admin member
    await supabase.from('pick_group_members').insert({
      pick_group_id: group.id, user_id: user.id, role: 'admin',
    })

    // Link to the selected season
    await supabase.from('pick_group_seasons').insert({
      pick_group_id: group.id, season_id: data.seasonId,
    })

    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-black text-slate-100 mb-1">Create a group</h1>
      <p className="text-slate-400 text-sm mb-8">An invite code is generated automatically — share it with your squad. You can add more tournaments later.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          Create group
        </Button>
      </form>
    </div>
  )
}

import { getSupabaseServer } from '@/lib/supabase/server'
import { SeasonsClient } from './_client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Browse Events' }

export default async function SeasonsPage() {
  const supabase = await getSupabaseServer()

  const [sportsRes, seasonsRes] = await Promise.all([
    supabase.from('sports').select('id, name, slug').order('name'),
    supabase
      .from('seasons')
      .select('id, name, year, status, competitions(id, name, short_name, slug, logo_url, host_country, sport_id, sports(name, slug))')
      .order('year', { ascending: false }),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black text-slate-100">Browse Events</h1>
        <p className="text-slate-400 mt-1 text-sm">Find a tournament or league to predict.</p>
      </div>
      <SeasonsClient
        sports={sportsRes.data ?? []}
        seasons={(seasonsRes.data ?? []) as any}
      />
    </div>
  )
}

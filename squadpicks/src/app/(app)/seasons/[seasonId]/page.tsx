'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Season {
  id: string
  name: string
  year: number
  status: string
  competitions: { name: string; short_name: string; logo_url: string | null } | null
  rounds: { slug: string; type: string; prediction_window: string }[]
}

interface Group {
  id: string
  name: string
  invite_code: string
  joined: boolean // already has this season
}

function getRules(rounds: Season['rounds']) {
  const hasGroups = rounds.some(r => r.slug === 'group_stage')
  const hasFinal  = rounds.some(r => r.slug === 'final')
  const hasKnockout = rounds.some(r => r.type === 'knockout' && r.slug !== 'final')

  if (hasGroups) return [
    { pts: '5 pts', label: 'Exact score', desc: 'Right scoreline for any match' },
    { pts: '3 pts', label: 'Correct outcome', desc: 'Win, draw, or loss' },
    { pts: '1 pt',  label: 'Group position', desc: 'Per correct spot in final standings — tiebreaker' },
  ]
  if (hasFinal && !hasKnockout) return [
    { pts: '5 pts', label: 'Exact score',     desc: 'Right scoreline at 90 mins' },
    { pts: '3 pts', label: 'Correct winner',  desc: 'Pick who lifts the trophy' },
    { pts: '+2 pts', label: 'Correct method', desc: '90 mins, extra time, or penalties' },
  ]
  return [
    { pts: '5 pts', label: 'Exact score',    desc: 'Right scoreline for any match' },
    { pts: '3 pts', label: 'Correct outcome', desc: 'Win, draw, or loss' },
    { pts: '+2 pts', label: 'Correct method', desc: 'Regular, extra time, or penalties' },
  ]
}

export default function SeasonPage({ params }: { params: Promise<{ seasonId: string }> }) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState('')
  const [season,   setSeason]   = useState<Season | null>(null)
  const [groups,   setGroups]   = useState<Group[]>([])
  const [adding,   setAdding]   = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    params.then(p => setSeasonId(p.seasonId))
  }, [params])

  useEffect(() => {
    if (!seasonId) return
    const supabase = getSupabaseClient()

    Promise.all([
      supabase.from('seasons')
        .select('id, name, year, status, competitions(name, short_name, logo_url), rounds(slug, type, prediction_window)')
        .eq('id', seasonId)
        .single(),
      supabase.auth.getUser(),
    ]).then(async ([seasonRes, userRes]) => {
      setSeason(seasonRes.data as any)
      const userId = userRes.data.user?.id
      if (!userId) { setLoading(false); return }

      // Load all user's groups + which ones already have this season
      const [membersRes, joinedRes] = await Promise.all([
        supabase.from('pick_group_members')
          .select('pick_groups(id, name, invite_code)')
          .eq('user_id', userId),
        supabase.from('pick_group_seasons')
          .select('pick_group_id')
          .eq('season_id', seasonId),
      ])

      const joinedIds = new Set((joinedRes.data ?? []).map((r: any) => r.pick_group_id))
      const myGroups = (membersRes.data ?? [])
        .map((m: any) => m.pick_groups)
        .filter(Boolean)
        .map((g: any) => ({ ...g, joined: joinedIds.has(g.id) }))

      setGroups(myGroups)
      setLoading(false)
    })
  }, [seasonId])

  const addToGroup = async (groupId: string) => {
    setAdding(groupId)
    const supabase = getSupabaseClient()
    await supabase.from('pick_group_seasons').insert({ pick_group_id: groupId, season_id: seasonId })
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, joined: true } : g))
    setAdding(null)
  }

  const predictHref = (groupId: string) => {
    if (!season) return '#'
    const rounds = season.rounds ?? []
    const hasSeries   = rounds.some(r => r.slug === 'series')
    const hasFinalOnly = rounds.every(r => r.slug === 'final')
    const hasGroups   = rounds.some(r => r.slug === 'group_stage')
    const path = hasSeries ? 'series' : hasFinalOnly ? 'final' : hasGroups ? 'group-stage' : 'knockout'
    return `/predict/${seasonId}/${path}?from=${groupId}`
  }

  if (loading) return <div className="animate-pulse text-slate-400 p-8">Loading…</div>
  if (!season) return <div className="text-slate-400 p-8">Event not found.</div>

  const rules = getRules(season.rounds ?? [])
  const joinedGroups = groups.filter(g => g.joined)
  const unjoinedGroups = groups.filter(g => !g.joined)

  return (
    <div className="flex flex-col gap-8 max-w-2xl animate-hero animate-hero-1">

      {/* Header */}
      <div className="flex items-center gap-4">
        {(season.competitions as any)?.logo_url && (
          <Image src={(season.competitions as any).logo_url} alt="" width={48} height={48} className="object-contain" />
        )}
        <div>
          <div className="text-sm text-slate-400 font-medium uppercase tracking-wide">
            {(season.competitions as any)?.name}
          </div>
          <h1 className="text-2xl font-black text-slate-100">{season.name}</h1>
        </div>
      </div>

      {/* Rules */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">How it works</h2>
        <div className="grid grid-cols-3 gap-4">
          {rules.map(r => (
            <div key={r.label} className="flex flex-col gap-1">
              <span className="text-2xl font-black text-accent">{r.pts}</span>
              <span className="text-sm font-semibold text-slate-200">{r.label}</span>
              <span className="text-xs text-slate-400">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Already playing */}
      {joinedGroups.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Your groups playing this</h2>
          {joinedGroups.map(g => (
            <div key={g.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/60">
              <span className="font-semibold text-slate-200">{g.name}</span>
              <Link
                href={predictHref(g.id)}
                className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
              >
                Predict →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add to existing groups */}
      {unjoinedGroups.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Add to a group</h2>
          {unjoinedGroups.map(g => (
            <div key={g.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/60">
              <span className="font-semibold text-slate-200">{g.name}</span>
              <button
                onClick={() => addToGroup(g.id)}
                disabled={adding === g.id}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm font-semibold hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
              >
                {adding === g.id ? 'Adding…' : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No groups at all */}
      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/40 p-6 flex flex-col items-center text-center gap-3">
          <div className="text-3xl">👥</div>
          <div>
            <div className="font-bold text-slate-200">No groups yet</div>
            <div className="text-sm text-slate-400 mt-1">Create a group to start competing with your squad.</div>
          </div>
          <Link
            href={`/groups/new`}
            className="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Create a group
          </Link>
        </div>
      )}

      {/* Create new group for this event */}
      {groups.length > 0 && (
        <Link
          href="/groups/new"
          className="text-sm text-slate-400 hover:text-accent transition-colors text-center"
        >
          + Create a new group for this event
        </Link>
      )}
    </div>
  )
}

import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { KnockoutClient } from './_client'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  params:       Promise<{ seasonId: string }>
  searchParams: Promise<{ from?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Knockout Predictions' }
}

export default async function KnockoutPage({ params, searchParams }: Props) {
  const { seasonId } = await params
  const { from: groupId } = await searchParams
  const supabase = await getSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [seasonRes, fromGroupRes] = await Promise.all([
    supabase.from('seasons').select('id, name, status, competitions(name)').eq('id', seasonId).single(),
    groupId
      ? supabase.from('pick_groups').select('id, name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
  ])

  if (!seasonRes.data) notFound()
  const season = seasonRes.data
  const fromGroup = (fromGroupRes as any).data ?? null

  const { data: pgData } = await supabase
    .from('pick_group_members')
    .select('pick_groups!inner(id, name, pick_group_seasons!inner(season_id))')
    .eq('user_id', user.id)
    .eq('pick_groups.pick_group_seasons.season_id', seasonId)

  const participatingGroups = (pgData ?? [])
    .map((r: any) => r.pick_groups)
    .filter(Boolean) as { id: string; name: string }[]

  const pickGroupId: string | null =
    (groupId && participatingGroups.find(g => g.id === groupId))
      ? groupId
      : participatingGroups[0]?.id ?? null

  const activeGroup = participatingGroups.find(g => g.id === pickGroupId) ?? null
  const inGroup = !!pickGroupId

  const [roundsRes, matchesRes, matchPredsRes] = inGroup
    ? await Promise.all([
        supabase
          .from('rounds')
          .select('id, name, slug, sort_order, prediction_window')
          .eq('season_id', seasonId)
          .eq('type', 'knockout')
          .order('sort_order'),
        supabase
          .from('matches')
          .select(`
            id, kickoff_at, status, home_score, away_score, result_method, round_id,
            home_team:home_team_id(id, name, short_name, logo_url),
            away_team:away_team_id(id, name, short_name, logo_url)
          `)
          .in('round_id',
            (await supabase.from('rounds').select('id').eq('season_id', seasonId).eq('type', 'knockout')).data?.map(r => r.id) ?? []
          )
          .order('kickoff_at'),
        supabase.from('match_predictions')
          .select('match_id, home_score, away_score, predicted_method, points_exact, points_outcome, points_method')
          .eq('user_id', user.id)
          .eq('pick_group_id', pickGroupId!),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const rounds = roundsRes.data ?? []
  const competitionName = (season as any).competitions?.name

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-hero animate-hero-1 flex flex-col gap-2">
        {fromGroup && (
          <Link
            href={`/groups/${fromGroup.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-accent transition-colors"
          >
            ← {fromGroup.name}
          </Link>
        )}
        <div>
          <div className="text-sm text-slate-400 font-medium uppercase tracking-wide">{competitionName}</div>
          <h1 className="text-3xl font-black text-slate-100 mt-0.5">{season.name}</h1>
        </div>

        {activeGroup && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-sm text-slate-400">Predicting for:</span>
            {participatingGroups.length === 1 ? (
              <span className="text-sm font-semibold text-accent">{activeGroup.name}</span>
            ) : (
              participatingGroups.map(g => (
                <Link
                  key={g.id}
                  href={`/predict/${seasonId}/knockout?from=${g.id}`}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                    g.id === pickGroupId
                      ? 'bg-accent/20 text-accent border border-accent/40'
                      : 'border border-slate-600 text-slate-400 hover:border-accent hover:text-accent'
                  }`}
                >
                  {g.name}
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <details className="animate-hero animate-hero-2 rounded-xl border border-slate-700 bg-slate-800/60 group/rules">
        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-slate-700/30 transition-colors rounded-xl">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">How it works</h2>
          <span className="text-slate-400 text-xl font-light leading-none group-open/rules:hidden">+</span>
          <span className="text-slate-400 text-xl font-light leading-none hidden group-open/rules:block">−</span>
        </summary>
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-700 pt-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black text-accent">5 pts</span>
              <span className="text-sm font-semibold text-slate-200">Exact score</span>
              <span className="text-xs text-slate-400">Right scoreline for any match</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black text-accent">3 pts</span>
              <span className="text-sm font-semibold text-slate-200">Correct outcome</span>
              <span className="text-xs text-slate-400">Pick which team wins</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black text-accent">+1 pt</span>
              <span className="text-sm font-semibold text-slate-200">Correct method</span>
              <span className="text-xs text-slate-400">Regular, extra time, or penalties</span>
            </div>
          </div>
        </div>
      </details>

      {!inGroup ? (
        <div className="animate-hero animate-hero-3 rounded-xl border border-slate-700 bg-slate-800/60 p-8 flex flex-col items-center text-center gap-4">
          <div className="text-4xl">👥</div>
          <div>
            <div className="font-bold text-slate-200 text-lg">Join a group to start predicting</div>
            <div className="text-slate-400 text-sm mt-1 max-w-sm">
              Predictions are tied to your group. Create or join one, then add this event from the group page.
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/groups/new" className="px-5 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors">
              Create a group
            </Link>
            <Link href="/groups" className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-semibold text-sm hover:border-accent hover:text-accent transition-colors">
              My groups
            </Link>
          </div>
        </div>
      ) : (
        <KnockoutClient
          key={pickGroupId}
          pickGroupId={pickGroupId!}
          rounds={rounds as any}
          matches={(matchesRes.data ?? []) as any}
          existingPreds={(matchPredsRes.data ?? []) as any}
        />
      )}
    </div>
  )
}

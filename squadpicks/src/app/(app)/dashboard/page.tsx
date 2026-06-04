import { getSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const [seasonsResult, groupsResult] = await Promise.all([
    supabase
      .from('seasons')
      .select('*, competitions(name, slug, logo_url), rounds(slug, type, prediction_window)')
      .neq('status', 'completed')
      .order('year', { ascending: false }),
    user
      ? supabase
          .from('pick_group_members')
          .select('pick_groups(id, name, invite_code)')
          .eq('user_id', user.id)
          .limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const seasons  = seasonsResult.data ?? []
const myGroups = (groupsResult.data ?? []).map((m: any) => m.pick_groups).filter(Boolean)

  return (
    <div className="flex flex-col gap-10">

      {/* Header */}
      <div className="animate-hero animate-hero-1">
        <h1 className="text-3xl font-black text-slate-100">Dashboard</h1>
        <p className="text-slate-400 mt-1">Pick your predictions before kickoff — then check back to see the scores.</p>
      </div>

      {/* Active tournaments */}
      <section className="animate-hero animate-hero-2">
        <h2 className="text-lg font-bold text-slate-200 mb-4">{myGroups.length > 0 ? 'Make your picks' : 'Choose your Events'}</h2>
        {seasons.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-8 text-center text-slate-400">
            No active tournaments right now. Check back soon.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {seasons.map((season: any) => (
              <div key={season.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col gap-4 hover:border-slate-500 transition-colors">
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                    {season.competitions?.name}
                  </div>
                  <div className="text-xl font-bold text-slate-100 mt-0.5">{season.name}</div>
                  <div className="inline-flex items-center gap-1.5 mt-2">
                    <span className={`w-2 h-2 rounded-full ${season.status === 'active' ? 'bg-brand animate-pulse' : 'bg-yellow-400'}`} />
                    <span className="text-xs text-slate-400 capitalize">{season.status}</span>
                  </div>
                </div>
                <PlaylistLinks season={season as any} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My pick groups */}
      <section className="animate-hero animate-hero-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-200">My Groups</h2>
          <Link href="/groups" className="text-sm text-accent hover:text-accent/80 transition-colors">
            View all →
          </Link>
        </div>

        {myGroups.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-200">No groups yet</div>
              <div className="text-sm text-slate-400">Create a group and invite your squad with a code.</div>
            </div>
            <Link href="/groups/new" className="shrink-0 px-5 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors">
              Join or create a group
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {myGroups.map((g: any) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-4 hover:border-accent transition-colors"
              >
                <div className="font-semibold text-slate-200">{g.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Code: <span className="font-mono text-accent">{g.invite_code}</span>
                </div>
              </Link>
            ))}
            <Link
              href="/groups/new"
              className="rounded-xl border border-dashed border-slate-600 bg-transparent px-5 py-4 hover:border-accent transition-colors flex items-center justify-center text-slate-400 hover:text-accent text-sm font-medium"
            >
              + New group
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

type Round = { slug: string; type: string; prediction_window: string }

function PlaylistLinks({ season }: { season: { id: string; rounds: Round[] } }) {
  const rounds: Round[] = season.rounds ?? []

  const groupOpen    = rounds.some(r => r.slug === 'group_stage' && r.prediction_window === 'open')
  const seriesOpen   = rounds.some(r => r.slug === 'series'      && r.prediction_window === 'open')
  const knockoutOpen = rounds.some(r => r.type === 'knockout' && r.slug !== 'final' && r.slug !== 'series' && r.prediction_window === 'open')
  const finalOpen    = rounds.some(r => r.slug === 'final' && r.prediction_window === 'open')

  if (!groupOpen && !seriesOpen && !knockoutOpen && !finalOpen) {
    return <div className="text-sm text-slate-500 text-center py-2">Predictions opening soon.</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {seriesOpen && (
        <Link
          href={`/predict/${season.id}/series`}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div>
            <div className="font-semibold text-slate-200 group-hover:text-accent transition-colors">NBA Finals Series</div>
            <div className="text-xs text-slate-400">Pick game scores, series champion + in how many games</div>
          </div>
          <span className="text-slate-500 group-hover:text-accent transition-colors text-lg">→</span>
        </Link>
      )}
      {groupOpen && (
        <Link
          href={`/predict/${season.id}/group-stage`}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div>
            <div className="font-semibold text-slate-200 group-hover:text-accent transition-colors">Group Stage</div>
            <div className="text-xs text-slate-400">Pick scores for every match + predict final group standings</div>
          </div>
          <span className="text-slate-500 group-hover:text-accent transition-colors text-lg">→</span>
        </Link>
      )}
      {knockoutOpen && (
        <Link
          href={`/predict/${season.id}/knockout`}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div>
            <div className="font-semibold text-slate-200 group-hover:text-accent transition-colors">Knockout Bracket</div>
            <div className="text-xs text-slate-400">Pick winners from R32 through the Final</div>
          </div>
          <span className="text-slate-500 group-hover:text-accent transition-colors text-lg">→</span>
        </Link>
      )}
      {finalOpen && (
        <Link
          href={`/predict/${season.id}/final`}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-600 hover:border-accent hover:bg-accent/5 transition-all group"
        >
          <div>
            <div className="font-semibold text-slate-200 group-hover:text-accent transition-colors">Final</div>
            <div className="text-xs text-slate-400">Pick the score, winner + how it's decided</div>
          </div>
          <span className="text-slate-500 group-hover:text-accent transition-colors text-lg">→</span>
        </Link>
      )}
    </div>
  )
}

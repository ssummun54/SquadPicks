import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { KnockoutClient } from './_client'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ seasonId: string }>
}

type KnockoutClientProps = Parameters<typeof KnockoutClient>[0]

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Knockout Predictions' }
}

export default async function KnockoutPage({ params }: Props) {
  const { seasonId } = await params
  const supabase = await getSupabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [seasonRes, roundsRes, matchesRes, predsRes] = await Promise.all([
    supabase.from('seasons').select('id, name, status, competitions(name)').eq('id', seasonId).single(),

    supabase
      .from('rounds')
      .select('id, name, slug, sort_order, prediction_window')
      .eq('season_id', seasonId)
      .eq('type', 'knockout')
      .order('sort_order'),

    supabase
      .from('matches')
      .select(`
        id, kickoff_at, status, home_score, away_score, bracket_slot, round_id,
        home_team:home_team_id(id, name, short_name, logo_url, country_code),
        away_team:away_team_id(id, name, short_name, logo_url, country_code)
      `)
      .in('round_id',
        (await supabase.from('rounds').select('id').eq('season_id', seasonId).eq('type', 'knockout')).data?.map(r => r.id) ?? []
      )
      .order('kickoff_at'),

    supabase
      .from('bracket_predictions')
      .select('match_id, predicted_winner_id, predicted_home_score, predicted_away_score, predicted_result_method')
      .eq('user_id', user.id),
  ])

  if (!seasonRes.data) notFound()

  const rounds = roundsRes.data ?? []
  const isSingleFinal = rounds.length === 1 && rounds[0]?.slug === 'final'
  const competitionName = (seasonRes.data as { competitions?: { name?: string } | null }).competitions?.name

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="text-sm text-slate-400 font-medium">{competitionName}</div>
        <h1 className="text-3xl font-black text-slate-100">
          {seasonRes.data.name} — {isSingleFinal ? 'Final Prediction' : 'Knockout Bracket'}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          {isSingleFinal
            ? 'Predict the score, winner, and whether the final is decided in 90 minutes, extra time, or penalties.'
            : 'Pick the winner of each match. Points scale by round: R32=2, R16=3, QF=4, SF=5, Final=8.'}
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
          <span className="w-3 h-3 rounded-full bg-accent inline-block" />
          {isSingleFinal
            ? 'Your pick is hidden until kickoff.'
            : 'Your picks are hidden until the first match of each round kicks off.'}
        </div>
      </div>

      <KnockoutClient
        rounds={rounds}
        matches={(matchesRes.data ?? []) as unknown as KnockoutClientProps['matches']}
        existingPreds={(predsRes.data ?? []) as KnockoutClientProps['existingPreds']}
      />
    </div>
  )
}

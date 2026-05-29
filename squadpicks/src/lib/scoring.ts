// Client-side scoring preview — mirrors the SQL functions in schema.sql

export const ROUND_POINTS: Record<string, { winner: number; exact?: number; outcome?: number; position?: number; qualified?: number }> = {
  group_stage:   { exact: 3, outcome: 1, position: 2, qualified: 1, winner: 0 },
  round_of_32:   { winner: 2 },
  round_of_16:   { winner: 3 },
  quarter_final: { winner: 4 },
  semi_final:    { winner: 5 },
  third_place:   { winner: 3 },
  final:         { winner: 8 },
}

export function scoreMatchPrediction(
  predicted: { home: number; away: number },
  actual: { home: number; away: number },
  roundSlug: string
): { exact: number; outcome: number; total: number } {
  const rules = ROUND_POINTS[roundSlug]
  const exactPts  = rules?.exact   ?? 3
  const outcomePts = rules?.outcome ?? 1

  if (predicted.home === actual.home && predicted.away === actual.away) {
    return { exact: exactPts, outcome: 0, total: exactPts }
  }

  const predOutcome = outcome(predicted.home, predicted.away)
  const realOutcome = outcome(actual.home, actual.away)
  const outcomeCorrect = predOutcome === realOutcome ? outcomePts : 0
  return { exact: 0, outcome: outcomeCorrect, total: outcomeCorrect }
}

function outcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export function scoreGroupPrediction(
  predicted: number,
  actual: number,
  roundSlug = 'group_stage'
): { exact: number; qualified: number; total: number } {
  const rules = ROUND_POINTS[roundSlug]
  const exactPts    = rules?.position  ?? 2
  const qualPts     = rules?.qualified ?? 1

  if (predicted === actual) return { exact: exactPts, qualified: 0, total: exactPts }
  const qualCorrect = predicted <= 2 && actual <= 2 ? qualPts : 0
  return { exact: 0, qualified: qualCorrect, total: qualCorrect }
}

export function scoreBracketPrediction(
  predictedWinnerId: string,
  actualWinnerId: string,
  roundSlug: string
): number {
  const rules = ROUND_POINTS[roundSlug]
  const pts = rules?.winner ?? 2
  return predictedWinnerId === actualWinnerId ? pts : 0
}

export function pointsLabel(roundSlug: string): string {
  const r = ROUND_POINTS[roundSlug]
  if (!r) return ''
  const parts: string[] = []
  if (r.exact)    parts.push(`Exact score: ${r.exact}pts`)
  if (r.outcome)  parts.push(`Correct result: ${r.outcome}pt`)
  if (r.position) parts.push(`Correct position: ${r.position}pts`)
  if (r.qualified) parts.push(`Correct top-2: ${r.qualified}pt`)
  if (r.winner)   parts.push(`Correct winner: ${r.winner}pts`)
  return parts.join(' · ')
}

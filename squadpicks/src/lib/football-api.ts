// football-data.org v4 client
// Docs: https://www.football-data.org/documentation/quickstart
// Base URL: https://api.football-data.org/v4
// Header:   X-Auth-Token: <FOOTBALL_DATA_API_KEY>
//
// WC2026: competition code = "WC", season = 2026

const BASE = 'https://api.football-data.org/v4'

export const WC_CODE   = 'WC'
export const WC_SEASON = 2026

export const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED'])
export const LIVE_STATUSES     = new Set(['IN_PLAY', 'PAUSED', 'LIVE'])

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FDTeam {
  id:        number
  name:      string
  shortName: string
  tla:       string   // 3-letter abbreviation, e.g. "ESP"
  crest:     string   // logo URL
}

export interface FDMatch {
  id:      number
  utcDate: string    // ISO 8601
  status:  string    // SCHEDULED | TIMED | IN_PLAY | PAUSED | LIVE | FINISHED | AWARDED | POSTPONED | CANCELLED | SUSPENDED
  stage:   string    // GROUP_STAGE | LAST_32 | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL
  group:   string | null  // "GROUP_A" … "GROUP_L", null for knockout
  venue:   string | null
  homeTeam: FDTeam
  awayTeam: FDTeam
  score: {
    winner:     'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    duration:   'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
    fullTime:   { home: number | null; away: number | null }
    halfTime?:  { home: number | null; away: number | null }
    extraTime?: { home: number | null; away: number | null }
    penalties?: { home: number | null; away: number | null }
  }
}

export interface FDStandingEntry {
  position:    number
  team:        FDTeam
  playedGames: number
  points:      number
}

export interface FDStandingGroup {
  stage: string
  type:  string   // "TOTAL" | "HOME" | "AWAY"
  group: string   // "GROUP_A" … "GROUP_L"
  table: FDStandingEntry[]
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`football-data.org ${res.status}: ${url.pathname} — ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function getWCMatches(
  params: Record<string, string | number> = {}
): Promise<FDMatch[]> {
  const res = await apiFetch<{ matches: FDMatch[] }>(`/competitions/${WC_CODE}/matches`, {
    season: WC_SEASON,
    ...params,
  })
  return res.matches
}

// Fetch a single match by its football-data.org ID
export async function getMatchById(id: string | number): Promise<FDMatch> {
  return apiFetch<FDMatch>(`/matches/${id}`)
}

// ─── Standings ────────────────────────────────────────────────────────────────

// Returns only TOTAL standings (one entry per group), filtered to GROUP_STAGE
export async function getWCStandings(): Promise<FDStandingGroup[]> {
  const res = await apiFetch<{ standings: FDStandingGroup[] }>(
    `/competitions/${WC_CODE}/standings`,
    { season: WC_SEASON }
  )
  return res.standings.filter(s => s.type === 'TOTAL')
}

// Returns all teams in the WC2026 competition (includes crests/logos)
export async function getWCTeams(): Promise<FDTeam[]> {
  const res = await apiFetch<{ teams: FDTeam[] }>(
    `/competitions/${WC_CODE}/teams`,
    { season: WC_SEASON }
  )
  return res.teams
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// "GROUP_A" → "a"  |  null → null
export function groupLabelToSlug(group: string | null): string | null {
  if (!group) return null
  return group.replace(/^GROUP_/, '').toLowerCase()
}

// Map football-data.org stage → our rounds.slug
const STAGE_SLUG_MAP: Record<string, string> = {
  GROUP_STAGE:        'group_stage',
  LAST_32:            'round_of_32',
  LAST_16:            'round_of_16',
  QUARTER_FINALS:     'quarter_final',
  SEMI_FINALS:        'semi_final',
  THIRD_PLACE:        'third_place',
  THIRD_PLACE_MATCH:  'third_place',
  FINAL:              'final',
}

export function stageToRoundSlug(stage: string): string | null {
  return STAGE_SLUG_MAP[stage] ?? null
}

// Map football-data.org status → our matches.status
export function mapStatus(status: string): 'scheduled' | 'live' | 'completed' | 'postponed' {
  if (FINISHED_STATUSES.has(status)) return 'completed'
  if (LIVE_STATUSES.has(status))     return 'live'
  if (['SUSPENDED', 'POSTPONED', 'CANCELLED'].includes(status)) return 'postponed'
  return 'scheduled'
}

// Returns the UUID of the penalty winner, or null if no penalties were taken
export function getPenaltyWinnerId(
  match: FDMatch,
  homeTeamId: string,
  awayTeamId: string,
): string | null {
  if (match.score.duration !== 'PENALTY_SHOOTOUT') return null
  const ph = match.score.penalties?.home ?? null
  const pa = match.score.penalties?.away ?? null
  if (ph === null || pa === null) return null
  if (ph > pa) return homeTeamId
  if (pa > ph) return awayTeamId
  return null
}

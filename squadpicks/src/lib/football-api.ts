// api-football.com v3 client
// Docs: https://www.api-football.com/documentation-v3
// Base URL: https://v3.football.api-sports.io
// Header:   x-apisports-key: <FOOTBALL_API_KEY>
//
// WC2026: league=1, season=2026

const BASE = 'https://v3.football.api-sports.io'

export const WC_LEAGUE  = 1     // FIFA World Cup
export const WC_SEASON  = 2026

// Status codes that mean the match is fully finished
export const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO'])

// Status codes that mean the match is currently in play
export const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'])

export interface APIFixture {
  fixture: {
    id:     number
    date:   string      // ISO 8601
    status: { short: string; long: string; elapsed: number | null }
    venue:  { name: string | null; city: string | null }
  }
  league: {
    id:    number
    name:  string
    round: string       // e.g. "Group Stage - 1", "Round of 32 - 1"
  }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: { home: number | null; away: number | null }
  score: {
    fulltime:  { home: number | null; away: number | null }
    extratime: { home: number | null; away: number | null }
    penalty:   { home: number | null; away: number | null }
  }
}

async function apiFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY! },
    // Never use Next.js cache for live data
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`api-football error ${res.status}: ${url.pathname}`)

  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`api-football API error: ${JSON.stringify(json.errors)}`)
  }
  return json.response as T
}

// Fetch specific fixtures by their IDs (max 20 per request per API docs)
export async function getFixturesByIds(ids: string[]): Promise<APIFixture[]> {
  if (ids.length === 0) return []
  return apiFetch<APIFixture[]>('/fixtures', { ids: ids.join('-') })
}

// Fetch all WC2026 fixtures (optionally filtered by status)
export async function getWCFixtures(status?: string): Promise<APIFixture[]> {
  const params: Record<string, string | number> = {
    league: WC_LEAGUE,
    season: WC_SEASON,
  }
  if (status) params.status = status

  return apiFetch<APIFixture[]>('/fixtures', params)
}

// Fetch only finished WC2026 fixtures
export async function getFinishedWCFixtures(): Promise<APIFixture[]> {
  // FT=full time, AET=after extra time, PEN=after penalties
  return apiFetch<APIFixture[]>('/fixtures', {
    league:  WC_LEAGUE,
    season:  WC_SEASON,
    status:  'FT-AET-PEN',
  })
}

// Fetch fixtures for a specific date (YYYY-MM-DD) — useful for live updates on match days
export async function getWCFixturesByDate(date: string): Promise<APIFixture[]> {
  return apiFetch<APIFixture[]>('/fixtures', {
    league: WC_LEAGUE,
    season: WC_SEASON,
    date,
  })
}

// Determine the penalty winner team ID given an APIFixture and our home/away team UUIDs
export function getPenaltyWinnerId(
  fixture: APIFixture,
  homeTeamId: string,
  awayTeamId: string,
): string | null {
  const ph = fixture.score.penalty.home
  const pa = fixture.score.penalty.away
  if (ph === null || pa === null) return null
  if (ph > pa) return homeTeamId
  if (pa > ph) return awayTeamId
  return null
}

// Map api-football status → our matches.status
export function mapStatus(short: string): 'scheduled' | 'live' | 'completed' | 'postponed' {
  if (FINISHED_STATUSES.has(short)) return 'completed'
  if (LIVE_STATUSES.has(short))    return 'live'
  if (short === 'PST' || short === 'CANC' || short === 'ABD') return 'postponed'
  return 'scheduled'
}

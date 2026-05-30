export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// Each table must include Relationships: [] for @supabase/postgrest-js type inference to work
type R = never[]

export interface Database {
  public: {
    Tables: {
      sports: {
        Row:    { id: string; name: string; slug: string }
        Insert: { id?: string; name: string; slug: string }
        Update: Partial<{ name: string; slug: string }>
        Relationships: R
      }
      competitions: {
        Row:    { id: string; sport_id: string; name: string; short_name: string | null; slug: string; logo_url: string | null; host_country: string | null }
        Insert: { id?: string; sport_id: string; name: string; short_name?: string | null; slug: string; logo_url?: string | null; host_country?: string | null }
        Update: Partial<{ sport_id: string; name: string; short_name: string | null; slug: string; logo_url: string | null; host_country: string | null }>
        Relationships: R
      }
      seasons: {
        Row:    { id: string; competition_id: string; name: string; year: number | null; status: 'upcoming' | 'active' | 'completed' }
        Insert: { id?: string; competition_id: string; name: string; year?: number | null; status?: 'upcoming' | 'active' | 'completed' }
        Update: Partial<{ name: string; year: number | null; status: 'upcoming' | 'active' | 'completed' }>
        Relationships: R
      }
      teams: {
        Row:    { id: string; sport_id: string; name: string; short_name: string | null; slug: string; logo_url: string | null; country_code: string | null }
        Insert: { id?: string; sport_id: string; name: string; short_name?: string | null; slug: string; logo_url?: string | null; country_code?: string | null }
        Update: Partial<{ name: string; short_name: string | null; slug: string; logo_url: string | null; country_code: string | null }>
        Relationships: R
      }
      rounds: {
        Row:    { id: string; season_id: string; name: string; slug: string; type: 'group' | 'knockout'; sort_order: number; prediction_window: 'closed' | 'open' | 'locked' }
        Insert: { id?: string; season_id: string; name: string; slug: string; type: 'group' | 'knockout'; sort_order?: number; prediction_window?: 'closed' | 'open' | 'locked' }
        Update: Partial<{ name: string; slug: string; type: 'group' | 'knockout'; sort_order: number; prediction_window: 'closed' | 'open' | 'locked' }>
        Relationships: R
      }
      tournament_groups: {
        Row:    { id: string; round_id: string; name: string; slug: string }
        Insert: { id?: string; round_id: string; name: string; slug: string }
        Update: Partial<{ name: string; slug: string }>
        Relationships: R
      }
      group_teams: {
        Row:    { id: string; group_id: string; team_id: string; final_position: number | null }
        Insert: { id?: string; group_id: string; team_id: string; final_position?: number | null }
        Update: Partial<{ final_position: number | null }>
        Relationships: R
      }
      matches: {
        Row: {
          id: string; round_id: string; group_id: string | null
          home_team_id: string | null; away_team_id: string | null
          kickoff_at: string; home_score: number | null; away_score: number | null
          penalty_winner_id: string | null
          result_method: '90' | 'ET' | 'PK' | null
          status: 'scheduled' | 'live' | 'completed' | 'postponed'
          venue: string | null; match_day: number | null; bracket_slot: string | null
          external_id: string | null
        }
        Insert: {
          id?: string; round_id: string; group_id?: string | null
          home_team_id?: string | null; away_team_id?: string | null
          kickoff_at: string; home_score?: number | null; away_score?: number | null
          penalty_winner_id?: string | null
          result_method?: '90' | 'ET' | 'PK' | null
          status?: 'scheduled' | 'live' | 'completed' | 'postponed'
          venue?: string | null; match_day?: number | null; bracket_slot?: string | null
          external_id?: string | null
        }
        Update: Partial<{
          group_id: string | null; home_team_id: string | null; away_team_id: string | null
          kickoff_at: string; home_score: number | null; away_score: number | null
          penalty_winner_id: string | null
          result_method: '90' | 'ET' | 'PK' | null
          status: 'scheduled' | 'live' | 'completed' | 'postponed'
          venue: string | null; match_day: number | null; bracket_slot: string | null
          external_id: string | null
        }>
        Relationships: R
      }
      profiles: {
        Row:    { id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string }
        Insert: { id: string; username: string; display_name?: string | null; avatar_url?: string | null }
        Update: Partial<{ username: string; display_name: string | null; avatar_url: string | null }>
        Relationships: R
      }
      pick_groups: {
        Row:    { id: string; name: string; invite_code: string; created_by: string; created_at: string }
        Insert: { id?: string; name: string; invite_code?: string; created_by: string }
        Update: Partial<{ name: string }>
        Relationships: R
      }
      pick_group_seasons: {
        Row:    { pick_group_id: string; season_id: string; joined_at: string }
        Insert: { pick_group_id: string; season_id: string }
        Update: never
        Relationships: R
      }
      pick_group_members: {
        Row:    { pick_group_id: string; user_id: string; role: 'admin' | 'member'; joined_at: string }
        Insert: { pick_group_id: string; user_id: string; role?: 'admin' | 'member' }
        Update: Partial<{ role: 'admin' | 'member' }>
        Relationships: R
      }
      match_predictions: {
        Row:    { id: string; user_id: string; match_id: string; pick_group_id: string | null; home_score: number; away_score: number; predicted_method: '90' | 'ET' | 'PK' | null; points_exact: number; points_outcome: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; match_id: string; pick_group_id?: string | null; home_score: number; away_score: number; predicted_method?: '90' | 'ET' | 'PK' | null }
        Update: Partial<{ home_score: number; away_score: number; pick_group_id: string | null; predicted_method: '90' | 'ET' | 'PK' | null }>
        Relationships: R
      }
      group_predictions: {
        Row:    { id: string; user_id: string; group_id: string; team_id: string; pick_group_id: string | null; predicted_position: number; points_exact_position: number; points_qualified: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; group_id: string; team_id: string; pick_group_id?: string | null; predicted_position: number }
        Update: Partial<{ predicted_position: number; pick_group_id: string | null }>
        Relationships: R
      }
      bracket_predictions: {
        Row:    { id: string; user_id: string; match_id: string; pick_group_id: string | null; predicted_winner_id: string; predicted_home_score: number | null; predicted_away_score: number | null; predicted_result_method: '90' | 'ET' | 'PK' | null; points_winner: number; points_score: number; points_method: number; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; match_id: string; pick_group_id?: string | null; predicted_winner_id: string; predicted_home_score?: number | null; predicted_away_score?: number | null; predicted_result_method?: '90' | 'ET' | 'PK' | null }
        Update: Partial<{ predicted_winner_id: string; pick_group_id: string | null; predicted_home_score: number | null; predicted_away_score: number | null; predicted_result_method: '90' | 'ET' | 'PK' | null }>
        Relationships: R
      }
      scoring_rules: {
        Row:    { id: string; season_id: string; round_slug: string; exact_score_points: number; correct_outcome_points: number; exact_position_points: number; qualified_points: number; correct_winner_points: number; correct_method_points: number }
        Insert: { id?: string; season_id: string; round_slug: string; exact_score_points?: number; correct_outcome_points?: number; exact_position_points?: number; qualified_points?: number; correct_winner_points?: number; correct_method_points?: number }
        Update: Partial<{ exact_score_points: number; correct_outcome_points: number; exact_position_points: number; qualified_points: number; correct_winner_points: number; correct_method_points: number }>
        Relationships: R
      }
    }
    Views: {
      season_leaderboard: {
        Row: { user_id: string; username: string; display_name: string | null; avatar_url: string | null; season_id: string; total_points: number; rank: number }
        Relationships: R
      }
      pick_group_leaderboard: {
        Row: { user_id: string; username: string; display_name: string | null; avatar_url: string | null; pick_group_id: string; season_id: string; total_points: number; rank: number }
        Relationships: R
      }
    }
    Functions: {
      score_match_predictions:   { Args: { p_match_id: string }; Returns: undefined }
      score_group_predictions:   { Args: { p_group_id: string }; Returns: undefined }
      score_bracket_predictions: { Args: { p_match_id: string }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ─── Convenience aliases ──────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Sport            = Tables<'sports'>
export type Competition      = Tables<'competitions'>
export type Season           = Tables<'seasons'>
export type Team             = Tables<'teams'>
export type Round            = Tables<'rounds'>
export type TournamentGroup  = Tables<'tournament_groups'>
export type GroupTeam        = Tables<'group_teams'>
export type Match            = Tables<'matches'>
export type Profile          = Tables<'profiles'>
export type PickGroup        = Tables<'pick_groups'>
export type PickGroupMember  = Tables<'pick_group_members'>
export type MatchPrediction  = Tables<'match_predictions'>
export type GroupPrediction  = Tables<'group_predictions'>
export type BracketPrediction = Tables<'bracket_predictions'>
export type ScoringRule      = Tables<'scoring_rules'>

export type LeaderboardEntry = Database['public']['Views']['season_leaderboard']['Row']

// ─── Enriched types (with joins) ─────────────────────────────

export type MatchWithTeams = Match & {
  home_team: Team | null
  away_team: Team | null
}

export type GroupWithTeams = TournamentGroup & {
  group_teams: (GroupTeam & { team: Team })[]
}

export type MatchWithPrediction = MatchWithTeams & {
  my_prediction: MatchPrediction | null
}

export type GroupWithPrediction = GroupWithTeams & {
  my_predictions: GroupPrediction[]
}

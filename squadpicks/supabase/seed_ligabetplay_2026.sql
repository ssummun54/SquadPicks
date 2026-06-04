-- ============================================================
-- SquadPicks Seed — Liga BetPlay Dimayor Final 2026
-- Run AFTER schema.sql
-- Leg 1: Junior (home) vs Atlético Nacional — Jun 2, 2026 8:30 PM COT (01:30 UTC Jun 3)
-- Leg 2: Atlético Nacional (home) vs Junior  — Jun 8, 2026 TBD     (01:30 UTC Jun 9 placeholder)
-- ============================================================

-- ============================================================
-- COMPETITION
-- ============================================================
insert into competitions (id, sport_id, name, short_name, slug, host_country) values
  (
    '00000000-0000-0000-0005-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Liga BetPlay Dimayor', 'Liga BetPlay', 'liga-betplay-dimayor',
    'Colombia'
  )
on conflict (slug) do nothing;

-- ============================================================
-- SEASON
-- ============================================================
insert into seasons (id, competition_id, name, year, status) values
  (
    '00000000-0000-0000-0005-000000000100',
    '00000000-0000-0000-0005-000000000010',
    'Liga BetPlay 2026 Finalización', 2026, 'active'
  )
on conflict do nothing;

-- ============================================================
-- ROUND
-- ============================================================
insert into rounds (id, season_id, name, slug, type, sort_order, prediction_window) values
  (
    '00000000-0000-0005-0001-000000000000',
    '00000000-0000-0000-0005-000000000100',
    'Final', 'final', 'knockout', 1, 'open'
  )
on conflict (season_id, slug) do nothing;

-- ============================================================
-- SCORING
-- exact score: 3pts | correct outcome: 1pt | trophy winner: 5pts
-- ============================================================
insert into scoring_rules (season_id, round_slug, exact_score_points, correct_outcome_points, exact_position_points, qualified_points, correct_winner_points) values
  ('00000000-0000-0000-0005-000000000100', 'final', 3, 1, 0, 0, 5)
on conflict (season_id, round_slug) do nothing;

-- ============================================================
-- TEAMS
-- ============================================================
insert into teams (id, sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', 'Junior FC',          'Junior',   'junior-fc',         'COL'),
  ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000001', 'Atlético Nacional',  'Nacional', 'atletico-nacional',  'COL')
on conflict (sport_id, slug) do nothing;

-- ============================================================
-- MATCHES
-- ============================================================
insert into matches (id, round_id, home_team_id, away_team_id, kickoff_at, status, match_day, bracket_slot, venue) values
  (
    '00000000-0000-0005-0001-000000000001',
    '00000000-0000-0005-0001-000000000000',
    '00000000-0000-0000-0005-000000000001',  -- Junior (home)
    '00000000-0000-0000-0005-000000000002',  -- Atlético Nacional
    '2026-06-03 01:30:00+00',               -- Jun 2 8:30 PM COT
    'scheduled',
    1,
    'FINAL_LEG1',
    'Estadio Metropolitano Roberto Meléndez, Barranquilla'
  ),
  (
    '00000000-0000-0005-0001-000000000002',
    '00000000-0000-0005-0001-000000000000',
    '00000000-0000-0000-0005-000000000002',  -- Atlético Nacional (home)
    '00000000-0000-0000-0005-000000000001',  -- Junior
    '2026-06-09 01:30:00+00',               -- Jun 8 8:30 PM COT (placeholder — update when confirmed)
    'scheduled',
    2,
    'FINAL_LEG2',
    'Estadio Atanasio Girardot, Medellín'
  )
on conflict do nothing;

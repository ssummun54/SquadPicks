-- ============================================================
-- SquadPicks Seed — 2026 NBA Finals
-- New York Knicks vs San Antonio Spurs
-- All times 8:30 PM ET = 00:30 UTC next day
-- ============================================================

-- Basketball sport
insert into sports (id, name, slug) values
  ('00000000-0000-0000-0000-000000000002', 'Basketball', 'basketball')
on conflict (slug) do nothing;

-- Competition
insert into competitions (id, sport_id, name, short_name, slug, host_country) values
  (
    '00000000-0000-0000-0006-000000000010',
    '00000000-0000-0000-0000-000000000002',
    'NBA Finals', 'NBA Finals', 'nba-finals', 'USA'
  )
on conflict (slug) do nothing;

-- Season
insert into seasons (id, competition_id, name, year, status) values
  (
    '00000000-0000-0000-0006-000000000100',
    '00000000-0000-0000-0006-000000000010',
    'NBA Finals 2026', 2026, 'active'
  )
on conflict do nothing;

-- Round (series format)
insert into rounds (id, season_id, name, slug, type, sort_order, prediction_window) values
  (
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000100',
    'Finals', 'series', 'knockout', 1, 'open'
  )
on conflict (season_id, slug) do nothing;

-- Scoring: game predictions 3pts exact / 1pt correct outcome
--          series winner: 5pts, correct games: 3pts bonus (stored in correct_winner_points / exact_position_points)
-- correct game winner: 1pt | series champion: 3pts | correct games: 5pts bonus
insert into scoring_rules (season_id, round_slug, exact_score_points, correct_outcome_points, exact_position_points, qualified_points, correct_winner_points) values
  ('00000000-0000-0000-0006-000000000100', 'series', 0, 1, 5, 0, 3)
on conflict (season_id, round_slug) do nothing;

-- Teams
insert into teams (id, sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-000000000002', 'New York Knicks',    'Knicks', 'new-york-knicks',    'USA'),
  ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0000-000000000002', 'San Antonio Spurs',  'Spurs',  'san-antonio-spurs',  'USA')
on conflict (sport_id, slug) do nothing;

-- ============================================================
-- GAMES  (home team listed first)
-- Games 1, 2, 5, 7 → Knicks home (Madison Square Garden)
-- Games 3, 4, 6   → Spurs home (Frost Bank Center)
-- ============================================================
insert into matches (id, round_id, home_team_id, away_team_id, kickoff_at, home_score, away_score, status, match_day, bracket_slot, venue) values
  -- Game 1 (completed)
  (
    '00000000-0000-0006-0001-000000000001',
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000001',  -- Knicks home
    '00000000-0000-0000-0006-000000000002',  -- Spurs away
    '2026-06-04 00:30:00+00',
    105, 95,
    'completed', 1, 'SERIES_G1',
    'Madison Square Garden, New York'
  ),
  -- Game 2
  (
    '00000000-0000-0006-0001-000000000002',
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000001',  -- Knicks home
    '00000000-0000-0000-0006-000000000002',
    '2026-06-06 00:30:00+00',
    null, null,
    'scheduled', 2, 'SERIES_G2',
    'Madison Square Garden, New York'
  ),
  -- Game 3 (Spurs home)
  (
    '00000000-0000-0006-0001-000000000003',
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000002',  -- Spurs home
    '00000000-0000-0000-0006-000000000001',
    '2026-06-09 00:30:00+00',
    null, null,
    'scheduled', 3, 'SERIES_G3',
    'Frost Bank Center, San Antonio'
  ),
  -- Game 4 (Spurs home)
  (
    '00000000-0000-0006-0001-000000000004',
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000002',
    '00000000-0000-0000-0006-000000000001',
    '2026-06-11 00:30:00+00',
    null, null,
    'scheduled', 4, 'SERIES_G4',
    'Frost Bank Center, San Antonio'
  ),
  -- Game 5 if necessary (Knicks home)
  (
    '00000000-0000-0006-0001-000000000005',
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000001',
    '00000000-0000-0000-0006-000000000002',
    '2026-06-14 00:30:00+00',
    null, null,
    'scheduled', 5, 'SERIES_G5',
    'Madison Square Garden, New York'
  ),
  -- Game 6 if necessary (Spurs home)
  (
    '00000000-0000-0006-0001-000000000006',
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000002',
    '00000000-0000-0000-0006-000000000001',
    '2026-06-17 00:30:00+00',
    null, null,
    'scheduled', 6, 'SERIES_G6',
    'Frost Bank Center, San Antonio'
  ),
  -- Game 7 if necessary (Knicks home)
  (
    '00000000-0000-0006-0001-000000000007',
    '00000000-0000-0006-0001-000000000000',
    '00000000-0000-0000-0006-000000000001',
    '00000000-0000-0000-0006-000000000002',
    '2026-06-20 00:30:00+00',
    null, null,
    'scheduled', 7, 'SERIES_G7',
    'Madison Square Garden, New York'
  )
on conflict do nothing;

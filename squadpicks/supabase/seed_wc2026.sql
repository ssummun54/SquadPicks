-- ============================================================
-- SquadPicks Seed — FIFA World Cup 2026
-- Run AFTER schema.sql
-- ============================================================

-- ============================================================
-- SPORT
-- ============================================================
insert into sports (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'Football', 'football')
on conflict (slug) do nothing;

-- ============================================================
-- COMPETITION
-- ============================================================
insert into competitions (id, sport_id, name, short_name, slug) values
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'FIFA World Cup',
    'World Cup',
    'fifa-world-cup'
  )
on conflict (slug) do nothing;

-- ============================================================
-- SEASON  (2026)
-- ============================================================
insert into seasons (id, competition_id, name, year, status) values
  (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000010',
    'FIFA World Cup 2026',
    2026,
    'upcoming'
  )
on conflict do nothing;

-- ============================================================
-- ROUNDS
-- ============================================================
insert into rounds (id, season_id, name, slug, type, sort_order, prediction_window) values
  ('00000000-0000-0000-0001-000000000000', '00000000-0000-0000-0000-000000000100', 'Group Stage',      'group_stage',    'group',    1, 'open'),
  ('00000000-0000-0000-0002-000000000000', '00000000-0000-0000-0000-000000000100', 'Round of 32',      'round_of_32',    'knockout', 2, 'closed'),
  ('00000000-0000-0000-0003-000000000000', '00000000-0000-0000-0000-000000000100', 'Round of 16',      'round_of_16',    'knockout', 3, 'closed'),
  ('00000000-0000-0000-0004-000000000000', '00000000-0000-0000-0000-000000000100', 'Quarter-finals',   'quarter_final',  'knockout', 4, 'closed'),
  ('00000000-0000-0000-0005-000000000000', '00000000-0000-0000-0000-000000000100', 'Semi-finals',      'semi_final',     'knockout', 5, 'closed'),
  ('00000000-0000-0000-0006-000000000000', '00000000-0000-0000-0000-000000000100', 'Third Place',      'third_place',    'knockout', 6, 'closed'),
  ('00000000-0000-0000-0007-000000000000', '00000000-0000-0000-0000-000000000100', 'Final',            'final',          'knockout', 7, 'closed')
on conflict (season_id, slug) do nothing;

-- ============================================================
-- TOURNAMENT GROUPS  (A–L, 12 groups of 4)
-- ============================================================
insert into tournament_groups (id, round_id, name, slug) values
  ('00000000-0000-0001-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group A', 'a'),
  ('00000000-0000-0002-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group B', 'b'),
  ('00000000-0000-0003-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group C', 'c'),
  ('00000000-0000-0004-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group D', 'd'),
  ('00000000-0000-0005-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group E', 'e'),
  ('00000000-0000-0006-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group F', 'f'),
  ('00000000-0000-0007-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group G', 'g'),
  ('00000000-0000-0008-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group H', 'h'),
  ('00000000-0000-0009-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group I', 'i'),
  ('00000000-0000-000a-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group J', 'j'),
  ('00000000-0000-000b-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group K', 'k'),
  ('00000000-0000-000c-0000-000000000000', '00000000-0000-0000-0001-000000000000', 'Group L', 'l')
on conflict (round_id, slug) do nothing;

-- ============================================================
-- SCORING RULES
-- ============================================================
insert into scoring_rules (season_id, round_slug, exact_score_points, correct_outcome_points, exact_position_points, qualified_points, correct_winner_points) values
  ('00000000-0000-0000-0000-000000000100', 'group_stage',   3, 1, 2, 1, 0),
  ('00000000-0000-0000-0000-000000000100', 'round_of_32',   0, 0, 0, 0, 2),
  ('00000000-0000-0000-0000-000000000100', 'round_of_16',   0, 0, 0, 0, 3),
  ('00000000-0000-0000-0000-000000000100', 'quarter_final', 0, 0, 0, 0, 4),
  ('00000000-0000-0000-0000-000000000100', 'semi_final',    0, 0, 0, 0, 5),
  ('00000000-0000-0000-0000-000000000100', 'third_place',   0, 0, 0, 0, 3),
  ('00000000-0000-0000-0000-000000000100', 'final',         0, 0, 0, 0, 8)
on conflict (season_id, round_slug) do nothing;

-- ============================================================
-- TEAMS  (48 qualified nations — fill country_code & logo_url later)
-- NOTE: Actual group assignments are TBD until official draw.
--       This seeds all teams; add them to group_teams after the draw.
-- ============================================================

-- UEFA (Europe) — 16 spots
insert into teams (sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0000-000000000001', 'Germany',        'GER', 'germany',        'GER'),
  ('00000000-0000-0000-0000-000000000001', 'France',         'FRA', 'france',         'FRA'),
  ('00000000-0000-0000-0000-000000000001', 'Spain',          'ESP', 'spain',          'ESP'),
  ('00000000-0000-0000-0000-000000000001', 'England',        'ENG', 'england',        'ENG'),
  ('00000000-0000-0000-0000-000000000001', 'Portugal',       'POR', 'portugal',       'POR'),
  ('00000000-0000-0000-0000-000000000001', 'Netherlands',    'NED', 'netherlands',    'NED'),
  ('00000000-0000-0000-0000-000000000001', 'Belgium',        'BEL', 'belgium',        'BEL'),
  ('00000000-0000-0000-0000-000000000001', 'Italy',          'ITA', 'italy',          'ITA'),
  ('00000000-0000-0000-0000-000000000001', 'Croatia',        'CRO', 'croatia',        'CRO'),
  ('00000000-0000-0000-0000-000000000001', 'Austria',        'AUT', 'austria',        'AUT'),
  ('00000000-0000-0000-0000-000000000001', 'Switzerland',    'SUI', 'switzerland',    'SUI'),
  ('00000000-0000-0000-0000-000000000001', 'Denmark',        'DEN', 'denmark',        'DEN'),
  ('00000000-0000-0000-0000-000000000001', 'Serbia',         'SRB', 'serbia',         'SRB'),
  ('00000000-0000-0000-0000-000000000001', 'Hungary',        'HUN', 'hungary',        'HUN'),
  ('00000000-0000-0000-0000-000000000001', 'Slovakia',       'SVK', 'slovakia',       'SVK'),
  ('00000000-0000-0000-0000-000000000001', 'Scotland',       'SCO', 'scotland',       'SCO')
on conflict (sport_id, slug) do nothing;

-- CONMEBOL (South America) — 6 spots
insert into teams (sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0000-000000000001', 'Brazil',       'BRA', 'brazil',       'BRA'),
  ('00000000-0000-0000-0000-000000000001', 'Argentina',    'ARG', 'argentina',    'ARG'),
  ('00000000-0000-0000-0000-000000000001', 'Colombia',     'COL', 'colombia',     'COL'),
  ('00000000-0000-0000-0000-000000000001', 'Uruguay',      'URU', 'uruguay',      'URU'),
  ('00000000-0000-0000-0000-000000000001', 'Ecuador',      'ECU', 'ecuador',      'ECU'),
  ('00000000-0000-0000-0000-000000000001', 'Venezuela',    'VEN', 'venezuela',    'VEN')
on conflict (sport_id, slug) do nothing;

-- CONCACAF (North/Central America + Caribbean) — 6 spots + hosts
insert into teams (sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0000-000000000001', 'USA',           'USA', 'usa',          'USA'),
  ('00000000-0000-0000-0000-000000000001', 'Mexico',        'MEX', 'mexico',       'MEX'),
  ('00000000-0000-0000-0000-000000000001', 'Canada',        'CAN', 'canada',       'CAN'),
  ('00000000-0000-0000-0000-000000000001', 'Costa Rica',    'CRC', 'costa-rica',   'CRC'),
  ('00000000-0000-0000-0000-000000000001', 'Panama',        'PAN', 'panama',       'PAN'),
  ('00000000-0000-0000-0000-000000000001', 'Honduras',      'HON', 'honduras',     'HON')
on conflict (sport_id, slug) do nothing;

-- CAF (Africa) — 9 spots
insert into teams (sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0000-000000000001', 'Morocco',         'MAR', 'morocco',         'MAR'),
  ('00000000-0000-0000-0000-000000000001', 'Senegal',         'SEN', 'senegal',         'SEN'),
  ('00000000-0000-0000-0000-000000000001', 'Nigeria',         'NGA', 'nigeria',         'NGA'),
  ('00000000-0000-0000-0000-000000000001', 'Cameroon',        'CMR', 'cameroon',        'CMR'),
  ('00000000-0000-0000-0000-000000000001', 'Egypt',           'EGY', 'egypt',           'EGY'),
  ('00000000-0000-0000-0000-000000000001', 'South Africa',    'RSA', 'south-africa',    'RSA'),
  ('00000000-0000-0000-0000-000000000001', 'DR Congo',        'COD', 'dr-congo',        'COD'),
  ('00000000-0000-0000-0000-000000000001', 'Ghana',           'GHA', 'ghana',           'GHA'),
  ('00000000-0000-0000-0000-000000000001', 'Côte d''Ivoire',  'CIV', 'cote-divoire',    'CIV')
on conflict (sport_id, slug) do nothing;

-- AFC (Asia) — 8 spots
insert into teams (sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0000-000000000001', 'Japan',         'JPN', 'japan',          'JPN'),
  ('00000000-0000-0000-0000-000000000001', 'South Korea',   'KOR', 'south-korea',    'KOR'),
  ('00000000-0000-0000-0000-000000000001', 'Australia',     'AUS', 'australia',      'AUS'),
  ('00000000-0000-0000-0000-000000000001', 'Saudi Arabia',  'KSA', 'saudi-arabia',   'KSA'),
  ('00000000-0000-0000-0000-000000000001', 'Iran',          'IRN', 'iran',           'IRN'),
  ('00000000-0000-0000-0000-000000000001', 'Iraq',          'IRQ', 'iraq',           'IRQ'),
  ('00000000-0000-0000-0000-000000000001', 'Jordan',        'JOR', 'jordan',         'JOR'),
  ('00000000-0000-0000-0000-000000000001', 'Uzbekistan',    'UZB', 'uzbekistan',     'UZB')
on conflict (sport_id, slug) do nothing;

-- OFC (Oceania) — 1 spot
insert into teams (sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0000-000000000001', 'New Zealand', 'NZL', 'new-zealand', 'NZL')
on conflict (sport_id, slug) do nothing;

-- Remaining 2 spots TBD (intercontinental playoffs) — placeholders
insert into teams (sport_id, name, short_name, slug, country_code) values
  ('00000000-0000-0000-0000-000000000001', 'Playoff 1 Winner', 'PO1', 'playoff-1', null),
  ('00000000-0000-0000-0000-000000000001', 'Playoff 2 Winner', 'PO2', 'playoff-2', null)
on conflict (sport_id, slug) do nothing;

-- ============================================================
-- NOTE: group_teams and matches must be populated after the
-- official draw and schedule release.
-- Use the Supabase dashboard or a separate admin script.
-- ============================================================

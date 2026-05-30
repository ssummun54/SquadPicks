-- ============================================================
-- SquadPicks Seed — UEFA Champions League Final 2025-26
-- Run AFTER schema.sql
-- ============================================================

insert into competitions (id, sport_id, name, short_name, slug) values
  (
    '00000000-0000-0000-0002-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'UEFA Champions League', 'Champions League', 'uefa-champions-league'
  )
on conflict (slug) do nothing;

insert into seasons (id, competition_id, name, year, status) values
  (
    '00000000-0000-0000-0002-000000000100',
    '00000000-0000-0000-0002-000000000010',
    'UEFA Champions League 2025-26', 2025, 'upcoming'
  )
on conflict do nothing;

insert into rounds (id, season_id, name, slug, type, sort_order, prediction_window) values
  ('00000000-0000-0002-0001-000000000000', '00000000-0000-0000-0002-000000000100', 'Final', 'final', 'knockout', 1, 'open')
on conflict (season_id, slug) do nothing;

-- 5pts exact score, 3pts correct outcome, +2pts bonus for correct method (90/ET/PKs)
insert into scoring_rules (season_id, round_slug, exact_score_points, correct_outcome_points, exact_position_points, qualified_points, correct_winner_points) values
  ('00000000-0000-0000-0002-000000000100', 'final', 5, 3, 0, 0, 2)
on conflict (season_id, round_slug) do nothing;

-- NOTE: Run "Seed CL Final from API" in admin panel to populate the match.

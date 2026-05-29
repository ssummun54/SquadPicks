-- ============================================================
-- SquadPicks Database Schema
-- Multi-sport prediction game — v1
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- SPORTS
-- ============================================================

create table sports (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ============================================================
-- COMPETITIONS
-- ============================================================

create table competitions (
  id           uuid primary key default gen_random_uuid(),
  sport_id     uuid not null references sports(id) on delete restrict,
  name         text not null,
  short_name   text,
  slug         text not null unique,
  logo_url     text,
  host_country text  -- 'International' for world cups, country name for domestic leagues
);

-- ============================================================
-- SEASONS
-- ============================================================

create table seasons (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references competitions(id) on delete restrict,
  name             text not null,
  year             int,
  status           text not null default 'upcoming',
  constraint seasons_status_check check (status in ('upcoming', 'active', 'completed'))
);

-- ============================================================
-- TEAMS
-- ============================================================

create table teams (
  id           uuid primary key default gen_random_uuid(),
  sport_id     uuid not null references sports(id) on delete restrict,
  name         text not null,
  short_name   text,
  slug         text not null,
  logo_url     text,
  country_code char(3),
  unique (sport_id, slug)
);

-- ============================================================
-- TOURNAMENT STRUCTURE
-- ============================================================

-- Rounds: group_stage, round_of_32, round_of_16, quarter_final, semi_final, third_place, final
create table rounds (
  id                uuid primary key default gen_random_uuid(),
  season_id         uuid not null references seasons(id) on delete cascade,
  name              text not null,
  slug              text not null,   -- 'group_stage', 'round_of_16', etc.
  type              text not null,
  constraint rounds_type_check check (type in ('group', 'knockout')),
  sort_order        int  not null default 0,
  prediction_window text not null default 'closed',
  constraint rounds_window_check check (prediction_window in ('closed', 'open', 'locked')),
  unique (season_id, slug)
);

-- Groups within a round (Group A–L for 2026 World Cup)
create table tournament_groups (
  id       uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  name     text not null,  -- 'Group A'
  slug     text not null,  -- 'a'
  unique (round_id, slug)
);

-- Teams assigned to groups; final_position filled after group stage
create table group_teams (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references tournament_groups(id) on delete cascade,
  team_id        uuid not null references teams(id) on delete restrict,
  final_position int,  -- 1–4, set when group stage is complete
  unique (group_id, team_id)
);

-- ============================================================
-- MATCHES
-- ============================================================

create table matches (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references rounds(id) on delete cascade,
  group_id      uuid references tournament_groups(id),  -- null for knockout
  home_team_id  uuid references teams(id),
  away_team_id  uuid references teams(id),
  kickoff_at    timestamptz not null,
  home_score    int,
  away_score    int,
  penalty_winner_id uuid references teams(id),  -- set for knockout draws decided by penalties
  status        text not null default 'scheduled',
  constraint matches_status_check check (status in ('scheduled', 'live', 'completed', 'postponed')),
  venue         text,
  match_day     int,           -- 1/2/3 within a round
  bracket_slot  text,         -- e.g. 'R32_01', 'R16_01', 'QF_01' for knockout positioning
  external_id   text unique   -- football-data.org match ID for auto score sync
);

-- ============================================================
-- USER PROFILES
-- ============================================================

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Auto-create profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- PICK GROUPS  (user mini-leagues)
-- ============================================================

create table pick_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text unique not null default upper(left(replace(gen_random_uuid()::text, '-', ''), 8)),
  created_by  uuid not null references profiles(id) on delete restrict,
  created_at  timestamptz default now()
);

-- Many-to-many: a group can participate in multiple seasons
create table pick_group_seasons (
  pick_group_id uuid not null references pick_groups(id) on delete cascade,
  season_id     uuid not null references seasons(id) on delete restrict,
  joined_at     timestamptz default now(),
  primary key (pick_group_id, season_id)
);

create table pick_group_members (
  pick_group_id uuid not null references pick_groups(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  role          text not null default 'member',
  constraint pick_group_members_role_check check (role in ('admin', 'member')),
  joined_at     timestamptz default now(),
  primary key (pick_group_id, user_id)
);

-- ============================================================
-- PREDICTIONS
-- ============================================================

-- 1. Match score predictions
create table match_predictions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  match_id       uuid not null references matches(id) on delete cascade,
  home_score     int not null check (home_score >= 0),
  away_score     int not null check (away_score >= 0),
  points_exact   int not null default 0,
  points_outcome int not null default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, match_id)
);

-- 2. Group standing predictions
create table group_predictions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  group_id             uuid not null references tournament_groups(id) on delete cascade,
  team_id              uuid not null references teams(id) on delete restrict,
  predicted_position   int not null check (predicted_position between 1 and 10),
  points_exact_position int not null default 0,
  points_qualified     int not null default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique (user_id, group_id, team_id),
  unique (user_id, group_id, predicted_position)
);

-- 3. Knockout bracket predictions (pick match winner)
create table bracket_predictions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  match_id            uuid not null references matches(id) on delete cascade,
  predicted_winner_id uuid not null references teams(id),
  points_winner       int not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id, match_id)
);

-- ============================================================
-- SCORING RULES  (configurable per season / round)
-- ============================================================
--
-- Pointing strategy:
--   Group stage match  – exact score: 3pts, correct outcome: 1pt
--   Group standings    – exact position: 2pts, correct top-2 (qualified): 1pt
--   Round of 32        – correct winner: 2pts
--   Round of 16        – correct winner: 3pts
--   Quarter-final      – correct winner: 4pts
--   Semi-final         – correct winner: 5pts
--   Third place match  – correct winner: 3pts
--   Final              – correct winner: 8pts
--
create table scoring_rules (
  id                      uuid primary key default gen_random_uuid(),
  season_id               uuid not null references seasons(id) on delete cascade,
  round_slug              text not null,
  exact_score_points      int not null default 3,
  correct_outcome_points  int not null default 1,
  exact_position_points   int not null default 2,
  qualified_points        int not null default 1,
  correct_winner_points   int not null default 2,
  unique (season_id, round_slug)
);

-- ============================================================
-- SCORING FUNCTIONS  (called after match results are entered)
-- ============================================================

-- Score all match predictions for a completed match
create or replace function score_match_predictions(p_match_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_home     int;
  v_away     int;
  v_exact    int := 3;
  v_outcome  int := 1;
begin
  select home_score, away_score into v_home, v_away
  from matches where id = p_match_id and status = 'completed';
  if not found then return; end if;

  select sr.exact_score_points, sr.correct_outcome_points
  into v_exact, v_outcome
  from matches m
  join rounds r  on r.id = m.round_id
  join scoring_rules sr on sr.season_id = r.season_id and sr.round_slug = r.slug
  where m.id = p_match_id;

  update match_predictions mp
  set
    points_exact = case
      when mp.home_score = v_home and mp.away_score = v_away then v_exact
      else 0
    end,
    points_outcome = case
      when mp.home_score = v_home and mp.away_score = v_away then 0
      when mp.home_score > mp.away_score and v_home > v_away   then v_outcome
      when mp.home_score = mp.away_score and v_home = v_away   then v_outcome
      when mp.home_score < mp.away_score and v_home < v_away   then v_outcome
      else 0
    end,
    updated_at = now()
  where mp.match_id = p_match_id;
end;
$$;

-- Score group standings after all matches in a group complete
create or replace function score_group_predictions(p_group_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_exact int := 2;
  v_qual  int := 1;
begin
  select sr.exact_position_points, sr.qualified_points
  into v_exact, v_qual
  from tournament_groups tg
  join rounds r on r.id = tg.round_id
  join scoring_rules sr on sr.season_id = r.season_id and sr.round_slug = r.slug
  where tg.id = p_group_id;

  update group_predictions gp
  set
    points_exact_position = case
      when gt.final_position = gp.predicted_position then v_exact
      else 0
    end,
    points_qualified = case
      when gt.final_position = gp.predicted_position then 0
      when gt.final_position <= 2 and gp.predicted_position <= 2 then v_qual
      else 0
    end,
    updated_at = now()
  from group_teams gt
  where gp.group_id = p_group_id
    and gt.group_id = p_group_id
    and gt.team_id  = gp.team_id;
end;
$$;

-- Score bracket predictions after a knockout match completes
create or replace function score_bracket_predictions(p_match_id uuid)
returns void
language plpgsql security definer
as $$
declare
  v_winner uuid;
  v_pts    int := 2;
begin
  -- In knockout: higher score wins; penalty_winner_id used when scores are level
  select case
    when penalty_winner_id is not null then penalty_winner_id
    when home_score > away_score then home_team_id
    when away_score > home_score then away_team_id
    else null
  end into v_winner
  from matches where id = p_match_id and status = 'completed';

  if v_winner is null then return; end if;

  select sr.correct_winner_points
  into v_pts
  from matches m
  join rounds r on r.id = m.round_id
  join scoring_rules sr on sr.season_id = r.season_id and sr.round_slug = r.slug
  where m.id = p_match_id;

  update bracket_predictions
  set
    points_winner = case when predicted_winner_id = v_winner then v_pts else 0 end,
    updated_at    = now()
  where match_id = p_match_id;
end;
$$;

-- ============================================================
-- LEADERBOARD VIEWS
-- ============================================================

create or replace view season_leaderboard as
with match_pts as (
  select mp.user_id, r.season_id, sum(mp.points_exact + mp.points_outcome)::int as pts
  from match_predictions mp
  join matches m on m.id = mp.match_id
  join rounds r  on r.id = m.round_id
  group by mp.user_id, r.season_id
),
group_pts as (
  select gp.user_id, r.season_id, sum(gp.points_exact_position + gp.points_qualified)::int as pts
  from group_predictions gp
  join tournament_groups tg on tg.id = gp.group_id
  join rounds r on r.id = tg.round_id
  group by gp.user_id, r.season_id
),
bracket_pts as (
  select bp.user_id, r.season_id, sum(bp.points_winner)::int as pts
  from bracket_predictions bp
  join matches m on m.id = bp.match_id
  join rounds r  on r.id = m.round_id
  group by bp.user_id, r.season_id
),
all_pts as (
  select * from match_pts
  union all
  select * from group_pts
  union all
  select * from bracket_pts
)
select
  p.id           as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  ap.season_id,
  sum(ap.pts)::int as total_points,
  rank() over (partition by ap.season_id order by sum(ap.pts) desc)::int as rank
from profiles p
join all_pts ap on ap.user_id = p.id
group by p.id, p.username, p.display_name, p.avatar_url, ap.season_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Public read tables (managed by admin via service role key)
-- sports, competitions, seasons, teams, rounds, tournament_groups,
-- group_teams, matches, scoring_rules

alter table profiles           enable row level security;
alter table pick_groups        enable row level security;
alter table pick_group_members enable row level security;
alter table match_predictions  enable row level security;
alter table group_predictions  enable row level security;
alter table bracket_predictions enable row level security;

-- profiles
create policy "profiles_read_all"    on profiles for select using (true);
create policy "profiles_insert_own"  on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on profiles for update using (auth.uid() = id);

-- pick_groups
create policy "pick_groups_read_all"    on pick_groups for select using (true);
create policy "pick_groups_create"      on pick_groups for insert with check (auth.uid() = created_by);
create policy "pick_groups_update_own"  on pick_groups for update using (auth.uid() = created_by);
create policy "pick_groups_delete_own"  on pick_groups for delete using (auth.uid() = created_by);

-- pick_group_seasons
alter table pick_group_seasons enable row level security;
create policy "pgs_read_members" on pick_group_seasons
  for select using (
    pick_group_id in (select pick_group_id from pick_group_members where user_id = auth.uid())
  );
create policy "pgs_insert_admin" on pick_group_seasons
  for insert with check (
    pick_group_id in (select pick_group_id from pick_group_members where user_id = auth.uid() and role = 'admin')
  );
create policy "pgs_delete_admin" on pick_group_seasons
  for delete using (
    pick_group_id in (select pick_group_id from pick_group_members where user_id = auth.uid() and role = 'admin')
  );

-- pick_group_members
create policy "pgm_read_members" on pick_group_members
  for select using (
    user_id = auth.uid()
    or pick_group_id in (select pick_group_id from pick_group_members where user_id = auth.uid())
  );
create policy "pgm_join"    on pick_group_members for insert with check (auth.uid() = user_id);
create policy "pgm_leave"   on pick_group_members for delete using  (auth.uid() = user_id);

-- match_predictions: own always; others' only after kickoff
create policy "mp_own"   on match_predictions for select using (auth.uid() = user_id);
create policy "mp_other" on match_predictions
  for select using (
    auth.uid() != user_id
    and exists (select 1 from matches where id = match_id and kickoff_at <= now())
  );
create policy "mp_insert" on match_predictions
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from matches where id = match_id and kickoff_at > now())
  );
create policy "mp_update" on match_predictions
  for update using (
    auth.uid() = user_id
    and exists (select 1 from matches where id = match_id and kickoff_at > now())
  );

-- group_predictions: own always; others' after first match of the group kicks off
create policy "gp_own"   on group_predictions for select using (auth.uid() = user_id);
create policy "gp_other" on group_predictions
  for select using (
    auth.uid() != user_id
    and exists (select 1 from matches m where m.group_id = group_predictions.group_id and m.kickoff_at <= now())
  );
create policy "gp_insert" on group_predictions
  for insert with check (
    auth.uid() = user_id
    and not exists (select 1 from matches m where m.group_id = group_predictions.group_id and m.kickoff_at <= now())
  );
create policy "gp_update" on group_predictions
  for update using (
    auth.uid() = user_id
    and not exists (select 1 from matches m where m.group_id = group_predictions.group_id and m.kickoff_at <= now())
  );

-- bracket_predictions: own always; others' after first match of the round kicks off
create policy "bp_own"   on bracket_predictions for select using (auth.uid() = user_id);
create policy "bp_other" on bracket_predictions
  for select using (
    auth.uid() != user_id
    and exists (
      select 1 from matches m
      join matches bm on bm.id = bracket_predictions.match_id
      where m.round_id = bm.round_id and m.kickoff_at <= now()
    )
  );
create policy "bp_insert" on bracket_predictions
  for insert with check (
    auth.uid() = user_id
    and not exists (
      select 1 from matches m
      join matches bm on bm.id = bracket_predictions.match_id
      where m.round_id = bm.round_id and m.kickoff_at <= now()
    )
  );
create policy "bp_update" on bracket_predictions
  for update using (
    auth.uid() = user_id
    and not exists (
      select 1 from matches m
      join matches bm on bm.id = bracket_predictions.match_id
      where m.round_id = bm.round_id and m.kickoff_at <= now()
    )
  );

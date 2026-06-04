-- Series predictions: champion + number of games
create table if not exists series_predictions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  pick_group_id       uuid not null references pick_groups(id) on delete cascade,
  season_id           uuid not null references seasons(id) on delete cascade,
  predicted_winner_id uuid not null references teams(id),
  predicted_games     int  not null check (predicted_games between 4 and 7),
  points_winner       int  not null default 0,
  points_games        int  not null default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (user_id, pick_group_id, season_id)
);

alter table series_predictions enable row level security;

-- Own row always visible; others' visible after season completes
create policy "sp_own" on series_predictions
  for select using (auth.uid() = user_id);

create policy "sp_other" on series_predictions
  for select using (
    auth.uid() != user_id
    and exists (select 1 from seasons where id = season_id and status = 'completed')
  );

create policy "sp_insert" on series_predictions
  for insert with check (auth.uid() = user_id);

create policy "sp_update" on series_predictions
  for update using (auth.uid() = user_id);

grant select, insert, update on series_predictions to authenticated;

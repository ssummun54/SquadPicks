-- ============================================================
-- Event Enrollments
-- Joining a group ≠ joining an event.
-- Members must request to participate in each event;
-- group admin approves or denies.
-- ============================================================

create table if not exists event_enrollments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  pick_group_id  uuid not null references pick_groups(id) on delete cascade,
  season_id      uuid not null references seasons(id) on delete cascade,
  status         text not null default 'pending',
  constraint event_enrollments_status_check check (status in ('pending', 'approved', 'denied')),
  requested_at   timestamptz default now(),
  reviewed_at    timestamptz,
  unique (user_id, pick_group_id, season_id)
);

-- RLS
alter table event_enrollments enable row level security;

-- Members can see enrollments for groups they belong to
create policy "ee_read" on event_enrollments
  for select using (
    pick_group_id in (
      select pick_group_id from pick_group_members where user_id = auth.uid()
    )
  );

-- Users can submit their own requests
create policy "ee_insert" on event_enrollments
  for insert with check (
    auth.uid() = user_id
    and pick_group_id in (
      select pick_group_id from pick_group_members where user_id = auth.uid()
    )
  );

-- Group admins can approve or deny
create policy "ee_update" on event_enrollments
  for update using (
    pick_group_id in (
      select pick_group_id from pick_group_members where user_id = auth.uid() and role = 'admin'
    )
  );

-- Grant permissions
grant select, insert, update on event_enrollments to authenticated;

-- ============================================================
-- Seed existing members as approved for all group events
-- ============================================================
insert into event_enrollments (user_id, pick_group_id, season_id, status)
select
  pgm.user_id,
  pgm.pick_group_id,
  pgs.season_id,
  'approved'
from pick_group_members pgm
join pick_group_seasons pgs on pgs.pick_group_id = pgm.pick_group_id
on conflict (user_id, pick_group_id, season_id) do nothing;

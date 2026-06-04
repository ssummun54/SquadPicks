-- Add optional payment info fields to pick_groups
-- Run in Supabase SQL Editor

alter table pick_groups
  add column if not exists zelle_info   text,
  add column if not exists cashapp_info text;

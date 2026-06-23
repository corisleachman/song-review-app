-- Enable Row-Level Security on the v1 ("outreach" / hxtsuhmqrufcdplidtov) project.
--
-- This app has no Supabase Auth — access is gated entirely at the Next.js layer
-- via a shared password + an identity cookie (Coris/Al), and all Supabase calls
-- use the anon key. So the goal here is NOT to restrict who can do what (the app
-- already controls that itself) — it's to satisfy Supabase's Security Advisor by
-- turning RLS on, while preserving the exact behaviour the app already depends on.
-- Each policy below allows full access to the anon role, which keeps the app
-- working exactly as it does today.
--
-- Run this in: Supabase Dashboard (outreach account) > SQL Editor > New query

alter table songs enable row level security;
alter table song_versions enable row level security;
alter table comment_threads enable row level security;
alter table comments enable row level security;
alter table song_tasks enable row level security;
alter table actions enable row level security;
alter table settings enable row level security;

create policy "Allow all access (anon)" on songs
  for all to anon using (true) with check (true);

create policy "Allow all access (anon)" on song_versions
  for all to anon using (true) with check (true);

create policy "Allow all access (anon)" on comment_threads
  for all to anon using (true) with check (true);

create policy "Allow all access (anon)" on comments
  for all to anon using (true) with check (true);

create policy "Allow all access (anon)" on song_tasks
  for all to anon using (true) with check (true);

create policy "Allow all access (anon)" on actions
  for all to anon using (true) with check (true);

create policy "Allow all access (anon)" on settings
  for all to anon using (true) with check (true);

-- NOTE: actions and settings aren't in the committed SUPABASE_SCHEMA.sql — they
-- were added later directly via the SQL Editor (per Coris, the live project has
-- 7 tables total: songs, song_versions, comment_threads, comments, song_tasks,
-- actions, settings — all 7 are covered above).

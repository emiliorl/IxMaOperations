-- Waiting status and note for project milestones / problems.
-- Run once in the Supabase SQL editor AFTER 20261029002000_project_files.sql.
--
-- Adds the 'waiting' status so problems where access was requested, templates
-- are needed from a client team, or third-party confirmation is pending can
-- clearly reflect that state to both the owner and the client.
--
-- An optional encrypted note (waiting_for) captures what is needed (e.g.
-- "Access requested from IT", "Waiting for team template") so everyone stays on
-- the same page.

alter table public.project_milestones drop constraint if exists project_milestones_status_check;
alter table public.project_milestones
  add constraint project_milestones_status_check
  check (status in ('pending', 'in_progress', 'waiting', 'completed', 'blocked'));

alter table public.project_milestones
  add column if not exists waiting_for text;

alter table public.project_milestones
  add constraint project_milestones_waiting_for_len check (waiting_for is null or char_length(waiting_for) <= 20000);


-- A portal booking can say which team and which problem it is about.
-- Run once in the Supabase SQL editor AFTER 20261029001500_area_info.sql.
--
-- A client who books a call from the portal now picks the team (area) and, if there is one,
-- the problem the call is about. The server checks both against what that person can open
-- before saving them, and they appear in the owner's calendar event and email.
--
-- Both are optional. If the team or the problem is ever removed, the meeting stays and the
-- field is simply cleared. The meetings table is still reachable only by the server with the
-- secret key (RLS on, no policies, nothing granted to the API roles): these columns change that
-- for nobody.
--
-- Until this runs, bookings still work: the app saves everything else and skips these two.
-- Safe to run more than once.

alter table public.meetings
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists milestone_id uuid references public.project_milestones(id) on delete set null;

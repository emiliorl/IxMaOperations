-- The days of the week a client's office is open for visits.
-- Run once in the Supabase SQL editor AFTER 20261029001700_meeting_client.sql.
--
-- Some clients work from home on certain days (Domus: Fridays). An in-person meeting at their office on
-- one of those days would mean visiting an empty office, so each project says which weekdays its office is
-- open, and in-person times (booking page, on-site days) only exist on those days.
--
--   projects.office_weekdays   0 = Sunday ... 6 = Saturday. Default Monday to Friday, which is what every
--                              project had before this existed, so nothing changes until the owner edits it.
--                              Empty = no visits at this office (online only).
--
-- Who writes it: the owner only, by the existing policy on projects. Who reads it: whoever can read the
-- project, like every other column of it (a weekday list is not sensitive).
--
-- Until this runs, the app treats every project as open Monday to Friday.
-- Safe to run more than once.

alter table public.projects
  add column if not exists office_weekdays smallint[] not null default '{1,2,3,4,5}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_office_weekdays_valid') then
    alter table public.projects
      add constraint projects_office_weekdays_valid
      check (office_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[] and cardinality(office_weekdays) <= 7);
  end if;
end $$;

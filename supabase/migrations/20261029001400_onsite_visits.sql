-- On-site days: when the owner will be at a project's office.
-- Run once in the Supabase SQL editor AFTER 20261029001300_remove_whatsapp.sql.
--
-- The owner announces a day at a client's office (date + hours). The portal shows it
-- on that project's page (with the free windows between meetings), and /book offers
-- in-person times on it. A day with an in-person meeting booked FOR the project shows
-- up too, even without an announcement (that comes from meetings.project_id).
--
-- Who sees what:
--   * the owner: every project, and is the only one who can add / change / remove days;
--   * people on the project (and company-wide executives): only THAT project's days,
--     and only while the project's show_onsite_presence switch is on.
-- Nobody else, and never another client's days. The public /book page keeps showing only
-- anonymous "already on-site" markers.

create table public.onsite_visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  visit_date date not null,                       -- the day, in the owner's time zone
  start_time time not null default '10:00',       -- wall-clock hours at the office
  end_time time not null default '15:30',
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (project_id, visit_date)
);
create index onsite_visits_project_idx on public.onsite_visits (project_id, visit_date);

alter table public.onsite_visits enable row level security;

create policy onsite_visits_read on public.onsite_visits for select to authenticated
  using (
    public.is_admin()
    or (
      public.can_access_department(project_id, null)
      and exists (select 1 from public.projects p where p.id = project_id and p.show_onsite_presence)
    )
  );

create policy onsite_visits_admin on public.onsite_visits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.onsite_visits from anon, authenticated;
grant select, insert, update, delete on public.onsite_visits to authenticated;   -- writes are owner-only, by the policy

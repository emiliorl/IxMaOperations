-- Downloadable files (installers, deliverables) shared with ONE audience.
-- Run once in the Supabase SQL editor AFTER 20261029001900_admin_two_step.sql.
--
-- Who may download a file is the same rule that already decides who may see a
-- team's folder, so there is nothing new to keep in sync:
--   * project-wide file (no team)  -> every member of that project;
--   * team file (department_id)    -> people with that team's folder, or all
--                                     folders, or company-wide access;
--   * problem file (milestone_id)  -> the same as its team (the file takes the
--                                     problem's team, so BIM-1's files are seen
--                                     only by the people who can open BIM-1).
-- The owner always sees everything. Nobody else on the internet sees anything:
-- the bucket is private and has no storage policies, and the file is encrypted
-- (AES-256-GCM) before it is stored. Only the app server (secret key) can read
-- it, and only after the row below has been returned to the signed-in user.

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  department_id uuid,                -- NULL = whole project
  milestone_id uuid references public.project_milestones(id) on delete cascade,  -- NULL = not tied to one problem
  file_name text not null,           -- encrypted
  mime_type text not null,           -- encrypted
  label text,                        -- encrypted, optional human title ("Windows installer")
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  created_at timestamptz not null default now(),
  foreign key (project_id, department_id) references public.project_departments (project_id, department_id) on delete cascade
);
create index project_files_project_idx on public.project_files (project_id, department_id);
create index project_files_milestone_idx on public.project_files (milestone_id) where milestone_id is not null;

alter table public.project_files enable row level security;

create policy project_files_read on public.project_files for select to authenticated
  using (public.is_admin() or public.can_access_department(project_id, department_id));
create policy project_files_admin on public.project_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.project_files from anon, authenticated;
grant select, insert, update, delete on public.project_files to authenticated;  -- narrowed by the policies above

-- Private bucket for the encrypted contents (50 MB cap per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

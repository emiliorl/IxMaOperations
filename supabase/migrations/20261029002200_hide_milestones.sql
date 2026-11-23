-- Hide specific plan items (problems) from non-admin users.
-- Run once in the Supabase SQL editor AFTER 20261029002100_waiting_status.sql.

alter table public.project_milestones
  add column if not exists is_hidden boolean not null default false;

drop policy if exists project_milestones_read on public.project_milestones;
create policy project_milestones_read on public.project_milestones for select to authenticated
  using (
    public.is_admin()
    or (not is_hidden and public.can_access_department(project_id, department_id))
  );

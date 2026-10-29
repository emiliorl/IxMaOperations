-- Project log.
-- Run once in the Supabase SQL editor AFTER 20261029000400_problem_details.sql.
--
-- An AUTOMATIC log per project. The database itself records a ticket being
-- opened, a ticket's status changing, a plan item's status changing and a
-- (non-internal) comment being added. Nobody has to remember to log anything,
-- nobody can edit or forge it (there is no way to write to it except through
-- these triggers), and it holds no free text — only ids, statuses and times —
-- so there is nothing sensitive in it to encrypt. The titles shown next to an
-- event come from the (encrypted) tickets and plan items themselves.
--
-- Who sees what is the same rule as everywhere else: an event that belongs to a
-- folder is visible only to people with that folder; a project-wide one to
-- everyone on the project; the owner sees all. Events about the owner's
-- internal notes are never recorded.

create table public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  department_id uuid,                       -- folder of the subject; null = project-wide
  kind text not null check (kind in ('ticket_opened', 'ticket_status', 'plan_status', 'comment_added')),
  ticket_id uuid references public.tickets(id) on delete set null,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  from_status text,
  to_status text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index project_events_project_idx on public.project_events (project_id, created_at desc);
create index project_events_ticket_idx on public.project_events (ticket_id) where ticket_id is not null;
create index project_events_milestone_idx on public.project_events (milestone_id) where milestone_id is not null;

-- ---------------------------------------------------------- the automatic log
-- These run as the table owner so they record events no matter who made the
-- change; there is deliberately no policy that lets anyone insert directly.

create function public.log_ticket_opened() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_events (project_id, department_id, kind, ticket_id, milestone_id, to_status, actor_id)
  values (new.project_id, new.department_id, 'ticket_opened', new.id, new.milestone_id, new.status, new.created_by);
  return new;
end $$;

create function public.log_ticket_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.project_events (project_id, department_id, kind, ticket_id, milestone_id, from_status, to_status, actor_id)
    values (new.project_id, new.department_id, 'ticket_status', new.id, new.milestone_id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end $$;

create function public.log_plan_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.project_events (project_id, department_id, kind, milestone_id, from_status, to_status, actor_id)
    values (new.project_id, new.department_id, 'plan_status', new.id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end $$;

create function public.log_comment_added() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  if not new.is_internal then          -- the owner's private notes leave no trace
    select project_id, department_id, milestone_id into t from public.tickets where id = new.ticket_id;
    if found then
      insert into public.project_events (project_id, department_id, kind, ticket_id, milestone_id, actor_id)
      values (t.project_id, t.department_id, 'comment_added', new.ticket_id, t.milestone_id, new.author_id);
    end if;
  end if;
  return new;
end $$;

create trigger tickets_log_opened after insert on public.tickets
  for each row execute function public.log_ticket_opened();
create trigger tickets_log_status after update of status on public.tickets
  for each row execute function public.log_ticket_status();
create trigger milestones_log_status after update of status on public.project_milestones
  for each row execute function public.log_plan_status();
create trigger comments_log_added after insert on public.ticket_comments
  for each row execute function public.log_comment_added();

-- -------------------------------------------------------------------- policies

alter table public.project_events enable row level security;

create policy project_events_read on public.project_events for select to authenticated
  using (public.is_admin() or public.can_access_department(project_id, department_id));

revoke all on public.project_events from anon, authenticated;
grant select on public.project_events to authenticated;   -- read only; written by the triggers above

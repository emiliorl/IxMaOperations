-- The project log is for leaders; "by the owner" is recorded, not looked up.
-- Run once in the Supabase SQL editor AFTER 20261029000700_confirm_ticket_fixed.sql.
--
-- 1. WHO MAY READ THE LOG. The project log is an oversight tool, so it is for:
--      * the owner;
--      * company-wide executives ('view' or 'full');
--      * team leads (project_members.role = 'lead').
--    Regular members don't get it. They keep one thing: the events of tickets
--    they can already see, so a ticket can show its own history (opened, sent
--    back, closed). Plan-item progress events and everything else stay with the
--    leaders. Folder rules are unchanged: you only ever see your folders.
--
-- 2. "IxMa Operations" INSTEAD OF "Someone". The owner is not on any project team
--    and profiles are hidden from people who don't share a project with them
--    (shares_project_with), so a client's screen could not name the owner. Rather
--    than weaken that, each event now records `by_owner`, set by the database at
--    the moment it happens from the caller's own token. The screen shows "IxMa
--    Operations" for those events without ever reading the owner's profile.
--    Events written before this migration have by_owner = false; the app treats
--    plan-item status changes (owner-only by policy) as the owner's regardless.

alter table public.project_events add column by_owner boolean not null default false;

-- ------------------------------------------------------ who is a leader

create function public.is_project_leader(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    public.is_admin()
    or public.org_access_to_project(p_project, false)
    or exists (
      select 1 from public.project_members m
      where m.project_id = p_project
        and m.user_id = (select auth.uid())
        and m.role = 'lead'
    )
$$;

revoke execute on function public.is_project_leader(uuid) from public, anon;
grant execute on function public.is_project_leader(uuid) to authenticated;

-- ------------------------------------------------------- the read policy

drop policy project_events_read on public.project_events;
create policy project_events_read on public.project_events for select to authenticated
  using (
    public.is_admin()
    or (
      public.can_access_department(project_id, department_id)
      and (public.is_project_leader(project_id) or ticket_id is not null)
    )
  );

-- ------------------------------------------------ record who did it
-- Same four triggers as before; the only change is `by_owner`.

create or replace function public.log_ticket_opened() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_events (project_id, department_id, kind, ticket_id, milestone_id, to_status, actor_id, by_owner)
  values (new.project_id, new.department_id, 'ticket_opened', new.id, new.milestone_id, new.status, new.created_by, public.is_admin());
  return new;
end $$;

create or replace function public.log_ticket_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.project_events (project_id, department_id, kind, ticket_id, milestone_id, from_status, to_status, actor_id, by_owner)
    values (new.project_id, new.department_id, 'ticket_status', new.id, new.milestone_id, old.status, new.status, (select auth.uid()), public.is_admin());
  end if;
  return new;
end $$;

create or replace function public.log_plan_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.project_events (project_id, department_id, kind, milestone_id, from_status, to_status, actor_id, by_owner)
    values (new.project_id, new.department_id, 'plan_status', new.id, old.status, new.status, (select auth.uid()), public.is_admin());
  end if;
  return new;
end $$;

create or replace function public.log_comment_added() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  if not new.is_internal then          -- the owner's private notes leave no trace
    select project_id, department_id, milestone_id into t from public.tickets where id = new.ticket_id;
    if found then
      insert into public.project_events (project_id, department_id, kind, ticket_id, milestone_id, actor_id, by_owner)
      values (t.project_id, t.department_id, 'comment_added', new.ticket_id, t.milestone_id, new.author_id, public.is_admin());
    end if;
  end if;
  return new;
end $$;

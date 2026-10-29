-- Client portal: organization -> project -> department, with team leads.
-- Run once in the Supabase SQL editor AFTER 20261028000000_meetings.sql.
--
-- Who can see what (enforced here, in the database — not by the UI):
--   * A user belongs to a project through project_members (project, optional
--     department, role 'lead' | 'member'). department NULL = project-wide.
--   * Everyone on a project sees its overview, plan (milestones) and team.
--   * A ticket belongs to one department, or to the whole project (NULL).
--     Project-wide members see every ticket; a department member/lead sees
--     their own department's tickets plus project-wide ones.
--   * Clients can create tickets and comment on tickets they can see.
--     They cannot change anything else. The owner is the only admin.
--   * Admin = JWT app_metadata.role = 'admin'. app_metadata is writable only
--     with the service role; user_metadata (which users can edit) is ignored.
--   * Accounts are created by the owner (scripts/portal-admin.mjs). There is no
--     sign-up; turn "Allow new users to sign up" OFF in Supabase Auth settings.

-- ---------------------------------------------------------------- tables

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  timezone text not null default 'America/Mexico_City',
  created_at timestamptz not null default now()
  -- no role column: admin status lives in auth app_metadata
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  unique (organization_id, name)
);
create index departments_org_idx on public.departments (organization_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'in_progress'
    check (status in ('discovery', 'in_progress', 'review', 'completed', 'maintenance')),
  staging_url text,
  production_url text,
  office_label text,                       -- where in-person meetings happen
  office_address text,
  show_onsite_presence boolean not null default true,
  ticket_seq integer not null default 0,   -- per-project ticket counter
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_org_idx on public.projects (organization_id);

create table public.project_departments (
  project_id uuid not null references public.projects(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  primary key (project_id, department_id)
);
create index project_departments_dept_idx on public.project_departments (department_id);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid,                      -- NULL = project-wide
  role text not null default 'member' check (role in ('lead', 'member')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id),
  -- the department must take part in this project (not checked when NULL)
  foreign key (project_id, department_id) references public.project_departments (project_id, department_id)
);
create index project_members_user_idx on public.project_members (user_id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  department_id uuid,                      -- NULL = whole project
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  sort_order integer not null default 0,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (project_id, department_id) references public.project_departments (project_id, department_id)
);
create index project_milestones_project_idx on public.project_milestones (project_id, sort_order);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number integer not null,          -- assigned per project by trigger
  project_id uuid not null references public.projects(id) on delete cascade,
  department_id uuid,                      -- NULL = project-wide
  milestone_id uuid references public.project_milestones(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 3 and 200),
  description text not null check (char_length(description) between 1 and 5000),
  category text not null default 'question'
    check (category in ('bug', 'feature', 'scope_change', 'question', 'access')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'needs_review', 'resolved', 'closed')),
  environment text not null default 'production'
    check (environment in ('staging', 'production', 'local', 'n/a')),
  affected_url text check (affected_url is null or char_length(affected_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, ticket_number),
  foreign key (project_id, department_id) references public.project_departments (project_id, department_id)
);
create index tickets_project_idx on public.tickets (project_id, created_at desc);
create index tickets_department_idx on public.tickets (department_id);
create index tickets_created_by_idx on public.tickets (created_by);

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  message text not null check (char_length(message) between 1 and 5000),
  is_internal boolean not null default false,  -- owner-only notes, never shown to clients
  created_at timestamptz not null default now()
);
create index ticket_comments_ticket_idx on public.ticket_comments (ticket_id, created_at);

-- meetings (from the scheduler migration) can now point at a project / ticket.
alter table public.meetings drop column if exists client_id;
alter table public.meetings
  add constraint meetings_project_fk foreign key (project_id) references public.projects(id) on delete set null,
  add constraint meetings_ticket_fk foreign key (ticket_id) references public.tickets(id) on delete set null;

-- ------------------------------------------------------------- triggers

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger tickets_touch before update on public.tickets
  for each row execute function public.touch_updated_at();

-- Per-project ticket numbers (#1, #2, ...). Runs as the table owner so clients
-- never need write access to projects; the row lock on the project serializes
-- concurrent inserts, so numbers are unique and gap-free per project. A number
-- supplied by the client is always overwritten.
create function public.assign_ticket_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.projects
     set ticket_seq = ticket_seq + 1
   where id = new.project_id
   returning ticket_seq into new.ticket_number;
  return new;
end $$;

create trigger tickets_assign_number before insert on public.tickets
  for each row execute function public.assign_ticket_number();

-- ------------------------------------------------------ access helpers
-- security definer so policies can look at project_members without
-- triggering that table's own policies (and recursing).

create function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create function public.is_project_member(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project and m.user_id = (select auth.uid())
  )
$$;

-- May the current user see/create things in this department of this project?
-- p_department NULL = project-wide item: any member. Otherwise a project-wide
-- member (department NULL) or a member of that same department.
create function public.can_access_department(p_project uuid, p_department uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project
      and m.user_id = (select auth.uid())
      and (p_department is null or m.department_id is null or m.department_id = p_department)
  )
$$;

create function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.projects p
    join public.project_members m on m.project_id = p.id
    where p.organization_id = p_org and m.user_id = (select auth.uid())
  )
$$;

create function public.shares_project_with(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.project_members a
    join public.project_members b on b.project_id = a.project_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  )
$$;

create function public.can_see_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tickets t
    where t.id = p_ticket
      and (public.is_admin() or public.can_access_department(t.project_id, t.department_id))
  )
$$;

-- Helpers are for policies (run as the signed-in user); nobody else needs them.
revoke execute on function
  public.is_admin(), public.is_project_member(uuid), public.can_access_department(uuid, uuid),
  public.is_org_member(uuid), public.shares_project_with(uuid), public.can_see_ticket(uuid)
  from public, anon;
grant execute on function
  public.is_admin(), public.is_project_member(uuid), public.can_access_department(uuid, uuid),
  public.is_org_member(uuid), public.shares_project_with(uuid), public.can_see_ticket(uuid)
  to authenticated;

-- ---------------------------------------------------------- row security

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.projects enable row level security;
alter table public.project_departments enable row level security;
alter table public.project_members enable row level security;
alter table public.project_milestones enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

-- Reads
create policy organizations_read on public.organizations for select to authenticated
  using (public.is_admin() or public.is_org_member(id));
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin() or public.shares_project_with(id));
create policy departments_read on public.departments for select to authenticated
  using (public.is_admin() or public.is_org_member(organization_id));
create policy projects_read on public.projects for select to authenticated
  using (public.is_admin() or public.is_project_member(id));
create policy project_departments_read on public.project_departments for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id));
create policy project_members_read on public.project_members for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id));
create policy project_milestones_read on public.project_milestones for select to authenticated
  using (public.is_admin() or public.is_project_member(project_id));
create policy tickets_read on public.tickets for select to authenticated
  using (public.is_admin() or public.can_access_department(project_id, department_id));
create policy ticket_comments_read on public.ticket_comments for select to authenticated
  using (public.can_see_ticket(ticket_id) and (not is_internal or public.is_admin()));

-- Clients may open tickets and comment — nothing else. Tickets always start
-- 'open' and are attributed to the signed-in user (no spoofing).
create policy tickets_create on public.tickets for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'open'
    and (public.is_admin() or public.can_access_department(project_id, department_id))
  );
create policy ticket_comments_create on public.ticket_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.can_see_ticket(ticket_id)
    and (not is_internal or public.is_admin())
  );

-- Everything else: admin only (the owner, through the portal UI).
create policy organizations_admin on public.organizations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy departments_admin on public.departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy projects_admin on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy project_departments_admin on public.project_departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy project_members_admin on public.project_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy project_milestones_admin on public.project_milestones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tickets_admin on public.tickets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tickets_admin_delete on public.tickets for delete to authenticated
  using (public.is_admin());
create policy ticket_comments_admin on public.ticket_comments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ticket_comments_admin_delete on public.ticket_comments for delete to authenticated
  using (public.is_admin());
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- A user may edit only their own display name / timezone (see column grant below).
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ------------------------------------------------------------- privileges
-- The public API key (anon) gets nothing. Signed-in users get exactly what the
-- policies above can ever allow; RLS then narrows it per row.
revoke all on
  public.organizations, public.profiles, public.departments, public.projects,
  public.project_departments, public.project_members, public.project_milestones,
  public.tickets, public.ticket_comments
  from anon;
revoke all on
  public.organizations, public.profiles, public.departments, public.projects,
  public.project_departments, public.project_members, public.project_milestones,
  public.tickets, public.ticket_comments
  from authenticated;

grant select on
  public.organizations, public.profiles, public.departments, public.projects,
  public.project_departments, public.project_members, public.project_milestones,
  public.tickets, public.ticket_comments
  to authenticated;
grant insert, update, delete on
  public.organizations, public.departments, public.projects, public.project_departments,
  public.project_members, public.project_milestones, public.tickets, public.ticket_comments
  to authenticated;                         -- admin-only via policies; clients only reach INSERT on tickets/comments
grant insert, delete on public.profiles to authenticated;  -- admin-only via policy
grant update (display_name, timezone) on public.profiles to authenticated;

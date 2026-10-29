-- Access model v2: department FOLDERS and company-wide access.
-- Run once in the Supabase SQL editor AFTER 20261029000000_portal.sql.
--
-- The model:
--   * One project per company (a company may have more). Inside a project, each
--     participating department is a FOLDER holding that team's plan items and
--     tickets. Items with no department are project-wide.
--   * A person on a project is given access to ONE folder, SEVERAL folders, or
--     ALL folders. Project-wide items are visible to every member.
--   * A folder you have no access to is invisible: its plan items, its tickets
--     and even its name. (Version 1 showed the whole plan to everyone.)
--   * Company-wide access (CFO / CEO ...), granted only by the owner:
--       'full' - every project, folder, plan item and ticket of THAT company;
--                can open tickets and comment anywhere in it.
--       'view' - the same visibility, but cannot open tickets or comment.
--     It never crosses companies, never lets anyone edit plans / teams / access,
--     and never reveals the owner's internal notes.

-- ------------------------------------------------ 1. folders per person

alter table public.project_members add column all_departments boolean not null default false;

create table public.project_member_departments (
  project_id uuid not null,
  user_id uuid not null,
  department_id uuid not null,
  primary key (project_id, user_id, department_id),
  foreign key (project_id, user_id) references public.project_members (project_id, user_id) on delete cascade,
  -- the folder must belong to this project
  foreign key (project_id, department_id) references public.project_departments (project_id, department_id) on delete cascade
);
create index project_member_departments_dept_idx on public.project_member_departments (project_id, department_id);
create index project_member_departments_user_idx on public.project_member_departments (user_id);

-- Carry over any version-1 memberships (one department, or NULL = everything).
update public.project_members set all_departments = true where department_id is null;
insert into public.project_member_departments (project_id, user_id, department_id)
  select project_id, user_id, department_id from public.project_members where department_id is not null;
alter table public.project_members drop column department_id;  -- also drops its foreign key

-- ---------------------------------------------- 2. company-wide access

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_level text not null default 'full' check (access_level in ('view', 'full')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);
create index ticket_comments_author_idx on public.ticket_comments (author_id);

-- ------------------------------------------------------ 3. access helpers

-- Does the signed-in user hold company-wide access to this project's company?
-- p_write = true requires 'full'. Returns only a yes/no about the caller
-- themself, so it leaks nothing when called directly.
create function public.org_access_to_project(p_project uuid, p_write boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.projects p
    join public.organization_members m on m.organization_id = p.organization_id
    where p.id = p_project
      and m.user_id = (select auth.uid())
      and (not p_write or m.access_level = 'full')
  )
$$;

-- On the project at all (any folder, or company-wide)?
create or replace function public.is_project_member(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project and m.user_id = (select auth.uid())
  ) or public.org_access_to_project(p_project, false)
$$;

-- May I SEE this folder? NULL = a project-wide item: any member. Otherwise I
-- must have all folders, or this folder in my list — or company-wide access.
create or replace function public.can_access_department(p_project uuid, p_department uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project
      and m.user_id = (select auth.uid())
      and (
        p_department is null
        or m.all_departments
        or exists (
          select 1 from public.project_member_departments d
          where d.project_id = m.project_id and d.user_id = m.user_id and d.department_id = p_department
        )
      )
  ) or public.org_access_to_project(p_project, false)
$$;

-- May I OPEN TICKETS / COMMENT in this folder? Same, but company-wide access
-- must be 'full': 'view' can read and never write.
create function public.can_write_department(p_project uuid, p_department uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project
      and m.user_id = (select auth.uid())
      and (
        p_department is null
        or m.all_departments
        or exists (
          select 1 from public.project_member_departments d
          where d.project_id = m.project_id and d.user_id = m.user_id and d.department_id = p_department
        )
      )
  ) or public.org_access_to_project(p_project, true)
$$;

create function public.can_write_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tickets t
    where t.id = p_ticket
      and (public.is_admin() or public.can_write_department(t.project_id, t.department_id))
  )
$$;

-- Is this department a folder I can see in some project?
create function public.can_see_department(p_department uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_departments pd
    where pd.department_id = p_department
      and public.can_access_department(pd.project_id, pd.department_id)
  )
$$;

create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.projects p
    join public.project_members m on m.project_id = p.id
    where p.organization_id = p_org and m.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.organization_members om
    where om.organization_id = p_org and om.user_id = (select auth.uid())
  )
$$;

-- Whose name may I see? People on a project I can see, plus the author of any
-- ticket or (non-internal) comment I can see. The second part lets a team lead
-- see "CFO", or the owner, as the author of a thread without exposing every
-- executive's name to everyone. Authors of internal notes stay hidden.
create or replace function public.shares_project_with(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members pm
    where pm.user_id = p_user and public.is_project_member(pm.project_id)
  ) or exists (
    select 1 from public.tickets t
    where t.created_by = p_user and public.can_see_ticket(t.id)
  ) or exists (
    select 1 from public.ticket_comments c
    where c.author_id = p_user and not c.is_internal and public.can_see_ticket(c.ticket_id)
  )
$$;

-- ----------------------------------------------------------- 4. policies

-- Folders are invisible to people without access: their plan items, their
-- names, and who else is in them.
drop policy project_milestones_read on public.project_milestones;
create policy project_milestones_read on public.project_milestones for select to authenticated
  using (public.is_admin() or public.can_access_department(project_id, department_id));

drop policy project_departments_read on public.project_departments;
create policy project_departments_read on public.project_departments for select to authenticated
  using (public.is_admin() or public.can_access_department(project_id, department_id));

drop policy departments_read on public.departments;
create policy departments_read on public.departments for select to authenticated
  using (public.is_admin() or public.can_see_department(id));

alter table public.project_member_departments enable row level security;
create policy project_member_departments_read on public.project_member_departments for select to authenticated
  using (public.is_admin() or public.can_access_department(project_id, department_id));
create policy project_member_departments_admin on public.project_member_departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Opening tickets / commenting now go through the write helpers.
drop policy tickets_create on public.tickets;
create policy tickets_create on public.tickets for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'open'
    and (public.is_admin() or public.can_write_department(project_id, department_id))
  );

drop policy ticket_comments_create on public.ticket_comments;
create policy ticket_comments_create on public.ticket_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.can_write_ticket(ticket_id)
    and (not is_internal or public.is_admin())
  );

-- Who holds company-wide access is visible only to the owner (and to each
-- person for their own row); only the owner can grant, change or revoke it.
alter table public.organization_members enable row level security;
create policy organization_members_read on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy organization_members_admin on public.organization_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- 5. privileges

revoke all on public.organization_members, public.project_member_departments from anon, authenticated;
grant select, insert, update, delete on public.organization_members, public.project_member_departments to authenticated; -- narrowed by the policies above

revoke execute on function
  public.org_access_to_project(uuid, boolean), public.can_write_department(uuid, uuid),
  public.can_write_ticket(uuid), public.can_see_department(uuid)
  from public, anon;
grant execute on function
  public.org_access_to_project(uuid, boolean), public.can_write_department(uuid, uuid),
  public.can_write_ticket(uuid), public.can_see_department(uuid)
  to authenticated;

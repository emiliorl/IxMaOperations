-- Problems with an action plan, links and (protected) costs.
-- Run once in the Supabase SQL editor AFTER 20261029000300_ticket_attachments.sql.
--
-- A plan item is now a PROBLEM from the client's diagnosis: it can carry a code
-- (DW-1), a priority, how it will be delivered, a one-line summary, the full
-- action plan (Markdown) and a list of links. Tickets already link to plan
-- items, so each problem has its own ticket history.
--
-- Text is ENCRYPTED by the app before it reaches the database, like the rest of
-- the portal's content. Only `priority` (high / medium / low) stays readable,
-- because the screens sort and colour by it.
--
-- COSTS ARE DIFFERENT. They are kept in their own table with their own rule, so
-- being able to see a problem does NOT mean being able to see its cost:
--   * the owner, always;
--   * anyone with company-wide FULL access, and anyone with full project access
--     (all folders) — automatically;
--   * anyone else only if the owner switched "can see costs" on for them
--     (a team lead, a view-only executive);
--   * and never for a problem in a folder the person doesn't have.

alter table public.project_milestones
  add column code text,            -- encrypted, e.g. "DW-1"
  add column priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  add column delivery text,        -- encrypted, e.g. "Recommendation" / "Prompts"
  add column summary text,         -- encrypted one-liner: the proposed solution
  add column solution text,        -- encrypted Markdown: the action plan
  add column resources text;       -- encrypted JSON list of { label, url }

-- Generous safety nets; the app enforces the real limits on the readable text.
alter table public.project_milestones
  add constraint project_milestones_code_len check (code is null or char_length(code) <= 1000),
  add constraint project_milestones_summary_len check (summary is null or char_length(summary) <= 20000),
  add constraint project_milestones_solution_len check (solution is null or char_length(solution) <= 400000),
  add constraint project_milestones_resources_len check (resources is null or char_length(resources) <= 40000);

-- A short overview of the whole engagement (context, tools, timeline), shown on the project page.
-- It is visible to every member, so it must never contain costs.
alter table public.projects
  add column overview text,        -- encrypted Markdown
  add constraint projects_overview_len check (overview is null or char_length(overview) <= 800000);

-- The per-person switch for people who don't see costs automatically.
alter table public.project_members add column can_view_costs boolean not null default false;
alter table public.organization_members add column can_view_costs boolean not null default false;

-- Who may see costs on this project at all.
create function public.can_view_costs(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.project_members m
      where m.project_id = p_project
        and m.user_id = (select auth.uid())
        and (m.all_departments or m.can_view_costs)
    )
    or exists (
      select 1
      from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = p_project
        and om.user_id = (select auth.uid())
        and (om.access_level = 'full' or om.can_view_costs)
    )
$$;

revoke execute on function public.can_view_costs(uuid) from public, anon;
grant execute on function public.can_view_costs(uuid) to authenticated;

create table public.problem_costs (
  milestone_id uuid primary key references public.project_milestones(id) on delete cascade,
  cost_note text not null check (char_length(cost_note) between 1 and 40000)   -- encrypted
);

alter table public.problem_costs enable row level security;

-- Read: you may see costs on this project AND you can see the problem itself
-- (the lookup below runs with YOUR rights, so a problem in a folder you lack,
-- and therefore its cost, is invisible).
create policy problem_costs_read on public.problem_costs for select to authenticated
  using (
    exists (
      select 1 from public.project_milestones m
      where m.id = problem_costs.milestone_id and public.can_view_costs(m.project_id)
    )
  );
create policy problem_costs_admin on public.problem_costs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.problem_costs from anon, authenticated;
grant select, insert, update, delete on public.problem_costs to authenticated;  -- narrowed by the policies above

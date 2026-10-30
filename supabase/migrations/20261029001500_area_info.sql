-- General information for a team (area), shown apart from its problems.
-- Run once in the Supabase SQL editor AFTER 20261029001400_onsite_visits.sql.
--
-- An area's plan has two kinds of text: the problems (each with its own action plan) and
-- the team's general information (who they are, what they work with, the suggested
-- calendar). The second one is NOT a problem, so it lives on the area itself:
--
--   project_departments.overview   Markdown, stored encrypted by the app like every other
--                                  piece of content. Never holds prices.
--
-- Who reads it: exactly the people who can open that area. The existing read policy on
-- project_departments already limits each row to people who may open that area (the owner,
-- people with all folders, company executives, and members of that folder), so another
-- team's information never reaches someone who only has a different folder.
-- Who writes it: the owner only, by the existing project_departments_admin policy.
--
-- Safe to run more than once.

alter table public.project_departments
  add column if not exists overview text;

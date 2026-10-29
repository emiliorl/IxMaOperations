-- "Still broken": let a person send a ticket back after the owner marked it fixed.
-- Run once in the Supabase SQL editor AFTER 20261029000500_project_log.sql.
--
-- When the owner sets a ticket to 'needs_review' ("Needs your review") they are
-- saying "I fixed this, please check". If it is still broken, the person should
-- reopen THAT ticket (so its history stays in one place and shows up in the
-- project log) instead of filing a new one.
--
-- Only the owner can update tickets (tickets_admin policy), and that does not
-- change. This function is the one narrow exception, and it can do exactly one
-- thing: move a ticket from 'needs_review' back to 'open'. It cannot set any
-- other status, and it works only for:
--   * the owner; and
--   * people who may write in the ticket's folder (can_write_ticket) - so not a
--     view-only executive, not someone without that folder, not another company.
-- The status change is recorded in the project log by the existing trigger,
-- with the person's id, because auth.uid() is read from the request, not from
-- the function owner.

create function public.reopen_ticket(p_ticket uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if (select auth.uid()) is null or not public.can_write_ticket(p_ticket) then
    return false;
  end if;
  update public.tickets set status = 'open' where id = p_ticket and status = 'needs_review';
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

revoke execute on function public.reopen_ticket(uuid) from public, anon;
grant execute on function public.reopen_ticket(uuid) to authenticated;

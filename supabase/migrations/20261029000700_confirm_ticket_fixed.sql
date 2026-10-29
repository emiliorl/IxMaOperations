-- "It works": let a person close a ticket the owner marked as fixed.
-- Run once in the Supabase SQL editor AFTER 20261029000600_reopen_ticket.sql.
--
-- The other half of reopen_ticket(). When the owner sets a ticket to
-- 'needs_review' ("Needs your review") the person checks it: if it is still
-- broken they reopen it; if it works they close it here, without waiting for
-- the owner to do it.
--
-- Same rules as reopen_ticket(), and again the only thing it can do is ONE move:
-- 'needs_review' -> 'closed'. It works only for the owner and for people who may
-- write in the ticket's folder (can_write_ticket) - not a view-only executive,
-- not someone without that folder, not another company. The status change is
-- recorded in the project log by the existing trigger, with the person's id.

create function public.confirm_ticket_fixed(p_ticket uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if (select auth.uid()) is null or not public.can_write_ticket(p_ticket) then
    return false;
  end if;
  update public.tickets set status = 'closed' where id = p_ticket and status = 'needs_review';
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

revoke execute on function public.confirm_ticket_fixed(uuid) from public, anon;
grant execute on function public.confirm_ticket_fixed(uuid) to authenticated;

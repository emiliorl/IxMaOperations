-- A closed ticket takes no more messages until it is reopened.
-- Run once in the Supabase SQL editor AFTER 20261029000800_leader_logs.sql.
--
-- Before: anyone who could write in a ticket's area could keep commenting on it
-- after it was resolved or closed, and the only way back was "Still broken" on a
-- ticket waiting for review.
--
-- Now:
--   1. reopen_ticket() also works on a resolved or closed ticket. It still does
--      exactly one thing - set the status to 'open' - for the same people as
--      before (the owner, and anyone who may write in the ticket's area).
--   2. Comments on a resolved or closed ticket are refused for everyone except
--      the owner (who can still leave a note). To say something, a person
--      reopens the ticket first.

create or replace function public.reopen_ticket(p_ticket uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if (select auth.uid()) is null or not public.can_write_ticket(p_ticket) then
    return false;
  end if;
  update public.tickets set status = 'open'
    where id = p_ticket and status in ('needs_review', 'resolved', 'closed');
  get diagnostics changed = row_count;
  return changed = 1;
end $$;

drop policy ticket_comments_create on public.ticket_comments;
create policy ticket_comments_create on public.ticket_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.can_write_ticket(ticket_id)
    and (not is_internal or public.is_admin())
    and (
      public.is_admin()
      or not exists (
        select 1 from public.tickets
        where tickets.id = ticket_id and tickets.status in ('resolved', 'closed')
      )
    )
  );

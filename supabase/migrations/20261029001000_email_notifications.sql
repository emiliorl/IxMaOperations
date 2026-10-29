-- Let each person switch off the portal's e-mails about their own tickets.
-- Run once in the Supabase SQL editor AFTER 20261029000900_closed_tickets.sql.
--
-- The portal emails a person when the owner marks THEIR ticket as fixed or replies
-- to it (lib/portal/notify.ts). Those are on by default; this column is the switch
-- in the account menu. It is only ever read by the server when it is about to send.
--
-- People already may update their own profile row (profiles_update_own), but only the
-- columns granted below, so this adds exactly one more: the switch itself.

alter table public.profiles add column notify_email boolean not null default true;

grant update (notify_email) on public.profiles to authenticated;

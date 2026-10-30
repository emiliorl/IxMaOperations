-- Remember which account booked a meeting.
-- Run once in the Supabase SQL editor AFTER 20261029001600_meeting_topic.sql.
--
-- A client who books from the portal can then see and cancel their own meetings on the project's
-- Meetings tab. The first meetings migration (20261028000000_meetings.sql) already declared this
-- column, but a database created from an earlier draft of it doesn't have it, so this adds it
-- where it is missing and does nothing where it exists.
--
-- Plain uuid, no foreign key, like project_id and ticket_id next to it. The meetings table is
-- still reachable only by the server with the secret key (RLS on, no policies, nothing granted to
-- the API roles): this column changes that for nobody.
--
-- Until this runs, booking and cancelling still work: the app skips the column and matches a
-- person's meetings by their email instead.
-- Safe to run more than once.

alter table public.meetings
  add column if not exists client_id uuid;

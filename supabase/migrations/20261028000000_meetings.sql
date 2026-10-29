-- Native scheduler: bookings made through /book.
-- Run once in the Supabase SQL editor (Project -> SQL Editor), or via the CLI.
--
-- Security model:
--  * The browser never touches this table. The only writer/reader is the
--    server (app/api/schedule/*) using the secret key, which bypasses RLS.
--  * RLS is ON with NO policies, and all privileges are revoked from the
--    public API roles, so the publishable key can read or write nothing here
--    even if someone calls the REST API directly.
--  * guest_name, guest_email, notes and location hold AES-256-GCM ciphertext
--    (lib/field-crypto.ts), not plaintext. start/end/status stay readable so
--    the database can enforce the no-overlap rule.
--
-- client_id / project_id / ticket_id are plain nullable uuids for now; the
-- client-portal migration (CLIENT_PORTAL_AND_SCHEDULER_PLAN.md Phase 1) adds
-- the foreign keys once those tables exist.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  project_id uuid,
  ticket_id uuid,
  guest_name text not null,      -- encrypted
  guest_email text not null,     -- encrypted
  title text not null,
  notes text,                    -- encrypted
  location text,                 -- encrypted; address for in_person meetings
  mode text not null default 'online' check (mode in ('online', 'in_person')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null,        -- visitor's timezone when booking
  google_event_id text,
  meet_link text,                -- null for in_person
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'rescheduled')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- Atomic double-booking guard: two requests for overlapping times cannot both
-- succeed, no matter how they interleave. Half-open ranges, so back-to-back
-- meetings are allowed. Cancelled/rescheduled rows free the slot.
alter table public.meetings
  add constraint meetings_no_overlap
  exclude using gist (tstzrange(start_time, end_time) with &&)
  where (status in ('pending', 'confirmed'));

create index meetings_start_time_idx on public.meetings (start_time);

alter table public.meetings enable row level security;
revoke all on public.meetings from anon, authenticated;

-- Encrypted portal content.
-- Run once in the Supabase SQL editor AFTER 20261029000100_access_model.sql.
--
-- From now on the app encrypts the TEXT of portal content before it reaches the
-- database (AES-256-GCM, lib/field-crypto.ts; the key lives only in the app's
-- environment): ticket titles/descriptions/links, comments, plan items,
-- project details, company / department / project names, and people's names
-- and emails. Someone with database or backup access sees ciphertext.
--
-- What stays readable, because the access rules and the UI need it: ids,
-- statuses, priorities, dates, which folder an item belongs to, who belongs to
-- which project, and the URL slugs of companies and projects. (Supabase's own
-- login system also keeps sign-in email addresses; that cannot be encrypted.)
--
-- Two small schema changes follow from that.

-- 1) The old length limits counted readable characters. Ciphertext is ~35 %
--    longer plus a fixed header, so those limits would reject valid data. The
--    app validates the real limits on the readable text before encrypting;
--    these are generous safety nets only.
alter table public.tickets drop constraint if exists tickets_title_check;
alter table public.tickets drop constraint if exists tickets_description_check;
alter table public.tickets drop constraint if exists tickets_affected_url_check;
alter table public.ticket_comments drop constraint if exists ticket_comments_message_check;

alter table public.tickets
  add constraint tickets_title_len check (char_length(title) between 1 and 2000),
  add constraint tickets_description_len check (char_length(description) between 1 and 60000),
  add constraint tickets_affected_url_len check (affected_url is null or char_length(affected_url) <= 4000);
alter table public.ticket_comments
  add constraint ticket_comments_message_len check (char_length(message) between 1 and 60000);

-- 2) We look people up by email (adding someone to a project, the owner CLI)
--    without keeping emails readable: `email_hash` is a keyed one-way
--    fingerprint of the lower-cased email (HMAC-SHA256). It can confirm a
--    guess; it can't be turned back into the address.
alter table public.profiles add column email_hash text;
create unique index profiles_email_hash_idx on public.profiles (email_hash) where email_hash is not null;

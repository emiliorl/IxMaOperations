-- Personal preferences: language, and which e-mails a person wants.
-- Run once in the Supabase SQL editor AFTER 20261029001000_email_notifications.sql.
--
--   locale             the language they read e-mails in ('en' / 'es'). Null until they
--                      pick one (then the e-mail carries both languages).
--   notify_fix_ready   e-mail me when a fix is ready for me to check
--   notify_replies     e-mail me when IxMa replies on a ticket I opened
--
-- notify_email (previous migration) stays as the master switch: off = no e-mail at all.
-- The time zone column already existed; Settings now lets people change it.
--
-- People already may update their own profile row (profiles_update_own), but only the
-- columns granted: this adds exactly these three, nothing else.

alter table public.profiles
  add column locale text check (locale is null or locale in ('en', 'es')),
  add column notify_fix_ready boolean not null default true,
  add column notify_replies boolean not null default true;

alter table public.profiles
  add constraint profiles_timezone_len check (char_length(timezone) between 1 and 64);

grant update (locale, notify_fix_ready, notify_replies) on public.profiles to authenticated;

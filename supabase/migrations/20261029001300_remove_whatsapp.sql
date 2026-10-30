-- Take WhatsApp back out.
-- Run once in the Supabase SQL editor AFTER 20261029001100_preferences.sql.
--
-- A WhatsApp migration (20261029001200_whatsapp.sql) was written and then dropped from the
-- project: notifications stay email-only. If you ran it, this removes what it added: the
-- phone number column (and any number stored in it), the WhatsApp switch, the record of
-- consent and the trigger that kept it. If you never ran it, every line below does nothing.
--
-- Safe to run more than once.

drop trigger if exists profiles_whatsapp_opt_in on public.profiles;
drop function if exists public.stamp_whatsapp_opt_in();

alter table public.profiles
  drop constraint if exists profiles_whatsapp_needs_phone,
  drop column if exists whatsapp_opt_in_at,
  drop column if exists notify_whatsapp,
  drop column if exists phone;

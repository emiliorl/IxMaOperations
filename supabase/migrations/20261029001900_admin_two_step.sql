-- The owner's powers need the second step, once the owner has set it up.
-- Run once in the Supabase SQL editor AFTER 20261029001800_office_days.sql.
--
-- The portal asks for a 6-digit code (an authenticator app) before showing anything to an account that has set
-- one up. But the portal is not the only door: the database can be called directly with the same sign-in token.
-- So the check lives here too. `public.is_admin()` is what every owner-only rule asks. It used to say yes to anyone
-- whose account is marked owner. Now, if that account has a confirmed authenticator app, it also needs the session
-- to have passed the code step (the token's `aal` claim is "aal2"): a stolen password, or a session that only
-- ever used the password, gets none of the owner's powers.
--
--   * An owner who has NOT set up an authenticator app yet is unaffected (nothing changes until they do), so this
--     can be applied before they enrol and cannot lock anyone out.
--   * A half-finished setup (an app added but never confirmed) does not count.
--   * Everyone who is not the owner is unaffected.
--
-- It is SECURITY DEFINER because it has to look at auth.mfa_factors, which people's own sessions cannot read.
-- It reads only the caller's own row (auth.uid()) and returns a yes/no.
--
-- If the owner loses their phone: `node --env-file=.env.local scripts/portal-admin.mjs mfa-reset <email>` removes
-- their authenticator apps (it uses the secret key), and the portal then asks them to set it up again.
--
-- Safe to run more than once.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
    and (
      coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      )
    )
$$;

-- Screenshots and files on tickets and comments.
-- Run once in the Supabase SQL editor AFTER 20261029000200_encrypted_content.sql.
--
-- How it works:
--   * The FILE is encrypted by the app (AES-256-GCM, same key as the text) and
--     stored in a PRIVATE bucket. Nobody can read the bucket directly: no
--     storage policies exist on purpose, so neither the public key nor a
--     signed-in user can touch an object. Only the app server (secret key)
--     can, and it only hands a file to someone who may see that ticket.
--   * This table records each file's ticket, size and (encrypted) name/type.
--     It follows the ticket's own access rules: if you can see the ticket you
--     can see its files; if you can write on it you can attach files.
--   * Files on the owner's internal notes are invisible to everyone else.

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  comment_id uuid references public.ticket_comments(id) on delete cascade,
  file_name text not null,          -- encrypted
  mime_type text not null,          -- encrypted
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id, created_at);
create index ticket_attachments_comment_idx on public.ticket_attachments (comment_id) where comment_id is not null;
create index ticket_attachments_created_by_idx on public.ticket_attachments (created_by);

alter table public.ticket_attachments enable row level security;

-- Read: you can see the ticket, and (if the file hangs off a comment) you can
-- see that comment. The comment lookup runs with YOUR rights, so a file on an
-- internal note is hidden along with the note.
create policy ticket_attachments_read on public.ticket_attachments for select to authenticated
  using (
    public.can_see_ticket(ticket_id)
    and (
      comment_id is null
      or exists (select 1 from public.ticket_comments c where c.id = ticket_attachments.comment_id)
    )
  );

-- Attach: you may write on this ticket, and the file is recorded as yours.
create policy ticket_attachments_create on public.ticket_attachments for insert to authenticated
  with check (created_by = (select auth.uid()) and public.can_write_ticket(ticket_id));

-- Everything else is the owner's.
create policy ticket_attachments_update on public.ticket_attachments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ticket_attachments_delete on public.ticket_attachments for delete to authenticated
  using (public.is_admin());

revoke all on public.ticket_attachments from anon, authenticated;
grant select, insert, update, delete on public.ticket_attachments to authenticated;  -- narrowed by the policies above

-- Private bucket for the encrypted file contents (5 MB cap per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('ticket-attachments', 'ticket-attachments', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

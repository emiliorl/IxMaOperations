import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptField } from "@/lib/field-crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { PreparedFile } from "./attachments";
import { attachmentPath, putEncrypted } from "./storage";

/**
 * Records and stores a batch of already-validated files for a ticket (and,
 * optionally, a comment). Per file: first the database row, written as the
 * SIGNED-IN USER — so row-level security decides whether they may attach to
 * this ticket at all — then the encrypted bytes. If the upload fails, the row
 * is removed again so nothing points at a missing file.
 *
 * Returns how many files could NOT be saved (0 = all good). The ticket or
 * comment itself is already created by then, so a failure is reported, not fatal.
 */
export async function saveAttachments(options: {
  supabase: SupabaseClient;
  userId: string;
  ticketId: string;
  commentId?: string | null;
  files: PreparedFile[];
}): Promise<number> {
  let failed = 0;
  for (const file of options.files) {
    const { data: row, error } = await options.supabase
      .from("ticket_attachments")
      .insert({
        ticket_id: options.ticketId,
        comment_id: options.commentId ?? null,
        file_name: encryptField(file.name),
        mime_type: encryptField(file.mime),
        size_bytes: file.bytes.length,
        created_by: options.userId,
      })
      .select("id")
      .single();
    if (error || !row) {
      failed++;
      continue;
    }
    const stored = await putEncrypted(attachmentPath(options.ticketId, row.id), file.bytes);
    if (!stored) {
      failed++;
      // Clients can't delete rows (owner-only), so clean up the orphan with the server key.
      await supabaseAdmin().from("ticket_attachments").delete().eq("id", row.id);
    }
  }
  return failed;
}

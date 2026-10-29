import "server-only";
import { decryptBuffer, encryptBuffer } from "@/lib/field-crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Encrypted file storage for ticket attachments. The bucket is private and has
 * no storage policies, so it can only be reached with the owner-only secret
 * key — which is used here and ONLY here, for moving encrypted bytes. Who may
 * see a file is decided before this is called (row-level security on the
 * ticket_attachments row, run as the signed-in user); this module never
 * decides access.
 *
 * What is stored is always ciphertext (AES-256-GCM). Plain bytes exist only in
 * memory inside the app server.
 */
const BUCKET = "ticket-attachments";

export const attachmentPath = (ticketId: string, attachmentId: string) => `${ticketId}/${attachmentId}`;

export async function putEncrypted(path: string, plain: Buffer): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, encryptBuffer(plain), { contentType: "application/octet-stream", upsert: false });
  if (error) console.error("[attachments] upload failed:", error.message);
  return !error;
}

export async function getDecrypted(path: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) {
    console.error("[attachments] download failed:", error?.message);
    return null;
  }
  return decryptBuffer(Buffer.from(await data.arrayBuffer()));
}

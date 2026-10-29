/**
 * GET /api/portal/attachments/<id>
 *
 * Hands a ticket attachment to someone allowed to see it. The order is the
 * whole point:
 *   1. the caller must be signed in (the session is verified, not assumed);
 *   2. the attachment row is read AS THAT USER — row-level security returns it
 *      only if they can see the ticket (and the comment, for files on a note).
 *      A file you may not see is indistinguishable from one that doesn't exist;
 *   3. only then is the encrypted file fetched with the server key and
 *      decrypted in memory.
 * Files are served with their own safe type, never sniffed, never executed:
 * images may display in a page, everything else is a download.
 */
import { NextResponse } from "next/server";
import { decryptLoose } from "@/lib/field-crypto";
import { INLINE_TYPES, sanitizeFileName } from "@/lib/portal/attachments";
import { attachmentPath, getDecrypted } from "@/lib/portal/storage";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id) || !supabaseConfigured()) return NOT_FOUND();

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const { data: row } = await supabase
    .from("ticket_attachments")
    .select("id,ticket_id,file_name,mime_type")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NOT_FOUND();

  let bytes: Buffer | null;
  try {
    bytes = await getDecrypted(attachmentPath(row.ticket_id, row.id));
  } catch (error) {
    console.error("[attachments] decrypt failed:", error);
    return new NextResponse("This file could not be read.", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  if (!bytes) return NOT_FOUND();

  const mime = decryptLoose(row.mime_type) ?? "application/octet-stream";
  const name = sanitizeFileName(decryptLoose(row.file_name) ?? "file");
  const inline = INLINE_TYPES.has(mime) && new URL(req.url).searchParams.get("download") !== "1";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": inline ? mime : "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}

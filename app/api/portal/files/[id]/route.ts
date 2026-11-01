/**
 * GET /api/portal/files/<id>
 *
 * Hands a shared project file (installer, deliverable) to someone allowed to
 * see it. Same order as attachments: signed in and past two-step; the row is
 * read AS THAT USER (row-level security returns it only to the project, team
 * or problem it was shared with); only then is the encrypted file fetched with
 * the server key and decrypted in memory. Always served as a download.
 */
import { NextResponse } from "next/server";
import { decryptLoose } from "@/lib/field-crypto";
import { twoStepComplete } from "@/lib/portal/auth";
import { sanitizeFileName } from "@/lib/portal/attachments";
import { getDecryptedProjectFile, projectFilePath } from "@/lib/portal/storage";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id) || !supabaseConfigured()) return NOT_FOUND();

  if (!(await twoStepComplete())) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const supabase = await createSupabaseServer();

  const { data: row } = await supabase.from("project_files").select("id,project_id,file_name").eq("id", id).maybeSingle();
  if (!row) return NOT_FOUND();

  let bytes: Buffer | null;
  try {
    bytes = await getDecryptedProjectFile(projectFilePath(row.project_id, row.id));
  } catch (error) {
    console.error("[project-files] decrypt failed:", error);
    return new NextResponse("This file could not be read.", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  if (!bytes) return NOT_FOUND();

  const name = sanitizeFileName(decryptLoose(row.file_name) ?? "file");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}

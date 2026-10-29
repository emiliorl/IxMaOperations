/**
 * Rules for files people attach to tickets and comments (screenshots, logs,
 * PDFs — whatever lets the owner recreate a problem). Pure, so the same
 * checks run in the browser (instant feedback) and on the server (the real
 * gate, because the browser is never trusted).
 *
 * Limits: Vercel caps a serverless request body at about 4.5 MB, and every file
 * goes through the server (it is encrypted there before storage), so one
 * submission may carry at most 4 MB in total. Bigger files should be shared
 * as a link in the description.
 */
export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

/** extension -> the content type we will serve it as (never the browser's claim). */
export const ALLOWED_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
};

/** Safe to show inside a page. Everything else is download-only. (No SVG: it can carry script.) */
export const INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/** Value for the <input accept="..."> attribute. */
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export type FileProblem = "too_many" | "too_big" | "bad_type" | "empty";

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** A file name that is safe to store and to put in a download header. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  const trimmed = cleaned.length > 120 ? cleaned.slice(-120) : cleaned;
  return trimmed || "file";
}

interface FileLike {
  name: string;
  size: number;
  lastModified?: number;
}

/** The same file picked twice (same name, size and date) is one file. */
export const fileKey = (file: FileLike): string => `${file.name}|${file.size}|${file.lastModified ?? 0}`;

/** Adds newly picked files to the ones already chosen, in order, skipping duplicates. */
export function mergeFiles<T extends FileLike>(current: T[], added: T[]): T[] {
  const seen = new Set(current.map(fileKey));
  const merged = [...current];
  for (const file of added) {
    const key = fileKey(file);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(file);
    }
  }
  return merged;
}

/** Metadata-only check, usable in the browser before anything is uploaded. */
export function checkFiles(files: { name: string; size: number }[]): FileProblem | null {
  if (files.length > MAX_FILES) return "too_many";
  let total = 0;
  for (const file of files) {
    if (file.size <= 0) return "empty";
    if (!ALLOWED_TYPES[extensionOf(file.name)]) return "bad_type";
    total += file.size;
  }
  return total > MAX_TOTAL_BYTES ? "too_big" : null;
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((b, i) => bytes[offset + i] === b);

/** Does the content really look like what the extension claims? */
export function contentMatches(extension: string, bytes: Uint8Array): boolean {
  switch (extension) {
    case "png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
    case "jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "gif":
      return startsWith(bytes, [0x47, 0x49, 0x46, 0x38]);
    case "webp":
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
    case "pdf":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
    case "zip":
      return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]);
    default: {
      // Text types: reject anything with NUL bytes near the start (a binary renamed to .txt).
      const head = bytes.subarray(0, 4096);
      return !head.includes(0);
    }
  }
}

export interface PreparedFile {
  name: string;
  mime: string;
  bytes: Buffer;
}

/** Server-side: read, re-check and normalise the uploaded files. */
export async function prepareFiles(files: File[]): Promise<{ ok: true; files: PreparedFile[] } | { ok: false; error: FileProblem }> {
  const problem = checkFiles(files);
  if (problem) return { ok: false, error: problem };
  const prepared: PreparedFile[] = [];
  for (const file of files) {
    const extension = extensionOf(file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!contentMatches(extension, bytes)) return { ok: false, error: "bad_type" };
    prepared.push({ name: sanitizeFileName(file.name), mime: ALLOWED_TYPES[extension], bytes });
  }
  return { ok: true, files: prepared };
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

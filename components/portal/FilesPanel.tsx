import { getTranslations } from "next-intl/server";
import type { SharedFile } from "@/lib/portal/queries";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

function size(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Downloads shared with this person. Renders nothing when there are none. The download itself is checked again by /api/portal/files/<id>. */
export async function FilesPanel({ files, folderLabel, number }: { files: SharedFile[]; folderLabel: (departmentId: string | null) => string; number?: string }) {
  if (files.length === 0) return null;
  const t = await getTranslations("Portal");
  return (
    <section className={panel}>
      <div className={band}>
        <span>
          {number && <span className="text-zinc-600">{`// ${number} `}</span>}
          {t("filesTitle")}
        </span>
      </div>
      <ul className="divide-y divide-zinc-800/80">
        {files.map((f) => (
          <li key={f.id}>
            {/* A plain link: the route sends it as a download and the browser carries the session cookie. */}
            <a href={`/api/portal/files/${f.id}`} download className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3 text-sm text-zinc-200 hover:bg-zinc-900/60 hover:text-white">
              <span className="min-w-0">
                <span className="block truncate">{f.label ?? f.name}</span>
                <span className="block truncate font-mono text-[11px] text-zinc-500">
                  {f.label ? `${f.name} · ` : ""}
                  {folderLabel(f.departmentId)}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[11px] text-zinc-500">
                {size(f.sizeBytes)} ↓
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { humanSize } from "@/lib/portal/attachments";
import type { AttachmentInfo } from "@/lib/portal/queries";

/**
 * Files attached to a ticket or comment. Every link goes through
 * /api/portal/attachments/<id>, which checks the viewer may see the ticket
 * before decrypting anything. Images show as thumbnails; everything else is a
 * download.
 */
export async function AttachmentList({ items }: { items: AttachmentInfo[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("Portal");
  const images = items.filter((item) => item.isImage);
  const others = items.filter((item) => !item.isImage);

  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{t("attachments")}</p>
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((item) => (
            <li key={item.id}>
              <a href={`/api/portal/attachments/${item.id}`} target="_blank" rel="noreferrer noopener" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- served by our own authenticated route, not optimizable */}
                <img
                  src={`/api/portal/attachments/${item.id}`}
                  alt={item.name}
                  loading="lazy"
                  className="max-h-40 max-w-[16rem] rounded-md border border-zinc-800 object-contain bg-zinc-950"
                />
              </a>
              <p className="mt-1 max-w-[16rem] truncate font-mono text-[11px] text-zinc-500">{item.name}</p>
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className="space-y-1.5">
          {others.map((item) => (
            <li key={item.id} className="text-xs">
              <a
                href={`/api/portal/attachments/${item.id}?download=1`}
                className="font-mono text-zinc-300 underline underline-offset-4 hover:text-white"
              >
                {item.name}
              </a>{" "}
              <span className="text-zinc-600">· {humanSize(item.size)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

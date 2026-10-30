import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Minimal portal footer: who you're working with, plus the legal pages. */
export async function PortalFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t border-zinc-800 py-6 text-xs text-zinc-500">
      <div className="container mx-auto px-6 max-w-5xl flex flex-wrap items-center justify-between gap-3">
        <span>© IxMa Operations</span>
        <span className="flex items-center gap-5 [&_a]:inline-block [&_a]:py-3 sm:[&_a]:py-1">
          <Link href="/privacy" className="hover:text-zinc-200">{t("privacy")}</Link>
          <Link href="/terms" className="hover:text-zinc-200">{t("terms")}</Link>
        </span>
      </div>
    </footer>
  );
}

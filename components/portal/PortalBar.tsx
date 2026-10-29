import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/[locale]/portal/actions";

/**
 * Thin band under the site header on every signed-in portal page: where you
 * are, who you are, and sign out. Deliberately unobtrusive — the portal is a
 * working tool, not a destination.
 */
export async function PortalBar({ name, isAdmin, locale }: { name: string; isAdmin: boolean; locale: string }) {
  const t = await getTranslations("Portal");
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/40">
      <div className="container mx-auto px-6 max-w-5xl flex items-center justify-between gap-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <span>
          <span className="text-zinc-600">{"// "}</span>
          {t("eyebrow")}
        </span>
        <form action={signOut} className="flex items-center gap-4 normal-case tracking-normal">
          <input type="hidden" name="locale" value={locale} />
          <span className="text-zinc-400">
            {name}
            {isAdmin && <span className="ml-2 uppercase tracking-wider text-zinc-600">· {t("ownerBadge")}</span>}
          </span>
          <button type="submit" className="text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}

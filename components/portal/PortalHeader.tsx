import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/[locale]/portal/actions";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { getPortalSession } from "@/lib/portal/auth";

/**
 * The portal's own header. People here are already clients, so there is no
 * sales navigation and no "Get Started": just the logo (back to their
 * projects), the language switch, who they are, change password and sign out.
 */
export async function PortalHeader({ locale }: { locale: string }) {
  const [t, session] = await Promise.all([getTranslations("Portal"), getPortalSession()]);

  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between gap-4 max-w-5xl">
        <Link href="/portal" className="flex items-center gap-2.5 group min-w-0">
          <Image src="/logo-icon.svg" alt="IxMa Operations" width={24} height={24} className="w-6 h-6 object-contain" priority />
          <span className="font-semibold text-sm tracking-tight text-white group-hover:text-zinc-200 transition-colors">
            IxMa Operations
          </span>
          <span className="hidden sm:inline border-l border-zinc-800 pl-2.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            {t("eyebrow")}
          </span>
        </Link>

        <div className="flex items-center gap-4 text-xs">
          <LanguageSwitcher />
          {session && (
            <>
              <span className="hidden md:inline text-zinc-400">
                {session.name}
                {session.isAdmin && <span className="ml-2 font-mono uppercase tracking-wider text-zinc-600">· {t("ownerBadge")}</span>}
              </span>
              <Link href="/portal/set-password" className="hidden sm:inline text-zinc-500 hover:text-zinc-200">
                {t("changePassword")}
              </Link>
              <form action={signOut}>
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
                  {t("signOut")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

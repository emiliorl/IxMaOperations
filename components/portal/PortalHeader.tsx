import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/[locale]/portal/actions";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { AccountMenu } from "@/components/portal/AccountMenu";
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
        <Link href="/portal" className="flex items-center gap-3 group min-w-0">
          <Image
            src="/ixma-operations-lockup-jade.svg"
            alt="IxMa Operations"
            width={114}
            height={36}
            className="h-8 sm:h-9 w-auto object-contain transition-opacity group-hover:opacity-90"
            priority
          />
          <span className="hidden sm:inline border-l border-zinc-800 pl-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            {t("eyebrow")}
          </span>
        </Link>

        <div className="flex items-center gap-4 text-xs">
          {session ? (
            <>
              <AccountMenu name={session.name} email={session.email} isAdmin={session.isAdmin} signOutFormId="portal-sign-out" />
              {/* The menu's "Sign out" button submits this form (linked by id). */}
              <form id="portal-sign-out" action={signOut} className="hidden">
                <input type="hidden" name="locale" value={locale} />
              </form>
            </>
          ) : (
            // Signed out (the login page): there is no account to open, so just the language toggle.
            <LanguageSwitcher />
          )}
        </div>
      </div>
    </header>
  );
}

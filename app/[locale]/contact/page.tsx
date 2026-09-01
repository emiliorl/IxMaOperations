import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, Mail } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Contact" });
  return {
    title: `${t("title")} — IxMaOperations`,
    description: t("description"),
  };
}

/**
 * Direct-contact page (PROJECT_BLUEPRINT.md Section 6). This is the
 * "direct line" — its first job is the email CTA, for anyone who wants to
 * reach a person rather than fill out a structured request.
 *
 * Sep 1, 2026 (client-journey review): previously described itself as a
 * fallback and offered two flat, equal-weight buttons out to /packages and
 * /custom-projects — a weak hand-off for the page's real second job. Per
 * Emilio's own framing (contact = direct, custom-projects = the form +
 * call-booking intake engine — see the antigravity implementation plan's
 * "DECIDED" note), the two pages stay separate URLs; this page now leads
 * with the direct email, then a single clear "Start a Project" bridge into
 * /custom-projects for anyone who arrived here first but actually wants a
 * structured request, with browsing packages demoted to a plain secondary
 * link for the visitor who isn't sure yet.
 */
export default async function ContactPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("Contact");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-2xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{t("title")}</h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">{t("description")}</p>
        </div>

        <a
          href="mailto:eramirez@ixmaoperations.com"
          className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 w-fit" })}
        >
          <Mail className="h-4 w-4" />
          eramirez@ixmaoperations.com
        </a>

        <div className="pt-6 border-t border-zinc-800 space-y-4">
          <div className="space-y-1">
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">{t("bridgeHeading")}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">{t("bridgeDescription")}</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/custom-projects" className={buttonVariants({ size: "default", variant: "secondary", className: "gap-2 w-fit" })}>
              {t("startProject")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/packages" className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 w-fit">
              {t("browsePackages")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

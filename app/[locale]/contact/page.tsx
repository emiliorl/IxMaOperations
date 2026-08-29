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
 * General fallback contact page (PROJECT_BLUEPRINT.md Section 6) — for
 * anything that doesn't fit the two main paths. Most visitors should land
 * on /packages or /custom-projects instead; this exists so the header/
 * footer "Contact" link isn't a dead end.
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
          href="mailto:emilio.alejandrorl19@gmail.com"
          className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 w-fit" })}
        >
          <Mail className="h-4 w-4" />
          emilio.alejandrorl19@gmail.com
        </a>

        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
          <Link href="/packages" className={buttonVariants({ size: "default", variant: "secondary", className: "gap-2" })}>
            {t("browsePackages")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/custom-projects" className={buttonVariants({ size: "default", variant: "secondary", className: "gap-2" })}>
            {t("describeCustomProject")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

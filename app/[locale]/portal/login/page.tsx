import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { LoginForm } from "@/components/portal/LoginForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { currentUser } from "@/lib/portal/auth";
import { supabaseConfigured } from "@/lib/supabase/server";

export default async function PortalLoginPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await props.params;
  const { error } = await props.searchParams;
  setRequestLocale(locale);
  if (!supabaseConfigured()) notFound();
  if (await currentUser()) redirect({ href: "/portal", locale });

  const t = await getTranslations("Portal");
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-lg space-y-8">
        <SectionHeader as="h1" index="00" label={t("eyebrow")} title={t("loginTitle")} description={t("loginDescription")} />
        {/* An invite link that was already used or has expired lands here. */}
        {error === "link" && (
          <p role="alert" className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-amber-400 leading-relaxed">
            {t("linkExpired")}
          </p>
        )}
        <LoginForm locale={locale} />
        <p className="text-xs text-zinc-500 leading-relaxed">{t("noAccount")}</p>
      </div>
    </div>
  );
}

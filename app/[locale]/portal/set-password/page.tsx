import { getTranslations, setRequestLocale } from "next-intl/server";
import { PasswordForm } from "@/components/portal/PasswordForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";

/**
 * Choose (or change) your password. A person whose account the owner just
 * created is sent here from every other portal page until they do — nobody
 * keeps a temporary password.
 */
export default async function SetPasswordPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { mustChangePassword } = await requireUser(locale, { allowPasswordChange: true });
  const t = await getTranslations("Portal");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-lg space-y-8">
        <SectionHeader
          as="h1"
          index="00"
          label={t("eyebrow")}
          title={mustChangePassword ? t("setPasswordTitleFirst") : t("setPasswordTitle")}
          description={mustChangePassword ? t("setPasswordHelpFirst") : t("setPasswordHelp")}
        />
        <PasswordForm locale={locale} />
      </div>
    </div>
  );
}

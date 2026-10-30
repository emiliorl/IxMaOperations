import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { signOut } from "@/app/[locale]/portal/actions";
import { TwoStepVerifyForm } from "@/components/portal/TwoStepVerifyForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";

/**
 * Sign-in, second step. Anyone who has set up an authenticator app lands here from every portal page until they
 * enter a code in this session. Someone who doesn't need it (already verified, or no app set up) is sent on.
 */
export default async function VerifyPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { twoStep } = await requireUser(locale, { allowTwoStep: true });
  if (twoStep === "ok") redirect({ href: "/portal", locale });
  if (twoStep === "enroll") redirect({ href: "/portal/two-step", locale });
  const t = await getTranslations("Portal");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-lg space-y-8">
        <SectionHeader as="h1" index="00" label={t("eyebrow")} title={t("twoStepVerifyTitle")} description={t("twoStepVerifyIntro")} />
        <TwoStepVerifyForm locale={locale} />
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-200">
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}

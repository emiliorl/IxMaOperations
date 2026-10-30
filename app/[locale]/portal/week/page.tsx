import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { WeekView } from "@/components/portal/WeekView";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { getMyTimeZone } from "@/lib/portal/queries";
import { loadWeek } from "@/lib/portal/week";

/**
 * The owner's week: the next seven days across every project, on the owner's own clock. Meetings and days at an
 * office on one side; what needs the owner and what is due on the other (see components/portal/WeekView.tsx).
 * Owner only: anyone else goes home.
 */
export default async function WeekPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { supabase, user, isAdmin } = await requireUser(locale);
  if (!isAdmin) redirect({ href: "/portal", locale });

  const timeZone = await getMyTimeZone(supabase, user.id);
  const [t, week] = await Promise.all([getTranslations("Portal"), loadWeek(supabase, Date.now(), timeZone)]);

  return (
    <div className="py-8 md:py-14">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-6 md:space-y-8">
        <SectionHeader as="h1" index="00" label={t("eyebrow")} title={t("weekTitle")} description={t("weekDescription")} />
        <WeekView week={week} locale={locale} timeZone={timeZone} />
      </div>
    </div>
  );
}

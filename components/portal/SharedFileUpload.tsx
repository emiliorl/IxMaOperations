"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { addSharedFile, type FormState } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Field, selectClass } from "./Field";
import { errorMessageKey } from "./error-messages";

/**
 * Owner: share a file. On a problem page the audience is fixed (the people who can open that problem);
 * on the project page the owner picks the whole project or one team. The server action re-checks everything.
 */
export function SharedFileUpload({
  locale,
  projectSlug,
  milestoneId,
  teams,
}: {
  locale: string;
  projectSlug: string;
  /** Set on a problem page: the file belongs to this problem. */
  milestoneId?: string;
  /** Offered on the project page only. */
  teams?: { id: string; name: string }[];
}) {
  const t = useTranslations("Portal");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(addSharedFile, {});

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new result
  }, [state]);

  return (
    <details className="group border-t border-zinc-800/80">
      <summary className="cursor-pointer list-none px-5 sm:px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-400 hover:text-white">
        + {t("adminAddFile")}
      </summary>
      <form ref={formRef} action={formAction} className="space-y-4 px-5 sm:px-6 pb-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="projectSlug" value={projectSlug} />
        {milestoneId && <input type="hidden" name="milestoneId" value={milestoneId} />}
        <Field index="01" label={t("adminFile")} htmlFor="sf-file" help={t("adminFileHelp")}>
          <input id="sf-file" name="files" type="file" required className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-100" />
        </Field>
        <Field index="02" label={t("adminFileLabel")} htmlFor="sf-label">
          <Input id="sf-label" name="label" maxLength={120} />
        </Field>
        {!milestoneId && teams && (
          <Field index="03" label={t("adminFileAudience")} htmlFor="sf-dept">
            <select id="sf-dept" name="departmentId" defaultValue="" className={selectClass}>
              <option value="">{t("deptProjectWide")}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("adminUpload")}
          </button>
          {state.ok && <span className="text-xs text-emerald-400">{t("adminSaved")}</span>}
          {state.error && (
            <p role="alert" className="text-xs text-red-400">
              {t(errorMessageKey(state.error, "ticket"))}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}

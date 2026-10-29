import { getTranslations } from "next-intl/server";
import {
  removeCompanyAccess,
  removeMemberAccess,
  saveCompanyAccess,
  saveMemberAccess,
} from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CompanyAccessEntry, Department, TeamMember } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";
import { selectClass } from "./Field";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const label = "font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const check = "flex items-center gap-2 text-xs text-zinc-300 cursor-pointer";

/**
 * Owner-only. Everything here writes through the owner's own signed-in
 * session, so the database — not this page — enforces that only the owner can
 * change who sees what (supabase/tests/portal-rls.test.ts). Shown only to the
 * owner, but even if someone forced these forms to render, every action would
 * be refused.
 */
export async function AccessPanel({
  locale,
  projectSlug,
  organizationId,
  departments,
  team,
  companyAccess,
  notice,
}: {
  locale: string;
  projectSlug: string;
  organizationId: string;
  /** Every folder of the project (the owner sees all of them). */
  departments: Department[];
  team: TeamMember[];
  companyAccess: CompanyAccessEntry[];
  notice: "saved" | "error" | null;
}) {
  const t = await getTranslations("Portal");

  const hidden = (userId?: string) => (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="projectSlug" value={projectSlug} />
      {userId && <input type="hidden" name="userId" value={userId} />}
    </>
  );

  const roleSelect = (value: string) => (
    <select name="role" defaultValue={value} aria-label={t("roleLabel")} className={cn(selectClass, "h-8 w-auto text-xs")}>
      <option value="lead">{t("memberRole.lead")}</option>
      <option value="member">{t("memberRole.member")}</option>
    </select>
  );

  const folderChecks = (member?: TeamMember) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label className={check}>
        <input type="checkbox" name="allDepartments" defaultChecked={member?.allDepartments} className="accent-zinc-300" />
        {t("allFolders")}
      </label>
      {departments.map((d) => (
        <label key={d.id} className={cn(check, "text-zinc-400")}>
          <input type="checkbox" name="departmentId" value={d.id} defaultChecked={member?.departmentIds.includes(d.id)} className="accent-zinc-300" />
          {d.name}
        </label>
      ))}
    </div>
  );

  const levelSelect = (value: string) => (
    <select name="level" defaultValue={value} aria-label={t("accessTitle")} className={cn(selectClass, "h-8 w-auto text-xs")}>
      <option value="full">{t("accessLevel.full")}</option>
      <option value="view">{t("accessLevel.view")}</option>
    </select>
  );

  return (
    <section id="access" className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className={band}>
        <span>
          <span className="text-zinc-600">{"// 04 "}</span>
          {t("accessTitle")}
        </span>
        <span className="normal-case tracking-normal text-zinc-600">{t("ownerBadge")}</span>
      </div>

      <div className="p-5 sm:p-6 space-y-8">
        {notice && (
          <p role="status" className={cn("text-xs", notice === "saved" ? "text-green-500" : "text-red-400")}>
            {notice === "saved" ? t("accessSaved") : t("accessError")}
          </p>
        )}

        {/* Company-wide */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-100">{t("companyAccessTitle")}</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-2xl">{t("companyAccessHelp")}</p>
          </div>

          {companyAccess.length === 0 ? (
            <p className="text-xs text-zinc-500">{t("noCompanyAccess")}</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80 rounded-md border border-zinc-800">
              {companyAccess.map((person) => (
                <li key={person.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-100">{person.name}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{person.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={saveCompanyAccess} className="flex items-center gap-2">
                      {hidden(person.userId)}
                      <input type="hidden" name="organizationId" value={organizationId} />
                      {levelSelect(person.level)}
                      <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        {t("save")}
                      </button>
                    </form>
                    <form action={removeCompanyAccess}>
                      {hidden(person.userId)}
                      <input type="hidden" name="organizationId" value={organizationId} />
                      <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        {t("remove")}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={saveCompanyAccess} className="flex flex-wrap items-end gap-3">
            {hidden()}
            <input type="hidden" name="organizationId" value={organizationId} />
            <div className="space-y-1.5">
              <label htmlFor="company-email" className={label}>{t("personEmail")}</label>
              <Input id="company-email" name="email" type="email" required className="h-8 w-64 text-xs" />
            </div>
            {levelSelect("full")}
            <button type="submit" className={buttonVariants({ size: "sm" })}>
              {t("add")}
            </button>
          </form>
          <p className="text-[11px] text-zinc-600 leading-relaxed max-w-2xl">
            <span className="text-zinc-500">{t("accessLevel.full")}:</span> {t("accessLevelHelp.full")}{" "}
            <span className="text-zinc-500">{t("accessLevel.view")}:</span> {t("accessLevelHelp.view")}
          </p>
        </div>

        {/* Project team and folders */}
        <div className="space-y-3 border-t border-zinc-800 pt-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-100">{t("projectAccessTitle")}</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-2xl">{t("projectAccessHelp")}</p>
          </div>

          <ul className="divide-y divide-zinc-800/80 rounded-md border border-zinc-800">
            {team.map((member) => (
              <li key={member.userId} className="px-4 py-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-zinc-100">{member.name}</p>
                  <form action={removeMemberAccess}>
                    {hidden(member.userId)}
                    <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      {t("remove")}
                    </button>
                  </form>
                </div>
                <form action={saveMemberAccess} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  {hidden(member.userId)}
                  {roleSelect(member.role)}
                  {folderChecks(member)}
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    {t("save")}
                  </button>
                </form>
              </li>
            ))}
          </ul>

          <form action={saveMemberAccess} className="space-y-3 rounded-md border border-dashed border-zinc-800 p-4">
            {hidden()}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label htmlFor="member-email" className={label}>{t("personEmail")}</label>
                <Input id="member-email" name="email" type="email" required className="h-8 w-64 text-xs" />
              </div>
              {roleSelect("member")}
            </div>
            {folderChecks()}
            <button type="submit" className={buttonVariants({ size: "sm" })}>
              {t("add")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

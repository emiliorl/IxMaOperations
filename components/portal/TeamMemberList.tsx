"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Shield, User, Folder, Check, X } from "lucide-react";
import { removeMemberAccess, saveMemberAccess } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Department, TeamMember } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";
import { selectClass } from "./Field";
import { InviteLink } from "./InviteLink";

const checkClass = "flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer";

export function TeamMemberList({
  team,
  departments,
  costUserIds,
  projectSlug,
  locale,
}: {
  team: TeamMember[];
  departments: Department[];
  costUserIds: string[];
  projectSlug: string;
  locale: string;
}) {
  const t = useTranslations("Portal");
  const [query, setQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return team.filter((m) => {
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);

      const matchDept =
        !selectedDept ||
        m.allDepartments ||
        m.departmentIds.includes(selectedDept);

      return matchQuery && matchDept;
    });
  }, [team, query, selectedDept]);

  return (
    <div className="space-y-4">
      {/* Search and department filter bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchUsersPlaceholder")}
            className="h-8.5 pl-8.5 text-xs bg-zinc-950/70 border-zinc-800"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {departments.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedDept(null)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                selectedDept === null
                  ? "border border-zinc-700 bg-zinc-800 text-white"
                  : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              )}
            >
              {t("filterAll")} ({team.length})
            </button>
            {departments.map((d) => {
              const count = team.filter((m) => m.allDepartments || m.departmentIds.includes(d.id)).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDept(selectedDept === d.id ? null : d.id)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    selectedDept === d.id
                      ? "border border-zinc-600 bg-zinc-800 text-white"
                      : "border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {d.name} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filteredMembers.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/20 px-4 py-6 text-center text-xs text-zinc-500">
          {t("noUsersFound")}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/80 rounded-md border border-zinc-800 bg-zinc-900/20">
          {filteredMembers.map((member) => {
            const memberDepts = member.allDepartments
              ? null
              : departments.filter((d) => member.departmentIds.includes(d.id));

            return (
              <li key={member.userId} className="p-4 sm:p-5 space-y-3.5">
                {/* Header row: Name, Email badge, Role badge & Remove */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-zinc-100 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" aria-hidden />
                        {member.name}
                      </span>
                      {member.role === "lead" ? (
                        <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                          <Shield className="h-2.5 w-2.5" />
                          {t("memberRole.lead")}
                        </span>
                      ) : (
                        <span className="rounded border border-zinc-800 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                          {t("memberRole.member")}
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <p className="font-mono text-xs text-zinc-400">{member.email}</p>
                    )}
                  </div>

                  <form action={removeMemberAccess}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="projectSlug" value={projectSlug} />
                    <input type="hidden" name="userId" value={member.userId} />
                    <button
                      type="submit"
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs")}
                    >
                      {t("remove")}
                    </button>
                  </form>
                </div>

                {/* Assigned folders pill list */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-zinc-500 mr-1 flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {t("userFolders")}:
                  </span>
                  {member.allDepartments ? (
                    <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-200">
                      {t("allFolders")}
                    </span>
                  ) : memberDepts && memberDepts.length > 0 ? (
                    memberDepts.map((d) => (
                      <span
                        key={d.id}
                        className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300"
                      >
                        {d.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic">
                      {t("noFoldersAssigned")}
                    </span>
                  )}
                </div>

                {/* Edit access form (role, folder checks, cost view, save) */}
                <form
                  action={saveMemberAccess}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3 space-y-3"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="projectSlug" value={projectSlug} />
                  <input type="hidden" name="userId" value={member.userId} />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        name="role"
                        defaultValue={member.role}
                        aria-label={t("roleLabel")}
                        className={cn(selectClass, "h-8 text-xs w-auto")}
                      >
                        <option value="lead">{t("memberRole.lead")}</option>
                        <option value="member">{t("memberRole.member")}</option>
                      </select>

                      <label className={checkClass} title={t("costsHelp")}>
                        <input
                          type="checkbox"
                          name="canViewCosts"
                          defaultChecked={costUserIds.includes(member.userId)}
                          className="accent-zinc-300"
                        />
                        <span>{t("canSeeCosts")}</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "text-xs font-medium")}
                    >
                      {t("save")}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-800/60 pt-2.5">
                    <label className={cn(checkClass, "font-medium text-zinc-200")}>
                      <input
                        type="checkbox"
                        name="allDepartments"
                        defaultChecked={member.allDepartments}
                        className="accent-zinc-300"
                      />
                      {t("allFolders")}
                    </label>
                    {departments.map((d) => (
                      <label key={d.id} className={cn(checkClass, "text-zinc-400")}>
                        <input
                          type="checkbox"
                          name="departmentId"
                          value={d.id}
                          defaultChecked={member.departmentIds.includes(d.id)}
                          className="accent-zinc-300"
                        />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </form>

                {/* Email invitation & copyable link */}
                <InviteLink locale={locale} userId={member.userId} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Shield,
  User,
  Folder,
  Check,
  X,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { removeMemberAccess, saveMemberAccess } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Department, TeamMember } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";
import { selectClass } from "./Field";
import { InviteLink } from "./InviteLink";

const checkClass = "flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer";

interface TeamGroup {
  id: string;
  name: string;
  isGlobal?: boolean;
  members: TeamMember[];
  leaderCount: number;
}

type LoginFilter = "all" | "logged_in" | "pending";

function formatLoginDate(isoString: string | null | undefined, locale: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loginFilter, setLoginFilter] = useState<LoginFilter>("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Overall statistics
  const loggedInCount = useMemo(() => team.filter((m) => m.hasLoggedIn === true).length, [team]);
  const pendingCount = useMemo(() => team.filter((m) => m.hasLoggedIn === false).length, [team]);

  // 1. Filter members by search query and login status
  const filteredTeam = useMemo(() => {
    const q = query.trim().toLowerCase();
    return team.filter((m) => {
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);

      const matchStatus =
        loginFilter === "all" ||
        (loginFilter === "logged_in" && m.hasLoggedIn === true) ||
        (loginFilter === "pending" && m.hasLoggedIn === false);

      return matchQuery && matchStatus;
    });
  }, [team, query, loginFilter]);

  // 2. Group members by Team/Department, with Leaders sorted to the top
  const groups = useMemo<TeamGroup[]>(() => {
    const sortMembers = (list: TeamMember[]) =>
      [...list].sort((a, b) => {
        // Leaders first
        if (a.role === "lead" && b.role !== "lead") return -1;
        if (a.role !== "lead" && b.role === "lead") return 1;
        // Then alphabetical by name
        return a.name.localeCompare(b.name);
      });

    const result: TeamGroup[] = [];

    // Global / All Departments team
    const globalMembers = filteredTeam.filter((m) => m.allDepartments);
    if (globalMembers.length > 0) {
      const sorted = sortMembers(globalMembers);
      result.push({
        id: "global",
        name: t("globalTeamName"),
        isGlobal: true,
        members: sorted,
        leaderCount: sorted.filter((m) => m.role === "lead").length,
      });
    }

    // Specific Department teams
    for (const dept of departments) {
      const deptMembers = filteredTeam.filter((m) => !m.allDepartments && m.departmentIds.includes(dept.id));
      if (deptMembers.length > 0 || (!query && loginFilter === "all")) {
        const sorted = sortMembers(deptMembers);
        result.push({
          id: dept.id,
          name: dept.name,
          members: sorted,
          leaderCount: sorted.filter((m) => m.role === "lead").length,
        });
      }
    }

    // Unassigned team (if any)
    const unassigned = filteredTeam.filter((m) => !m.allDepartments && m.departmentIds.length === 0);
    if (unassigned.length > 0) {
      const sorted = sortMembers(unassigned);
      result.push({
        id: "unassigned",
        name: t("unassignedTeamName"),
        members: sorted,
        leaderCount: sorted.filter((m) => m.role === "lead").length,
      });
    }

    return result;
  }, [filteredTeam, departments, query, loginFilter, t]);

  // Displayed groups based on team filter pill
  const activeGroups = useMemo(() => {
    if (!selectedTeamId) return groups;
    return groups.filter((g) => g.id === selectedTeamId);
  }, [groups, selectedTeamId]);

  const totalMembers = filteredTeam.length;

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
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

          {/* Login Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setLoginFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                loginFilter === "all"
                  ? "border border-zinc-700 bg-zinc-800 text-white"
                  : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              )}
            >
              {t("filterAllStatus")} ({team.length})
            </button>
            <button
              type="button"
              onClick={() => setLoginFilter(loginFilter === "logged_in" ? "all" : "logged_in")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1",
                loginFilter === "logged_in"
                  ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-emerald-400"
              )}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              {t("filterLoggedIn")} ({loggedInCount})
            </button>
            <button
              type="button"
              onClick={() => setLoginFilter(loginFilter === "pending" ? "all" : "pending")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1",
                loginFilter === "pending"
                  ? "border border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : "border border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-amber-400"
              )}
            >
              <Clock className="h-3 w-3 text-amber-400" />
              {t("filterPendingLogin")} ({pendingCount})
            </button>
          </div>
        </div>

        {/* Quick Team Filter Pills */}
        {groups.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs border-t border-zinc-800/60 pt-2.5">
            <span className="text-[11px] text-zinc-500 mr-1 flex items-center gap-1">
              <Folder className="h-3 w-3" />
              {t("userFolders")}:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTeamId(null)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                selectedTeamId === null
                  ? "border border-zinc-700 bg-zinc-800 text-white"
                  : "border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              )}
            >
              {t("filterAll")} ({totalMembers})
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedTeamId(selectedTeamId === group.id ? null : group.id)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  selectedTeamId === group.id
                    ? "border border-zinc-600 bg-zinc-800 text-white"
                    : "border border-zinc-800/80 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {group.name} ({group.members.length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* High-Density Grouped Tables */}
      {totalMembers === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 px-4 py-8 text-center text-xs text-zinc-500">
          {t("noUsersFound")}
        </div>
      ) : (
        <div className="space-y-4">
          {activeGroups.map((group) => {
            if (group.members.length === 0) return null;

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-lg border border-zinc-800/90 bg-zinc-950/40 shadow-sm"
              >
                {/* Team Group Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                    <span className="font-semibold text-xs text-zinc-100 uppercase tracking-wider">
                      {group.name}
                    </span>
                    <span className="rounded-full bg-zinc-800 border border-zinc-700/80 px-2 py-0.2 text-[10px] font-mono text-zinc-300">
                      {group.members.length}
                    </span>
                  </div>
                  {group.leaderCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90">
                      <Shield className="h-3 w-3" />
                      {group.leaderCount} {group.leaderCount === 1 ? t("leaderBadge") : `${t("leaderBadge")}es`}
                    </span>
                  )}
                </div>

                {/* Team Members Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300 border-collapse">
                    <thead className="border-b border-zinc-800/80 bg-zinc-950/60 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="py-2.5 px-3.5 font-medium">{t("tableHeaderMember")}</th>
                        <th className="py-2.5 px-3 font-medium">{t("tableHeaderRole")}</th>
                        <th className="py-2.5 px-3 font-medium">{t("tableHeaderStatus")}</th>
                        <th className="py-2.5 px-3 font-medium hidden sm:table-cell">{t("tableHeaderFolders")}</th>
                        <th className="py-2.5 px-3 font-medium text-center hidden md:table-cell">{t("tableHeaderCosts")}</th>
                        <th className="py-2.5 px-3.5 font-medium text-right">{t("tableHeaderActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {group.members.map((member) => {
                        const isLeader = member.role === "lead";
                        const isEditing = editingUserId === member.userId;
                        const canSeeCosts = costUserIds.includes(member.userId);
                        const memberDepts = member.allDepartments
                          ? null
                          : departments.filter((d) => member.departmentIds.includes(d.id));

                        const lastLogin = formatLoginDate(member.lastSignInAt, locale);
                        const lastLoginTooltip = lastLogin
                          ? t("lastLogin", { date: lastLogin })
                          : t("statusLoggedIn");

                        return (
                          <tr
                            key={member.userId}
                            className={cn(
                              "transition-colors",
                              isLeader ? "bg-amber-500/[0.02]" : "hover:bg-zinc-900/30",
                              isEditing && "bg-zinc-900/50"
                            )}
                          >
                            {/* Member Name & Email */}
                            <td className="py-2.5 px-3.5 align-middle">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={cn(
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                                    isLeader
                                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                                      : "border-zinc-700 bg-zinc-800 text-zinc-200"
                                  )}
                                >
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-xs text-white truncate">{member.name}</p>
                                  {member.email && (
                                    <p className="font-mono text-[11px] text-zinc-400 truncate">{member.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                              {isLeader ? (
                                <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 shadow-sm">
                                  <Shield className="h-2.5 w-2.5" />
                                  {t("leaderBadge")}
                                </span>
                              ) : (
                                <span className="rounded border border-zinc-800 bg-zinc-800/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                                  {t("memberBadge")}
                                </span>
                              )}
                            </td>

                            {/* Login Status Badge */}
                            <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                              {member.hasLoggedIn !== undefined && (
                                member.hasLoggedIn ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400"
                                    title={lastLoginTooltip}
                                  >
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    {t("statusLoggedIn")}
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                                    title={t("neverLoggedIn")}
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    {t("statusPendingLogin")}
                                  </span>
                                )
                              )}
                            </td>

                            {/* Assigned Areas / Folders */}
                            <td className="py-2.5 px-3 align-middle hidden sm:table-cell">
                              <div className="flex flex-wrap items-center gap-1 max-w-xs">
                                {member.allDepartments ? (
                                  <span className="rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-200">
                                    {t("allFolders")}
                                  </span>
                                ) : memberDepts && memberDepts.length > 0 ? (
                                  memberDepts.map((d) => (
                                    <span
                                      key={d.id}
                                      className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300"
                                    >
                                      {d.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-zinc-500 italic">—</span>
                                )}
                              </div>
                            </td>

                            {/* Cost Access */}
                            <td className="py-2.5 px-3 align-middle text-center whitespace-nowrap hidden md:table-cell">
                              {canSeeCosts ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                  <Check className="h-2.5 w-2.5" />
                                  {t("costsVisible")}
                                </span>
                              ) : (
                                <span className="text-[11px] text-zinc-600">—</span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-2.5 px-3.5 align-middle text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {/* Compact Invite & Link */}
                                <InviteLink locale={locale} userId={member.userId} compact={true} />

                                {/* Edit Drawer Toggle */}
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(isEditing ? null : member.userId)}
                                  className={cn(
                                    "inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-medium transition-colors",
                                    isEditing
                                      ? "border-zinc-600 bg-zinc-800 text-white"
                                      : "border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700 hover:text-white"
                                  )}
                                  title={isEditing ? t("closeEdit") : t("editAccess")}
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span className="hidden sm:inline">{isEditing ? t("closeEdit") : t("editAccess")}</span>
                                  {isEditing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>

                                {/* Remove Button */}
                                <form action={removeMemberAccess} className="inline">
                                  <input type="hidden" name="locale" value={locale} />
                                  <input type="hidden" name="projectSlug" value={projectSlug} />
                                  <input type="hidden" name="userId" value={member.userId} />
                                  <button
                                    type="submit"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-800/80 bg-zinc-900/60 text-zinc-500 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                                    title={t("remove")}
                                    aria-label={t("remove")}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Inline Edit Drawer (Appears only for the row being edited) */}
                {editingUserId && group.members.some((m) => m.userId === editingUserId) && (
                  (() => {
                    const member = group.members.find((m) => m.userId === editingUserId)!;
                    return (
                      <div className="border-t border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
                        <form action={saveMemberAccess} className="space-y-3.5">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="projectSlug" value={projectSlug} />
                          <input type="hidden" name="userId" value={member.userId} />

                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/70 pb-3">
                            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <Edit3 className="h-3.5 w-3.5 text-zinc-400" />
                              {member.name}
                              <span className="font-mono text-[11px] text-zinc-400 font-normal">({member.email})</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}
                              >
                                {t("closeEdit")}
                              </button>
                              <button
                                type="submit"
                                className={cn(buttonVariants({ size: "sm" }), "h-7 text-xs font-medium")}
                              >
                                {t("save")}
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                                {t("tableHeaderRole")}
                              </label>
                              <div>
                                <select
                                  name="role"
                                  defaultValue={member.role}
                                  aria-label={t("roleLabel")}
                                  className={cn(selectClass, "h-8 text-xs w-auto")}
                                >
                                  <option value="lead">{t("memberRole.lead")}</option>
                                  <option value="member">{t("memberRole.member")}</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1 pt-4">
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
                          </div>

                          <div className="space-y-1.5 border-t border-zinc-800/50 pt-3">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                              {t("userFolders")}
                            </label>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                          </div>
                        </form>
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

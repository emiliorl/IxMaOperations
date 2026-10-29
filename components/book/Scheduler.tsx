"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { createBookingSchema } from "@/lib/booking-schema";
import { localDate } from "@/lib/tz";
import { cn } from "@/lib/utils";

/**
 * Public booking UI (CLIENT_PORTAL_AND_SCHEDULER_PLAN.md Phase 2). The server
 * (app/api/schedule/*) decides which slots exist; this component only
 * presents them.
 *
 * Flow (one card, nothing scrolls out of view): a compact options bar
 * (format · length · timezone) → a month calendar where only days with
 * openings are selectable → the chosen day's times grouped Morning/Afternoon
 * → the booking form takes the time list's place once a time is picked.
 *
 * Two things happen purely in the browser:
 *  - "both free": if the visitor connects Google Calendar (read-only
 *    free/busy popup), their busy times arrive via postMessage and are
 *    compared against slots here — they are never sent to our server.
 *  - timezone display: slots arrive as UTC instants and are shown in the
 *    visitor's chosen zone.
 */

type Mode = "online" | "in_person";
interface Slot {
  start: string;
  end: string;
  /** The owner is already on-site (has an in-person meeting) that day. */
  onSite?: boolean;
}
interface Busy {
  start: number;
  end: number;
}
interface Booked {
  mode: Mode;
  start: string;
  end: string;
  meetLink: string | null;
  location: string | null;
  email: string;
}

const DURATIONS = [15, 30, 45];
const pad = (n: number) => String(n).padStart(2, "0");
/** Uppercase only the first letter (CSS `capitalize` would turn Spanish "de" into "De"). */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// ------------------------------------------------------------ small controls

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  mono,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      <div role="group" aria-label={label} className="inline-flex rounded-md border border-zinc-800 bg-zinc-900/60 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded px-3 py-1.5 text-sm transition-colors",
              mono && "font-mono text-xs",
              value === option.value ? "bg-zinc-100 text-zinc-900 font-medium" : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ month calendar

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`;
}

/** Monday-first grid of "YYYY-MM-DD" keys; null pads the leading/trailing cells. */
function monthCells(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= total; d++) cells.push(`${y}-${pad(m)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function MonthCalendar({
  month,
  onMonth,
  canPrev,
  canNext,
  available,
  mutual,
  onSite,
  selected,
  today,
  onSelect,
  locale,
  labels,
}: {
  month: string;
  onMonth: (month: string) => void;
  canPrev: boolean;
  canNext: boolean;
  available: Set<string>;
  mutual: Set<string>;
  onSite: Set<string>;
  selected: string | null;
  today: string;
  onSelect: (day: string) => void;
  locale: string;
  labels: { prev: string; next: string };
}) {
  const title = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(Date.UTC(y, m - 1, 1));
  }, [month, locale]);
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(Date.UTC(2024, 0, 1 + i)) // 2024-01-01 is a Monday
      ),
    [locale]
  );
  const fullDay = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: "UTC", dateStyle: "full" }),
    [locale]
  );
  const arrow = "h-8 w-8 inline-flex items-center justify-center rounded-md border border-zinc-800 text-zinc-300 hover:border-zinc-600 disabled:opacity-30 disabled:hover:border-zinc-800";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-100">{sentence(title)}</h3>
        <div className="flex gap-2">
          <button type="button" aria-label={labels.prev} disabled={!canPrev} onClick={() => onMonth(shiftMonth(month, -1))} className={arrow}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label={labels.next} disabled={!canNext} onClick={() => onMonth(shiftMonth(month, 1))} className={arrow}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((w) => (
          <div key={w} className="text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500 py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthCells(month).map((key, i) => {
          if (!key) return <div key={`pad-${i}`} />;
          const isAvailable = available.has(key);
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!isAvailable}
              aria-pressed={isSelected}
              aria-label={fullDay.format(Date.parse(`${key}T12:00:00Z`))}
              onClick={() => onSelect(key)}
              className={cn(
                "relative h-11 rounded-md text-sm transition-colors",
                isSelected
                  ? "bg-zinc-100 text-zinc-900 font-semibold"
                  : isAvailable
                    ? "border border-zinc-700 bg-zinc-800/60 text-zinc-100 font-medium hover:border-zinc-300"
                    : "text-zinc-700 cursor-default",
                key === today && !isSelected && "underline underline-offset-4 decoration-zinc-500"
              )}
            >
              {Number(key.slice(8))}
              {mutual.has(key) && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-green-500" aria-hidden="true" />
              )}
              {onSite.has(key) && (
                <span
                  className={cn("absolute top-1 right-1 h-1.5 w-1.5 rounded-sm", isSelected ? "bg-zinc-900" : "bg-zinc-300")}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- scheduler

export function Scheduler() {
  const t = useTranslations("Book");
  const locale = useLocale();
  const bookingLocale = locale === "es" ? "es" : "en";

  const [mode, setMode] = useState<Mode>("online");
  const [duration, setDuration] = useState(30);
  const [tz, setTz] = useState("UTC");
  const [zones, setZones] = useState<string[]>(["UTC"]);

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const [busy, setBusy] = useState<Busy[] | null>(null);
  const [connect, setConnect] = useState<"idle" | "waiting" | "denied" | "failed" | "blocked">("idle");
  const [onlyMutual, setOnlyMutual] = useState(false);

  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [form, setForm] = useState({ name: "", email: "", notes: "", location: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  // Visitor timezone + selectable zones (client-only, avoids a hydration mismatch).
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    setZones(all.includes(detected) ? all : [detected, ...all]);
    setTz(detected);
  }, []);

  // Load slots whenever the format or length changes.
  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");
    setSlot(null);
    fetch(`/api/schedule/availability?mode=${mode}&duration=${duration}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { slots: Slot[] };
        setSlots(data.slots);
        setLoadState("ready");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setLoadState("error");
      });
    return () => controller.abort();
  }, [mode, duration, reloadKey]);

  // Visitor's busy times, delivered by the Google popup via postMessage.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== "ixma-gcal") return;
      if (data.ok) {
        setBusy(data.busy as Busy[]);
        setConnect("idle");
      } else {
        setConnect(data.reason === "denied" ? "denied" : "failed");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const connectGoogle = useCallback(() => {
    const popup = window.open("/api/schedule/google/start", "ixma-gcal", "width=520,height=720");
    if (!popup) {
      setConnect("blocked");
      return;
    }
    setConnect("waiting");
    // If the visitor closes the popup without finishing, stop waiting.
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        setConnect((current) => (current === "waiting" ? "idle" : current));
      }
    }, 500);
  }, []);

  const enriched = useMemo(
    () =>
      (slots ?? []).map((s) => {
        const startMs = Date.parse(s.start);
        const endMs = Date.parse(s.end);
        const both = busy ? !busy.some((b) => startMs < b.end && b.start < endMs) : null;
        return { ...s, startMs, both };
      }),
    [slots, busy]
  );
  const visible = useMemo(
    () => (onlyMutual && busy ? enriched.filter((s) => s.both) : enriched),
    [enriched, onlyMutual, busy]
  );

  const { available, mutual, onSite, firstDay, lastDay } = useMemo(() => {
    const availableDays = new Set<string>();
    const mutualDays = new Set<string>();
    const onSiteDays = new Set<string>();
    for (const s of visible) {
      const key = localDate(s.startMs, tz);
      availableDays.add(key);
      if (s.both) mutualDays.add(key);
      if (s.onSite) onSiteDays.add(key);
    }
    const sorted = Array.from(availableDays).sort();
    return {
      available: availableDays,
      mutual: mutualDays,
      onSite: onSiteDays,
      firstDay: sorted[0] ?? null,
      lastDay: sorted.at(-1) ?? null,
    };
  }, [visible, tz]);

  // Keep the selected day and visible month valid as slots / filters / timezone change.
  useEffect(() => {
    setDay((current) => (current && available.has(current) ? current : firstDay));
  }, [available, firstDay]);
  useEffect(() => {
    setMonth((current) => {
      if (!firstDay || !lastDay) return null;
      const min = firstDay.slice(0, 7);
      const max = lastDay.slice(0, 7);
      if (current && current >= min && current <= max) return current;
      return (day ?? firstDay).slice(0, 7);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDay, lastDay]);

  const daySlots = useMemo(() => visible.filter((s) => day && localDate(s.startMs, tz) === day), [visible, day, tz]);

  const hourFmt = useMemo(
    () => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }),
    [tz]
  );
  const groups = useMemo(() => {
    const buckets = { morning: [] as typeof daySlots, afternoon: [] as typeof daySlots, evening: [] as typeof daySlots };
    for (const s of daySlots) {
      const hour = Number(hourFmt.format(s.startMs));
      buckets[hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"].push(s);
    }
    return (["morning", "afternoon", "evening"] as const)
      .map((name) => ({ name, items: buckets[name] }))
      .filter((g) => g.items.length > 0);
  }, [daySlots, hourFmt]);

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "numeric", minute: "2-digit" }),
    [locale, tz]
  );
  const longFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: tz, dateStyle: "full", timeStyle: "short" }),
    [locale, tz]
  );
  const dayTitleFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }),
    [locale]
  );
  const tzShort = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: "short" })
        .formatToParts(Date.now())
        .find((p) => p.type === "timeZoneName")?.value ?? "",
    [locale, tz]
  );
  const today = useMemo(() => localDate(Date.now(), tz), [tz]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slot) return;
    const schema = createBookingSchema((key) => t(key));
    const payload = {
      mode,
      durationMinutes: duration,
      start: slot.start,
      timezone: tz,
      locale: bookingLocale,
      name: form.name,
      email: form.email,
      notes: form.notes,
      location: mode === "in_person" ? form.location : "",
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/schedule/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBooked({ ...data, email: form.email });
        return;
      }
      if (res.status === 409) {
        setSubmitError(t("errorTaken"));
        setSlot(null);
        setReloadKey((k) => k + 1);
      } else if (res.status === 429) {
        setSubmitError(t("errorRate"));
      } else if (res.status === 503) {
        setSubmitError(t("errorUnavailable"));
      } else {
        setSubmitError(t("errorGeneric"));
      }
    } catch {
      setSubmitError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 flex items-start gap-3">
        <Check className="h-5 w-5 text-zinc-300 mt-0.5 flex-shrink-0" />
        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-100">{t("successTitle")}</p>
          <p className="text-sm text-zinc-300">{longFmt.format(Date.parse(booked.start))}</p>
          {booked.meetLink && (
            <p className="text-xs text-zinc-400">
              {t("successMeet")}:{" "}
              <a href={booked.meetLink} className="text-zinc-200 underline underline-offset-4 break-all" rel="noreferrer">
                {booked.meetLink}
              </a>
            </p>
          )}
          {booked.location && (
            <p className="text-xs text-zinc-400">
              {t("successLocation")}: <span className="text-zinc-200">{booked.location}</span>
            </p>
          )}
          <p className="text-xs text-zinc-500 leading-relaxed">{t("successBody", { email: booked.email })}</p>
        </div>
      </div>
    );
  }

  const hasSlots = loadState === "ready" && enriched.length > 0;

  return (
    <div className="space-y-6">
      {/* Options bar */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Segmented
          label={t("formatLabel")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "online" as Mode, label: t("modeOnline") },
            { value: "in_person" as Mode, label: t("modeInPerson") },
          ]}
        />
        <Segmented
          label={t("lengthLabel")}
          value={duration}
          onChange={setDuration}
          mono
          options={DURATIONS.map((d) => ({ value: d, label: t("minutes", { n: d }) }))}
        />
        <div className="space-y-1.5">
          <label htmlFor="tz" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            {t("timezoneLabel")}
          </label>
          <select
            id="tz"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="h-9 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 max-w-[260px]"
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="-mt-2 space-y-1.5 max-w-2xl">
        <p className="text-xs text-zinc-500">{mode === "online" ? t("modeOnlineHint") : t("onSiteNote")}</p>
        {mode === "in_person" && onSite.size > 0 && (
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-sm bg-zinc-300" aria-hidden="true" /> {t("legendOnSite")}
          </p>
        )}
      </div>

      {/* Calendar + times / form */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="p-5 md:p-6">
          {loadState === "loading" && (
            <p className="text-sm text-zinc-500 flex items-center gap-2 py-16 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </p>
          )}

          {loadState === "error" && (
            <div className="space-y-3 py-10">
              <p className="text-sm text-red-400">{t("loadError")}</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                {t("retry")}
              </Button>
            </div>
          )}

          {loadState === "ready" && enriched.length === 0 && (
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm py-10">
              {mode === "in_person" ? t("noSlotsInPerson") : t("noSlotsOnline")}
            </p>
          )}

          {hasSlots && visible.length === 0 && <p className="text-sm text-zinc-400 leading-relaxed max-w-sm py-10">{t("noMutual")}</p>}

          {hasSlots && visible.length > 0 && month && firstDay && lastDay && (
            <MonthCalendar
              month={month}
              onMonth={setMonth}
              canPrev={month > firstDay.slice(0, 7)}
              canNext={month < lastDay.slice(0, 7)}
              available={available}
              mutual={mutual}
              onSite={onSite}
              selected={day}
              today={today}
              locale={locale}
              labels={{ prev: t("prevMonth"), next: t("nextMonth") }}
              onSelect={(key) => {
                setDay(key);
                setSlot(null);
              }}
            />
          )}
        </div>

        <div className="p-5 md:p-6 border-t md:border-t-0 md:border-l border-zinc-800 min-h-[320px]">
          {!slot && day && hasSlots && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">{sentence(dayTitleFmt.format(Date.parse(`${day}T12:00:00Z`)))}</h3>
                <p className="text-xs text-zinc-500 mt-1">{t("timesIn", { zone: `${tz.replace(/_/g, " ")}${tzShort ? ` (${tzShort})` : ""}` })}</p>
              </div>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {groups.map((group) => (
                  <div key={group.name} className="space-y-2">
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t(group.name)}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((s) => (
                        <button
                          key={s.start}
                          type="button"
                          onClick={() => setSlot({ start: s.start, end: s.end })}
                          className={cn(
                            "relative rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 text-center font-mono text-sm text-zinc-100 transition-colors hover:border-zinc-300",
                            s.both === false && "opacity-50"
                          )}
                        >
                          {timeFmt.format(s.startMs)}
                          {s.both === true && (
                            <span
                              className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-green-500"
                              title={t("bothFree")}
                              aria-label={t("bothFree")}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!slot && !day && hasSlots && <p className="text-sm text-zinc-500">{t("selectDay")}</p>}

          {slot && (
            <form onSubmit={submit} noValidate className="space-y-4">
              <button
                type="button"
                onClick={() => setSlot(null)}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> {t("changeTime")}
              </button>

              <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
                <p className="text-sm font-medium text-zinc-100">{longFmt.format(Date.parse(slot.start))}</p>
                <p className="text-xs text-zinc-500 font-mono">
                  {mode === "online" ? t("modeOnline") : t("modeInPerson")} · {t("minutes", { n: duration })} · {tzShort || tz}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="b-name" className="text-xs text-zinc-400">{t("nameLabel")}</label>
                <Input id="b-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="b-email" className="text-xs text-zinc-400">{t("emailLabel")}</label>
                <Input id="b-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              {mode === "in_person" && (
                <div className="space-y-1.5">
                  <label htmlFor="b-location" className="text-xs text-zinc-400">{t("locationLabel")}</label>
                  <Input
                    id="b-location"
                    autoComplete="street-address"
                    placeholder={t("locationPlaceholder")}
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                  {errors.location && <p className="text-xs text-red-400">{errors.location}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="b-notes" className="text-xs text-zinc-400">{t("notesLabel")}</label>
                <Textarea id="b-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              {submitError && <p className="text-sm text-red-400">{submitError}</p>}

              <Button type="submit" size="lg" disabled={submitting} className="gap-2 w-full">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? t("confirming") : t("confirm")}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Optional Google Calendar overlay */}
      <div className="space-y-2">
        {busy ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="text-zinc-200 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" /> {t("connected")}
            </span>
            <span className="text-zinc-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" /> {t("legendBothFree")}
            </span>
            <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={onlyMutual} onChange={(e) => setOnlyMutual(e.target.checked)} />
              {t("onlyMutual")}
            </label>
            <button
              type="button"
              onClick={() => {
                setBusy(null);
                setOnlyMutual(false);
              }}
              className="text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
            >
              {t("disconnect")}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button type="button" variant="secondary" size="sm" onClick={connectGoogle} disabled={connect === "waiting"}>
              {connect === "waiting" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> {t("connecting")}
                </>
              ) : (
                t("connectButton")
              )}
            </Button>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
              {t("connectHint")}{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-zinc-300">
                {t("privacyLink")}
              </Link>
            </p>
          </div>
        )}
        {connect === "denied" && <p className="text-xs text-zinc-400">{t("connectDenied")}</p>}
        {connect === "failed" && <p className="text-xs text-red-400">{t("connectFailed")}</p>}
        {connect === "blocked" && <p className="text-xs text-red-400">{t("popupBlocked")}</p>}
      </div>
    </div>
  );
}

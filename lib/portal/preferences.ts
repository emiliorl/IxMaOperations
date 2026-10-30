/**
 * What a person can set about themselves in the portal (Settings), and the rules
 * that use it. Pure, so it can be tested; the values live on the person's profile
 * (supabase/migrations/20261029001000_email_notifications.sql and ..001100_preferences.sql).
 *
 *   language   the one they read emails in, and the portal opens in after sign-in.
 *   time zone  how dates and times show in the portal, instead of the server's.
 *   emails     on/off for all of them, and which kinds (a fix is ready, a reply).
 */

export const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = { en: "English", es: "Español" };

export function parseLanguage(value: unknown): Language | null {
  return LANGUAGES.includes(value as Language) ? (value as Language) : null;
}

export const DEFAULT_TIMEZONE = "America/Mexico_City";

/** Where the portal's people are likely to be; anything else is still accepted if it is a real time zone. */
const COMMON_TIMEZONES = [
  "America/Mexico_City",
  "America/Monterrey",
  "America/Cancun",
  "America/Chihuahua",
  "America/Hermosillo",
  "America/Mazatlan",
  "America/Tijuana",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "UTC",
];

export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** A stored value that is not a real time zone (or is empty) falls back to the default instead of breaking every date. */
export function timeZoneOrDefault(value: string | null | undefined): string {
  return value && isValidTimeZone(value) ? value : DEFAULT_TIMEZONE;
}

/** The choices to offer: the common ones, plus the person's current one if it is not among them. */
export function timeZoneChoices(current: string): string[] {
  return COMMON_TIMEZONES.includes(current) ? COMMON_TIMEZONES : [current, ...COMMON_TIMEZONES];
}

/** "Mexico City · GMT-6" (the offset is right now, so it follows daylight saving). */
export function timeZoneLabel(zone: string, now = Date.now()): string {
  const place = (zone.split("/").pop() ?? zone).replace(/_/g, " ");
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value;
    return offset ? `${place} · ${offset}` : place;
  } catch {
    return place;
  }
}

export interface NotificationPreferences {
  /** The master switch: off means no portal email about my tickets at all. */
  notifyEmail: boolean;
  notifyFixReady: boolean;
  notifyReplies: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notifyEmail: true,
  notifyFixReady: true,
  notifyReplies: true,
};

type Kind = "fix_ready" | "owner_replied";
const kindOn = (kind: Kind, prefs: NotificationPreferences) => (kind === "fix_ready" ? prefs.notifyFixReady : prefs.notifyReplies);

/** Does this person want this kind of email? Both the master switch and the kind must be on. */
export function wantsEmail(kind: Kind, prefs: NotificationPreferences): boolean {
  return prefs.notifyEmail && kindOn(kind, prefs);
}

/** Reads the profile's columns into preferences; anything missing (an older database) means the default. */
export function notificationPreferencesFrom(
  row:
    | { notify_email?: boolean | null; notify_fix_ready?: boolean | null; notify_replies?: boolean | null }
    | null
    | undefined
): NotificationPreferences {
  return {
    notifyEmail: row?.notify_email ?? DEFAULT_NOTIFICATION_PREFERENCES.notifyEmail,
    notifyFixReady: row?.notify_fix_ready ?? DEFAULT_NOTIFICATION_PREFERENCES.notifyFixReady,
    notifyReplies: row?.notify_replies ?? DEFAULT_NOTIFICATION_PREFERENCES.notifyReplies,
  };
}

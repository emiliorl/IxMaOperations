import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_TIMEZONE,
  isValidTimeZone,
  notificationPreferencesFrom,
  parseLanguage,
  timeZoneChoices,
  timeZoneLabel,
  timeZoneOrDefault,
  wantsEmail,
} from "./preferences";

describe("language", () => {
  it("accepts only the languages the portal has", () => {
    expect(parseLanguage("es")).toBe("es");
    expect(parseLanguage("en")).toBe("en");
    expect(parseLanguage("fr")).toBeNull();
    expect(parseLanguage("")).toBeNull();
    expect(parseLanguage(undefined)).toBeNull();
  });
});

describe("time zone", () => {
  it("accepts real time zones and refuses anything else", () => {
    expect(isValidTimeZone("America/Mexico_City")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("x".repeat(100))).toBe(false);
  });
  it("a broken stored value falls back to the default instead of breaking every date", () => {
    expect(timeZoneOrDefault("Mars/Olympus")).toBe(DEFAULT_TIMEZONE);
    expect(timeZoneOrDefault(null)).toBe(DEFAULT_TIMEZONE);
    expect(timeZoneOrDefault("Europe/Madrid")).toBe("Europe/Madrid");
  });
  it("offers the common zones, and the person's own if it is not among them", () => {
    expect(timeZoneChoices("America/Bogota")).toContain("America/Bogota");
    expect(timeZoneChoices("America/Bogota")).toHaveLength(timeZoneChoices("UTC").length);
    expect(timeZoneChoices("Asia/Tokyo")[0]).toBe("Asia/Tokyo");
    expect(timeZoneChoices("Asia/Tokyo")).toHaveLength(timeZoneChoices("UTC").length + 1);
  });
  it("labels a zone with its place and its offset", () => {
    const winter = Date.parse("2026-01-15T12:00:00Z");
    expect(timeZoneLabel("America/Mexico_City", winter)).toBe("Mexico City · GMT-6");
    expect(timeZoneLabel("America/Argentina/Buenos_Aires", winter)).toBe("Buenos Aires · GMT-3");
    expect(timeZoneLabel("UTC", winter)).toContain("UTC");
  });
});

describe("which emails a person wants", () => {
  const all = { notifyEmail: true, notifyFixReady: true, notifyReplies: true };

  it("wants everything until they say otherwise", () => {
    expect(wantsEmail("fix_ready", DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true);
    expect(wantsEmail("owner_replied", DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true);
  });
  it("can turn off one kind and keep the other", () => {
    expect(wantsEmail("owner_replied", { ...all, notifyReplies: false })).toBe(false);
    expect(wantsEmail("fix_ready", { ...all, notifyReplies: false })).toBe(true);
    expect(wantsEmail("fix_ready", { ...all, notifyFixReady: false })).toBe(false);
  });
  it("the master switch turns off everything, whatever the kinds say", () => {
    const off = { ...all, notifyEmail: false };
    expect(wantsEmail("fix_ready", off)).toBe(false);
    expect(wantsEmail("owner_replied", off)).toBe(false);
  });
  it("a database without the newer columns means the defaults", () => {
    expect(notificationPreferencesFrom(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(notificationPreferencesFrom({ notify_email: false })).toEqual({ ...DEFAULT_NOTIFICATION_PREFERENCES, notifyEmail: false });
    expect(notificationPreferencesFrom({ notify_replies: false, notify_fix_ready: null })).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      notifyReplies: false,
    });
  });
});

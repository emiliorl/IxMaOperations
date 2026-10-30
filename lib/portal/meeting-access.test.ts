import { describe, expect, it } from "vitest";
import { canManageMeeting, isCancellable, isMyMeeting } from "./meeting-access";

const ana = { id: "u-ana", email: "ana@example.com", isAdmin: false };
const luis = { id: "u-luis", email: "luis@example.com", isAdmin: false };
const owner = { id: "u-owner", email: "owner@example.com", isAdmin: true };

describe("whose meeting it is", () => {
  it("goes by the account that booked it when that was recorded", () => {
    expect(isMyMeeting({ clientId: "u-ana", guestEmail: "ana@example.com" }, ana)).toBe(true);
    expect(isMyMeeting({ clientId: "u-ana", guestEmail: "ana@example.com" }, luis)).toBe(false);
  });

  it("does not let a matching email override a recorded account", () => {
    // Booked by someone else's account, even though the email looks the same.
    expect(isMyMeeting({ clientId: "u-luis", guestEmail: "ana@example.com" }, ana)).toBe(false);
  });

  it("falls back to the guest's email for meetings with no recorded account, ignoring case and spaces", () => {
    expect(isMyMeeting({ clientId: null, guestEmail: " Ana@Example.com " }, ana)).toBe(true);
    expect(isMyMeeting({ clientId: null, guestEmail: "ana@example.com" }, luis)).toBe(false);
  });

  it("is nobody's when there is nothing to match", () => {
    expect(isMyMeeting({ clientId: null, guestEmail: null }, ana)).toBe(false);
    expect(isMyMeeting({ clientId: null, guestEmail: "ana@example.com" }, { id: "u", email: "" })).toBe(false);
  });
});

describe("who may manage a meeting", () => {
  const anas = { clientId: "u-ana", guestEmail: "ana@example.com" };
  it("the person who booked it, and the owner; not a colleague", () => {
    expect(canManageMeeting(anas, ana)).toBe(true);
    expect(canManageMeeting(anas, owner)).toBe(true);
    expect(canManageMeeting(anas, luis)).toBe(false);
  });

  it("the owner manages meetings nobody can claim", () => {
    expect(canManageMeeting({ clientId: null, guestEmail: null }, owner)).toBe(true);
  });
});

describe("which meetings can still be cancelled", () => {
  const now = Date.UTC(2026, 10, 5, 16, 0);
  it("only confirmed ones that have not started", () => {
    expect(isCancellable({ status: "confirmed", start: now + 60_000 }, now)).toBe(true);
    expect(isCancellable({ status: "confirmed", start: now }, now)).toBe(false);
    expect(isCancellable({ status: "confirmed", start: now - 60_000 }, now)).toBe(false);
    expect(isCancellable({ status: "cancelled", start: now + 60_000 }, now)).toBe(false);
    expect(isCancellable({ status: "pending", start: now + 60_000 }, now)).toBe(false);
  });
});

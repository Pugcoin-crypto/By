import { describe, expect, it } from "vitest";
import { isWithinOpeningHours, storeState } from "./hours";
import { seedSettings } from "./menu-seed";

// 2026-11-27 is a Friday; Budapest is UTC+1 in winter.
const at = (utc: string) => new Date(utc);

describe("opening hours 10:30–20:00 Europe/Budapest", () => {
  it("is closed before 10:30 local", () => {
    expect(isWithinOpeningHours(seedSettings, at("2026-11-27T09:29:00Z"))).toBe(false);
  });
  it("is open at 10:30 local", () => {
    expect(isWithinOpeningHours(seedSettings, at("2026-11-27T09:30:00Z"))).toBe(true);
  });
  it("is closed at 20:00 local", () => {
    expect(isWithinOpeningHours(seedSettings, at("2026-11-27T19:00:00Z"))).toBe(false);
    expect(isWithinOpeningHours(seedSettings, at("2026-11-27T18:59:00Z"))).toBe(true);
  });
  it("follows summer time (UTC+2)", () => {
    expect(isWithinOpeningHours(seedSettings, at("2026-07-01T08:30:00Z"))).toBe(true);
    expect(isWithinOpeningHours(seedSettings, at("2026-07-01T18:00:00Z"))).toBe(false);
  });
  it("handles intervals past midnight", () => {
    const late = { ...seedSettings, openingHours: Array(7).fill({ intervals: [{ open: "18:00", close: "02:00" }] }) };
    expect(isWithinOpeningHours(late, at("2026-11-27T23:30:00Z"))).toBe(true);
    expect(isWithinOpeningHours(late, at("2026-11-27T12:00:00Z"))).toBe(false);
  });
});

describe("storeState", () => {
  it("reports a pause with the custom message", () => {
    const s = storeState({ ...seedSettings, acceptingOrders: false, pauseMessage: "Telt ház!" }, at("2026-11-27T12:00:00Z"));
    expect(s).toEqual({ open: false, reason: "paused", message: "Telt ház!" });
  });
  it("tells today's hours when closed", () => {
    const s = storeState(seedSettings, at("2026-11-27T20:00:00Z"));
    expect(s.open).toBe(false);
    if (!s.open) expect(s.message).toContain("10:30–20:00");
  });
});

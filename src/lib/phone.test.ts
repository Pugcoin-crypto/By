import { describe, expect, it } from "vitest";
import { formatHungarianPhone, normalizeHungarianPhone } from "./phone";

describe("normalizeHungarianPhone", () => {
  it.each([
    ["+36 30 528 5188", "+36305285188"],
    ["06305285188", "+36305285188"],
    ["06-30-528-5188", "+36305285188"],
    ["0036 70 123 4567", "+36701234567"],
    ["36201234567", "+36201234567"],
    ["06 1 234 5678", "+3612345678"],
    ["06 29 123 456", "+3629123456"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeHungarianPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "+44 20 7946 0958", "06 30 528 518", "06 30 528 51888", "abc", "06 99"])("rejects %s", (input) => {
    expect(normalizeHungarianPhone(input)).toBeNull();
  });

  it("formats for display", () => {
    expect(formatHungarianPhone("+36305285188")).toBe("+36 30 528 5188");
  });
});

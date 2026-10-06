import { describe, expect, it } from "vitest";

import {
  addDays,
  dayOfWeek,
  daysBetween,
  isLocalDate,
  localDateOf,
  startOfWeek,
  todayIn,
} from "./local-date";

describe("local dates", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-10-05", "2026-10-18")).toBe(13);
    expect(daysBetween("2026-10-18", "2026-10-05")).toBe(-13);
  });

  it("computes weekdays and Monday-based weeks", () => {
    expect(dayOfWeek("2026-10-04")).toBe(0); // Sunday
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
    expect(startOfWeek("2026-10-05")).toBe("2026-10-05");
  });

  it("resolves the calendar date in a timezone", () => {
    const instant = new Date("2026-10-06T20:00:00Z");
    expect(todayIn("Asia/Kolkata", instant)).toBe("2026-10-07");
    expect(todayIn("America/New_York", instant)).toBe("2026-10-06");
    expect(localDateOf("2026-10-06T19:00:00Z", "Asia/Kolkata")).toBe("2026-10-07");
  });

  it("validates date strings", () => {
    expect(isLocalDate("2026-02-30")).toBe(false);
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(() => addDays("bad", 1)).toThrow();
  });
});

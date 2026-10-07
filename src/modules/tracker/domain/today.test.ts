import { describe, expect, it } from "vitest";

import { countdown, inSheetWindow, nextInterview, pendingDebriefs } from "./today";

const now = new Date("2026-10-07T10:00:00Z");
const round = (id: string, start: string, end: string, status = "SCHEDULED") => ({
  id,
  status,
  startUtc: start,
  endUtc: end,
});

describe("today selections", () => {
  it("picks the next scheduled round, including one under way", () => {
    const rounds = [
      round("later", "2026-10-10T10:00:00Z", "2026-10-10T11:00:00Z"),
      round("ongoing", "2026-10-07T09:30:00Z", "2026-10-07T10:30:00Z"),
      round("cancelled", "2026-10-08T10:00:00Z", "2026-10-08T11:00:00Z", "CANCELLED"),
    ];
    expect(nextInterview(rounds, now)?.id).toBe("ongoing");
    expect(nextInterview(rounds.slice(0, 1), now)?.id).toBe("later");
    expect(nextInterview([], now)).toBeNull();
  });

  it("opens the revision sheet window 48 hours before", () => {
    expect(inSheetWindow(round("a", "2026-10-09T09:00:00Z", "2026-10-09T10:00:00Z"), now)).toBe(
      true,
    );
    expect(inSheetWindow(round("b", "2026-10-09T11:00:00Z", "2026-10-09T12:00:00Z"), now)).toBe(
      false,
    );
  });

  it("lists recent rounds without a debrief", () => {
    const rounds = [
      round("done", "2026-10-06T09:00:00Z", "2026-10-06T10:00:00Z", "COMPLETED"),
      round("past", "2026-10-05T09:00:00Z", "2026-10-05T10:00:00Z"),
      round("debriefed", "2026-10-06T09:00:00Z", "2026-10-06T10:00:00Z", "COMPLETED"),
      round("future", "2026-10-08T09:00:00Z", "2026-10-08T10:00:00Z"),
    ];
    expect(pendingDebriefs(rounds, new Set(["debriefed"]), now).map((r) => r.id)).toEqual([
      "done",
      "past",
    ]);
  });

  it("formats countdowns", () => {
    expect(countdown("2026-10-09T13:00:00Z", now)).toBe("in 2 days 3 h");
    expect(countdown("2026-10-07T15:20:00Z", now)).toBe("in 5 h 20 min");
    expect(countdown("2026-10-07T10:12:00Z", now)).toBe("in 12 min");
    expect(countdown("2026-10-07T09:00:00Z", now)).toBe("now");
  });
});

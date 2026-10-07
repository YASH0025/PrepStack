import { describe, expect, it } from "vitest";

import { chooseDeadline, interviewDeadlines } from "./deadline";

const now = new Date("2026-10-07T06:00:00.000Z"); // 11:30 IST on 7 Oct

describe("interviewDeadlines", () => {
  it("finishes prep the day before upcoming technical interviews, in the user's timezone", () => {
    const deadlines = interviewDeadlines(
      [
        // 8 Oct 11:00 IST → deadline 7 Oct (today).
        {
          startUtc: "2026-10-08T05:30:00.000Z",
          status: "SCHEDULED",
          type: "TECHNICAL",
          companyName: "Acme",
        },
        // 20 Oct 01:00 IST (still 19 Oct in UTC) → deadline 19 Oct.
        {
          startUtc: "2026-10-19T19:30:00.000Z",
          status: "SCHEDULED",
          type: "SYSTEM_DESIGN",
          companyName: "Globex",
        },
        // HR rounds, cancelled rounds and past rounds are ignored.
        {
          startUtc: "2026-10-09T05:30:00.000Z",
          status: "SCHEDULED",
          type: "HR",
          companyName: "Acme",
        },
        {
          startUtc: "2026-10-09T05:30:00.000Z",
          status: "CANCELLED",
          type: "CODING",
          companyName: "Initech",
        },
        {
          startUtc: "2026-10-06T05:30:00.000Z",
          status: "SCHEDULED",
          type: "CODING",
          companyName: "Old",
        },
      ],
      "Asia/Kolkata",
      now,
    );
    expect(deadlines).toEqual([
      { date: "2026-10-07", source: "INTERVIEW", label: "Acme technical round on 8 Oct" },
      { date: "2026-10-19", source: "INTERVIEW", label: "Globex system design round on 20 Oct" },
    ]);
  });

  it("uses today when the interview is later today", () => {
    const [deadline] = interviewDeadlines(
      [
        {
          startUtc: "2026-10-07T12:00:00.000Z",
          status: "SCHEDULED",
          type: "CODING",
          companyName: "Acme",
        },
      ],
      "Asia/Kolkata",
      now,
    );
    expect(deadline?.date).toBe("2026-10-07");
  });

  it("makes the nearest interview the roadmap end date when it is before the prep window ends", () => {
    const candidates = interviewDeadlines(
      [
        {
          startUtc: "2026-10-15T05:30:00.000Z",
          status: "SCHEDULED",
          type: "TECHNICAL",
          companyName: "Acme",
        },
      ],
      "Asia/Kolkata",
      now,
    );
    expect(chooseDeadline("2026-10-07", 30, candidates)).toEqual({
      endDate: "2026-10-14",
      source: "INTERVIEW",
      label: "Acme technical round on 15 Oct",
    });
    expect(chooseDeadline("2026-10-07", 5, candidates).source).toBe("PREP_WINDOW");
  });
});

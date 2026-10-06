import { describe, expect, it } from "vitest";

import {
  detectConflicts,
  fromUtc,
  nextRoundNumber,
  roundTimeline,
  statusWhenScheduling,
  suggestAfterRound,
  toUtcRange,
} from "./rounds";

describe("status suggestions", () => {
  it("moves forward after a cleared round and suggests scheduling the next", () => {
    expect(
      suggestAfterRound("TECHNICAL_INTERVIEW", {
        type: "TECHNICAL",
        status: "COMPLETED",
        result: "CLEARED",
      }),
    ).toEqual({ status: "MANAGERIAL_INTERVIEW", reason: expect.any(String), scheduleNext: true });
    expect(
      suggestAfterRound("HR_ROUND", { type: "HR", status: "COMPLETED", result: "CLEARED" })?.status,
    ).toBe("OFFER_RECEIVED");
  });

  it("never moves backwards and leaves closed applications alone", () => {
    expect(
      suggestAfterRound("HR_ROUND", { type: "TECHNICAL", status: "COMPLETED", result: "CLEARED" }),
    ).toEqual({ status: "HR_ROUND", reason: "Round cleared.", scheduleNext: true });
    expect(
      suggestAfterRound("WITHDRAWN", { type: "HR", status: "COMPLETED", result: "CLEARED" }),
    ).toBeNull();
  });

  it("suggests rejection for a rejected round and nothing while awaiting", () => {
    expect(
      suggestAfterRound("TECHNICAL_INTERVIEW", {
        type: "CODING",
        status: "COMPLETED",
        result: "REJECTED",
      })?.status,
    ).toBe("REJECTED");
    expect(
      suggestAfterRound("TECHNICAL_INTERVIEW", {
        type: "CODING",
        status: "COMPLETED",
        result: "AWAITING",
      }),
    ).toBeNull();
  });

  it("advances to the round's stage when scheduling", () => {
    expect(statusWhenScheduling("APPLIED", "TECHNICAL")).toBe("TECHNICAL_INTERVIEW");
    expect(statusWhenScheduling("HR_ROUND", "TECHNICAL")).toBe("HR_ROUND");
    expect(statusWhenScheduling("ON_HOLD", "HR")).toBe("ON_HOLD");
  });
});

describe("conflicts", () => {
  const round = (id: string, start: string, end: string, status = "SCHEDULED" as const) => ({
    id,
    startUtc: start,
    endUtc: end,
    status,
  });

  it("finds overlapping scheduled rounds only", () => {
    const rounds = [
      round("a", "2026-10-10T05:00:00.000Z", "2026-10-10T06:00:00.000Z"),
      round("b", "2026-10-10T05:30:00.000Z", "2026-10-10T06:30:00.000Z"),
      round("c", "2026-10-10T06:30:00.000Z", "2026-10-10T07:00:00.000Z"),
      {
        ...round("d", "2026-10-10T05:00:00.000Z", "2026-10-10T07:00:00.000Z"),
        status: "CANCELLED" as const,
      },
    ];
    expect(detectConflicts(rounds).map(([x, y]) => `${x.id}-${y.id}`)).toEqual(["a-b"]);
  });
});

describe("timezones", () => {
  it("converts wall-clock times to UTC and back", () => {
    expect(toUtcRange("2026-10-12", "11:00", 60, "Asia/Kolkata")).toEqual({
      startUtc: "2026-10-12T05:30:00.000Z",
      endUtc: "2026-10-12T06:30:00.000Z",
    });
    expect(fromUtc("2026-10-12T05:30:00.000Z", "Asia/Kolkata")).toEqual({
      date: "2026-10-12",
      time: "11:00",
    });
    // A round entered in the interviewer's timezone shows correctly for the user.
    const { startUtc } = toUtcRange("2026-10-12", "09:00", 45, "America/New_York");
    expect(fromUtc(startUtc, "Asia/Kolkata")).toEqual({ date: "2026-10-12", time: "18:30" });
  });
});

describe("timeline and numbering", () => {
  const base = { startUtc: "2026-10-10T05:00:00.000Z" };
  it("marks done, current, upcoming, failed and cancelled rounds", () => {
    const timeline = roundTimeline(
      [
        { ...base, id: "1", roundNumber: 1, status: "COMPLETED", result: "CLEARED" },
        {
          ...base,
          id: "2",
          roundNumber: 2,
          status: "SCHEDULED",
          result: "AWAITING",
          startUtc: "2026-10-12T05:00:00.000Z",
        },
        {
          ...base,
          id: "3",
          roundNumber: 3,
          status: "SCHEDULED",
          result: "AWAITING",
          startUtc: "2026-10-14T05:00:00.000Z",
        },
        { ...base, id: "x", roundNumber: 2, status: "RESCHEDULED", result: "NOT_APPLICABLE" },
      ],
      new Date("2026-10-11T00:00:00Z"),
    );
    expect(timeline.map((entry) => entry.state)).toEqual(["done", "current", "upcoming"]);
  });

  it("numbers new rounds after the highest active round", () => {
    expect(nextRoundNumber([])).toBe(1);
    expect(
      nextRoundNumber([
        { roundNumber: 1, status: "COMPLETED" },
        { roundNumber: 2, status: "SCHEDULED" },
      ]),
    ).toBe(3);
  });
});

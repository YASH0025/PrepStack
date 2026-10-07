import { describe, expect, it } from "vitest";

import {
  describeOffset,
  dueFollowUps,
  dueReminder,
  needsDebriefPrompt,
  reminderKey,
  shiftDate,
  upcomingConflicts,
} from "./reminders";

const start = "2026-10-12T05:30:00.000Z"; // 11:00 IST
const round = {
  id: "r1",
  status: "SCHEDULED",
  startUtc: start,
  endUtc: "2026-10-12T06:30:00.000Z",
  reminderMinutes: [1440, 60],
  sentReminders: [] as { key: string }[],
};
const at = (iso: string) => new Date(iso);

describe("dueReminder", () => {
  it("is not due before the first offset", () => {
    expect(dueReminder(round, at("2026-10-11T05:00:00.000Z"))).toBeNull();
  });

  it("fires the 1-day reminder, then the 1-hour reminder", () => {
    const first = dueReminder(round, at("2026-10-11T05:30:00.000Z"));
    expect(first).toEqual({ roundId: "r1", minutesBefore: 1440, keys: [reminderKey(1440, start)] });

    const afterFirst = { ...round, sentReminders: [{ key: reminderKey(1440, start) }] };
    expect(dueReminder(afterFirst, at("2026-10-12T03:00:00.000Z"))).toBeNull();
    expect(dueReminder(afterFirst, at("2026-10-12T04:45:00.000Z"))?.minutesBefore).toBe(60);
  });

  it("sends one reminder when several are due at once and marks all of them", () => {
    const due = dueReminder(round, at("2026-10-12T05:00:00.000Z"));
    expect(due?.minutesBefore).toBe(60);
    expect(due?.keys.sort()).toEqual([reminderKey(1440, start), reminderKey(60, start)].sort());
  });

  it("never fires after the start or for non-scheduled rounds", () => {
    expect(dueReminder(round, at("2026-10-12T05:30:00.000Z"))).toBeNull();
    expect(
      dueReminder({ ...round, status: "CANCELLED" }, at("2026-10-12T05:00:00.000Z")),
    ).toBeNull();
  });

  it("re-arms when the round time changes", () => {
    const moved = {
      ...round,
      startUtc: "2026-10-13T05:30:00.000Z",
      endUtc: "2026-10-13T06:30:00.000Z",
      sentReminders: [{ key: reminderKey(1440, start) }],
    };
    expect(dueReminder(moved, at("2026-10-12T06:00:00.000Z"))?.minutesBefore).toBe(1440);
  });
});

describe("needsDebriefPrompt", () => {
  const end = "2026-10-12T06:30:00.000Z";
  it("prompts from one hour after the end for a week, unless a debrief exists", () => {
    expect(
      needsDebriefPrompt(
        { status: "SCHEDULED", endUtc: end },
        at("2026-10-12T07:29:00.000Z"),
        false,
      ),
    ).toBe(false);
    expect(
      needsDebriefPrompt(
        { status: "SCHEDULED", endUtc: end },
        at("2026-10-12T07:30:00.000Z"),
        false,
      ),
    ).toBe(true);
    expect(
      needsDebriefPrompt(
        { status: "COMPLETED", endUtc: end },
        at("2026-10-15T00:00:00.000Z"),
        false,
      ),
    ).toBe(true);
    expect(
      needsDebriefPrompt(
        { status: "COMPLETED", endUtc: end },
        at("2026-10-15T00:00:00.000Z"),
        true,
      ),
    ).toBe(false);
    expect(
      needsDebriefPrompt(
        { status: "CANCELLED", endUtc: end },
        at("2026-10-12T08:00:00.000Z"),
        false,
      ),
    ).toBe(false);
    expect(
      needsDebriefPrompt(
        { status: "COMPLETED", endUtc: end },
        at("2026-10-20T00:00:00.000Z"),
        false,
      ),
    ).toBe(false);
  });
});

describe("dueFollowUps", () => {
  it("returns follow-ups due today or in the last two weeks for open applications", () => {
    const items = dueFollowUps(
      [
        {
          id: "r1",
          applicationId: "a1",
          status: "COMPLETED",
          followUpDate: "2026-10-12",
          followUpNote: "Ping HR",
        },
        {
          id: "r2",
          applicationId: "a1",
          status: "CANCELLED",
          followUpDate: "2026-10-12",
          followUpNote: null,
        },
        {
          id: "r3",
          applicationId: "a1",
          status: "COMPLETED",
          followUpDate: "2026-10-13",
          followUpNote: null,
        },
        {
          id: "r4",
          applicationId: "a2",
          status: "COMPLETED",
          followUpDate: "2026-10-10",
          followUpNote: null,
        },
      ],
      [
        { id: "a1", followUpDate: "2026-09-01", status: "APPLIED" },
        { id: "a2", followUpDate: "2026-10-12", status: "REJECTED" },
        { id: "a3", followUpDate: "2026-10-05", status: "APPLIED" },
      ],
      "2026-10-12",
      ["REJECTED", "WITHDRAWN", "OFFER_ACCEPTED"],
    );
    expect(items.map((item) => item.key)).toEqual([
      "follow-up:round:r1:2026-10-12",
      "follow-up:application:a3:2026-10-05",
    ]);
  });
});

describe("helpers", () => {
  it("finds upcoming conflicts with stable keys", () => {
    const rounds = [
      {
        id: "a",
        status: "SCHEDULED",
        startUtc: "2026-10-12T05:30:00.000Z",
        endUtc: "2026-10-12T06:30:00.000Z",
      },
      {
        id: "b",
        status: "SCHEDULED",
        startUtc: "2026-10-12T06:00:00.000Z",
        endUtc: "2026-10-12T07:00:00.000Z",
      },
      {
        id: "c",
        status: "SCHEDULED",
        startUtc: "2026-10-01T05:30:00.000Z",
        endUtc: "2026-10-01T06:30:00.000Z",
      },
    ];
    expect(
      upcomingConflicts(rounds, at("2026-10-10T00:00:00.000Z")).map((entry) => entry.key),
    ).toEqual(["conflict:a:2026-10-12T05:30:00.000Z:b:2026-10-12T06:00:00.000Z"]);
  });

  it("shifts dates and describes offsets", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(describeOffset(1440)).toBe("1 day");
    expect(describeOffset(120)).toBe("2 hours");
    expect(describeOffset(30)).toBe("30 minutes");
  });
});

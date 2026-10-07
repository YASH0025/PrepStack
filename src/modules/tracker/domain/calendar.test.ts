import { describe, expect, it } from "vitest";

import {
  NO_FILTERS,
  filterRounds,
  followUpMarkers,
  revisionMarkers,
  slotFromCalendarDate,
  toWallClock,
} from "./calendar";

const rounds = [
  { id: "r1", applicationId: "a1", status: "SCHEDULED", result: "AWAITING", type: "TECHNICAL" },
  { id: "r2", applicationId: "a2", status: "COMPLETED", result: "CLEARED", type: "HR" },
  { id: "r3", applicationId: "a1", status: "CANCELLED", result: "NOT_APPLICABLE", type: "CODING" },
] as const;
const companies: Record<string, string> = { a1: "Acme", a2: "Globex" };

describe("filterRounds", () => {
  it("returns everything without filters and combines filters with AND", () => {
    const companyOf = (id: string) => companies[id];
    expect(filterRounds([...rounds], companyOf, NO_FILTERS)).toHaveLength(3);
    expect(
      filterRounds([...rounds], companyOf, { ...NO_FILTERS, company: "Acme" }).map((r) => r.id),
    ).toEqual(["r1", "r3"]);
    expect(
      filterRounds([...rounds], companyOf, { ...NO_FILTERS, company: "Acme", status: "SCHEDULED" }),
    ).toHaveLength(1);
    expect(filterRounds([...rounds], companyOf, { ...NO_FILTERS, result: "CLEARED" })[0]?.id).toBe(
      "r2",
    );
    expect(filterRounds([...rounds], companyOf, { ...NO_FILTERS, type: "CODING" })[0]?.id).toBe(
      "r3",
    );
  });
});

describe("wall-clock conversion", () => {
  it("shows UTC instants in the profile timezone, including half-hour offsets and DST", () => {
    expect(toWallClock("2026-10-12T05:30:00.000Z", "Asia/Kolkata")).toBe("2026-10-12T11:00:00");
    // London is on BST (UTC+1) in summer and GMT in winter.
    expect(toWallClock("2026-07-01T09:00:00.000Z", "Europe/London")).toBe("2026-07-01T10:00:00");
    expect(toWallClock("2026-12-01T09:00:00.000Z", "Europe/London")).toBe("2026-12-01T09:00:00");
    // Crossing midnight changes the date.
    expect(toWallClock("2026-10-12T20:00:00.000Z", "Asia/Kolkata")).toBe("2026-10-13T01:30:00");
  });

  it("turns calendar picks into form slots", () => {
    expect(slotFromCalendarDate(new Date("2026-10-12T14:30:00Z"), false)).toEqual({
      date: "2026-10-12",
      time: "14:30",
    });
    expect(slotFromCalendarDate(new Date("2026-10-12T00:00:00Z"), true)).toEqual({
      date: "2026-10-12",
      time: "10:00",
    });
  });
});

describe("markers", () => {
  it("creates follow-up markers for active rounds and applications", () => {
    const markers = followUpMarkers(
      [
        {
          id: "r1",
          applicationId: "a1",
          status: "COMPLETED",
          followUpDate: "2026-10-15",
          followUpNote: "No reply from HR",
        },
        {
          id: "r2",
          applicationId: "a1",
          status: "CANCELLED",
          followUpDate: "2026-10-16",
          followUpNote: null,
        },
      ],
      [
        { id: "a1", companyName: "Acme", followUpDate: "2026-10-20" },
        { id: "a2", companyName: "Globex", followUpDate: null },
      ],
    );
    expect(markers).toEqual([
      {
        id: "follow-up-round-r1",
        kind: "FOLLOW_UP",
        date: "2026-10-15",
        label: "Follow up: Acme (No reply from HR)",
        roundId: "r1",
      },
      {
        id: "follow-up-app-a1",
        kind: "FOLLOW_UP",
        date: "2026-10-20",
        label: "Follow up: Acme",
        href: "/interviews/tracker?app=a1",
      },
    ]);
  });

  it("groups pending revision sessions per day", () => {
    const names: Record<string, string> = { t1: "Closures", t2: "Promises", t3: "Event loop" };
    const markers = revisionMarkers(
      [
        {
          kind: "REVISION",
          status: "PENDING",
          scheduledDate: "2026-10-14",
          topicId: "t1",
          coversTopicIds: [],
        },
        {
          kind: "REVISION",
          status: "PENDING",
          scheduledDate: "2026-10-14",
          topicId: null,
          coversTopicIds: ["t2", "t3"],
        },
        {
          kind: "REVISION",
          status: "DONE",
          scheduledDate: "2026-10-13",
          topicId: null,
          coversTopicIds: ["t1"],
        },
        {
          kind: "LEARN",
          status: "PENDING",
          scheduledDate: "2026-10-13",
          topicId: null,
          coversTopicIds: ["t1"],
        },
        {
          kind: "REVISION",
          status: "PENDING",
          scheduledDate: "2026-10-12",
          topicId: "t2",
          coversTopicIds: [],
        },
      ],
      (id) => names[id],
    );
    expect(markers.map((marker) => [marker.date, marker.label])).toEqual([
      ["2026-10-12", "Revise: Promises"],
      ["2026-10-14", "Revise: Closures, Promises +1"],
    ]);
  });
});

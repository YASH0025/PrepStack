import { describe, expect, it } from "vitest";

import { type MatchCandidate, findMatches } from "./matching";
import { pickQuestions, swapQuestion } from "./questions";
import {
  bandsCompatible,
  canReportNoShow,
  isLateCancel,
  isSuspended,
  laterPause,
  overlaps,
  recordNoShow,
  startsSoonEnough,
} from "./rules";
import { peerScore, publicScore } from "./score";

const now = new Date("2026-10-07T10:00:00Z");
const ROLE = "11111111-1111-4111-8111-111111111111";
const OTHER_ROLE = "22222222-2222-4222-8222-222222222222";

let n = 0;
const request = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => {
  n += 1;
  return {
    id: `r${n}`,
    userId: `u${n}`,
    roleId: ROLE,
    band: "2-4",
    startTimes: ["2026-10-08T13:00:00.000Z"],
    createdAt: `2026-10-07T0${n % 10}:00:00.000Z`,
    ...overrides,
  };
};
const open = { now, isBlocked: () => false, isBusy: () => false };

describe("rules", () => {
  it("allows partners within one experience band", () => {
    expect([bandsCompatible("2-4", "4-6"), bandsCompatible("0-2", "4-6")]).toEqual([true, false]);
  });

  it("applies lead time, late cancel and no-show windows", () => {
    expect(startsSoonEnough("2026-10-07T12:00:00Z", now)).toBe(true);
    expect(startsSoonEnough("2026-10-07T11:59:00Z", now)).toBe(false);
    expect(isLateCancel("2026-10-07T11:00:00Z", now)).toBe(true);
    expect(canReportNoShow("2026-10-07T09:45:00Z", now)).toBe(true);
    expect(canReportNoShow("2026-10-07T09:50:00Z", now)).toBe(false);
    expect(overlaps("2026-10-07T10:00:00Z", "2026-10-07T10:59:00Z")).toBe(true);
    expect(overlaps("2026-10-07T10:00:00Z", "2026-10-07T11:00:00Z")).toBe(false);
  });

  it("pauses booking after no-shows from two different sources within 30 days", () => {
    const first = recordNoShow([], now, "partner-a");
    expect(first.suspendedUntil).toBeNull();
    // The same partner reporting again does not pause anyone on their own.
    const again = recordNoShow(first.noShows, new Date("2026-10-15T10:00:00Z"), "partner-a");
    expect(again.suspendedUntil).toBeNull();
    const second = recordNoShow(again.noShows, new Date("2026-10-20T10:00:00Z"), "self:s9");
    expect(second.suspendedUntil).toBe("2026-10-27T10:00:00.000Z");
    expect(isSuspended(second.suspendedUntil, new Date("2026-10-21T00:00:00Z"))).toBe(true);
    // An old no-show outside the window does not count.
    expect(
      recordNoShow([{ at: "2026-08-01T00:00:00.000Z", source: "x" }], now, "y").suspendedUntil,
    ).toBeNull();
  });

  it("never lets a new pause shorten an existing one", () => {
    expect(laterPause("2026-12-01T00:00:00.000Z", "2026-10-20T00:00:00.000Z")).toBe(
      "2026-12-01T00:00:00.000Z",
    );
    expect(laterPause(null, "2026-10-20T00:00:00.000Z")).toBe("2026-10-20T00:00:00.000Z");
    expect(laterPause("2026-10-20T00:00:00.000Z", null)).toBe("2026-10-20T00:00:00.000Z");
  });
});

describe("findMatches", () => {
  it("pairs compatible requests at their earliest common time, oldest first", () => {
    const a = request({ startTimes: ["2026-10-09T13:00:00.000Z", "2026-10-08T13:00:00.000Z"] });
    const b = request({ startTimes: ["2026-10-08T13:00:00.000Z", "2026-10-09T13:00:00.000Z"] });
    const c = request();
    const [match, ...rest] = findMatches([c, b, a], open);
    expect(rest).toEqual([]);
    expect([match?.a.id, match?.b.id, match?.startUtc]).toEqual([
      a.id,
      b.id,
      "2026-10-08T13:00:00.000Z",
    ]);
  });

  it("respects role, band, blocks, busy times, lead time and never self-matches", () => {
    const base = request();
    expect(findMatches([base, request({ roleId: OTHER_ROLE })], open)).toEqual([]);
    expect(findMatches([base, request({ band: "6+" })], open)).toEqual([]);
    expect(findMatches([base, request({ userId: base.userId })], open)).toEqual([]);
    const partner = request();
    expect(
      findMatches([base, partner], {
        ...open,
        isBlocked: (x, y) => x === partner.userId && y === base.userId,
      }),
    ).toEqual([]);
    expect(
      findMatches([base, partner], { ...open, isBusy: (user) => user === base.userId }),
    ).toEqual([]);
    const soon = request({ startTimes: ["2026-10-07T11:00:00.000Z"] });
    const soon2 = request({ startTimes: ["2026-10-07T11:00:00.000Z"] });
    expect(findMatches([soon, soon2], open)).toEqual([]);
  });

  it("does not pair one user twice at overlapping times in the same run", () => {
    const a = request({ userId: "busy", startTimes: ["2026-10-08T13:00:00.000Z"] });
    const b = request({ startTimes: ["2026-10-08T13:00:00.000Z"] });
    const c = request({ userId: "busy", startTimes: ["2026-10-08T13:30:00.000Z"] });
    const d = request({ startTimes: ["2026-10-08T13:30:00.000Z"] });
    expect(findMatches([a, b, c, d], open)).toHaveLength(1);
  });

  it("does not double-book a user matched earlier in the same run", () => {
    const a = request({ userId: "same" });
    const b = request();
    const c = request({ userId: "same" });
    const d = request();
    const matches = findMatches([a, b, c, d], open);
    expect(matches).toHaveLength(1);
  });
});

describe("questions", () => {
  const questions = [
    { id: "a1", topicId: "A" },
    { id: "a2", topicId: "A" },
    { id: "a3", topicId: "A" },
    { id: "b1", topicId: "B" },
    { id: "c1", topicId: "C" },
  ];

  it("spreads picks across topics and is stable per seed", () => {
    const picked = pickQuestions(questions, ["A", "B"], "s1", 3).map((q) => q.id);
    expect(picked).toHaveLength(3);
    expect(picked.filter((id) => id.startsWith("b"))).toEqual(["b1"]);
    expect(pickQuestions(questions, ["A", "B"], "s1", 3).map((q) => q.id)).toEqual(picked);
    expect(pickQuestions(questions, ["C"], "s1")).toHaveLength(1);
  });

  it("swaps within the same topic first, then any chosen topic", () => {
    const current = ["a1", "b1"];
    const swapped = swapQuestion(questions, current, "a1", ["A", "B"], "s");
    expect(swapped[1]).toBe("b1");
    expect(["a2", "a3"]).toContain(swapped[0]);
    expect(swapQuestion(questions, ["b1"], "b1", ["B"], "s")).toEqual(["b1"]);
  });
});

describe("peer score", () => {
  const fb = (sessionId: string, value: number, fromUserId = `p-${sessionId}`) => ({
    sessionId,
    fromUserId,
    ratings: {
      communication: value,
      problemSolving: value,
      technicalDepth: value,
      structure: value,
    },
  });

  it("averages ratings and only goes public when opted in with 3+ sessions", () => {
    const score = peerScore([fb("s1", 4), fb("s2", 3), fb("s3", 5)]);
    expect([score.sessions, score.overall, score.byArea.communication]).toEqual([3, 4, 4]);
    expect(publicScore(score, true)).toEqual(score);
    expect(publicScore(score, false)).toBeNull();
    expect(publicScore(peerScore([fb("s1", 5), fb("s2", 5)]), true)).toBeNull();
    // Three sessions with the same friend are not enough.
    const sameFriend = peerScore([fb("s1", 5, "f"), fb("s2", 5, "f"), fb("s3", 5, "f")]);
    expect([sameFriend.sessions, sameFriend.partners]).toEqual([3, 1]);
    expect(publicScore(sameFriend, true)).toBeNull();
    expect(peerScore([]).overall).toBeNull();
  });
});

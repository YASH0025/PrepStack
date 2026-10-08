import { describe, expect, it } from "vitest";

import { type PassportInput, buildPassport } from "./build";

const input = (overrides: Partial<PassportInput> = {}): PassportInput => ({
  displayName: "Prateek",
  roleName: "Full-Stack Developer",
  trackName: "Full-Stack JavaScript",
  band: "4-6",
  topics: [
    { id: "t1", category: "JavaScript", requiredDepth: "EXPLAIN", relevant: true },
    { id: "t2", category: "JavaScript", requiredDepth: "APPLY", relevant: true },
    { id: "t3", category: "React", requiredDepth: "APPLY", relevant: true },
    { id: "t4", category: "Mobile", requiredDepth: "KNOW", relevant: false },
  ],
  assessedDepth: { t1: 2, t2: 1 },
  completedTopicIds: ["t3"],
  plan: { done: 3, total: 12 },
  review: { streakDays: 4, mastered: 10, reviewedThisWeek: 25 },
  lastDiagnostic: { completedAt: "2026-09-14T10:00:00.000Z" },
  mock: null,
  ...overrides,
});

describe("buildPassport", () => {
  it("counts role topics at target from diagnostic depth or completion", () => {
    const passport = buildPassport(input());
    expect(passport.topics).toEqual({
      atTarget: 2,
      total: 3,
      byCategory: [
        { category: "JavaScript", atTarget: 1, total: 2 },
        { category: "React", atTarget: 1, total: 1 },
      ],
    });
    expect(passport.plan).toEqual({ done: 3, total: 12, progressPct: 25 });
    expect(passport.diagnostic).toEqual({ month: "2026-09", atTargetPct: 50 });
  });

  it("contains only allowlisted aggregate keys", () => {
    const passport = buildPassport(input({ plan: null, lastDiagnostic: null }));
    expect(Object.keys(passport).sort()).toEqual(
      [
        "band",
        "diagnostic",
        "displayName",
        "mock",
        "plan",
        "review",
        "roleName",
        "topics",
        "trackName",
      ].sort(),
    );
    expect([passport.plan, passport.diagnostic, passport.mock]).toEqual([null, null, null]);
  });
});

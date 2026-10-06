import { describe, expect, it } from "vitest";

import { type EngineInput, type EngineTopic, findMissedItems, generateRoadmap } from "./engine";

const topic = (id: string, overrides: Partial<EngineTopic> = {}): EngineTopic => ({
  id,
  slug: id,
  name: id.toUpperCase(),
  coreImportance: 3,
  roleImportance: 5,
  requiredDepth: 2,
  hours: 2,
  ...overrides,
});

const baseInput = (overrides: Partial<EngineInput> = {}): EngineInput => ({
  today: "2026-10-05",
  endDate: "2026-10-18", // 14 days
  dailyHours: 2,
  topics: [],
  edges: [],
  assessedDepth: {},
  completedTopicIds: [],
  doneHoursByTopic: {},
  weakness: {},
  community: null,
  ...overrides,
});

const learnOrder = (output: ReturnType<typeof generateRoadmap>) => [
  ...new Set(output.items.filter((item) => item.kind === "LEARN").map((item) => item.topicId)),
];

describe("generateRoadmap", () => {
  it("is deterministic", () => {
    const input = baseInput({ topics: [topic("a"), topic("b"), topic("c")] });
    expect(generateRoadmap(input)).toEqual(generateRoadmap(input));
  });

  it("drops topics whose required depth the diagnostic already shows", () => {
    const output = generateRoadmap(
      baseInput({ topics: [topic("a"), topic("b")], assessedDepth: { a: 2 } }),
    );
    expect(learnOrder(output)).toEqual(["b"]);
    expect(output.alreadyMet[0]?.topicId).toBe("a");
    expect(output.alreadyMet[0]?.reason).toContain("Diagnostic");
  });

  it("drops completed topics and subtracts hours already studied", () => {
    const output = generateRoadmap(
      baseInput({
        topics: [topic("a"), topic("b", { hours: 4 })],
        completedTopicIds: ["a"],
        doneHoursByTopic: { b: 1 },
      }),
    );
    expect(learnOrder(output)).toEqual(["b"]);
    expect(output.plannedHours).toBe(3);
  });

  it("orders by priority and explains every score", () => {
    const output = generateRoadmap(
      baseInput({
        topics: [
          topic("low", { coreImportance: 1 }),
          topic("high", { coreImportance: 5 }),
          topic("mid", { coreImportance: 3 }),
        ],
      }),
    );
    expect(learnOrder(output)).toEqual(["high", "mid", "low"]);
    for (const item of output.items.filter((entry) => entry.kind === "LEARN")) {
      expect(item.reasons.length).toBeGreaterThan(0);
      expect(item.reasons[0]).toContain("Core importance");
    }
  });

  it("respects prerequisites even when the prerequisite scores lower on its own", () => {
    const output = generateRoadmap(
      baseInput({
        topics: [topic("advanced", { coreImportance: 5 }), topic("basics", { coreImportance: 1 })],
        edges: [{ topicId: "advanced", prerequisiteId: "basics" }],
      }),
    );
    expect(learnOrder(output)).toEqual(["basics", "advanced"]);
    const basics = output.items.find((item) => item.topicId === "basics");
    expect(basics?.priorityScore).toBe(
      output.items.find((item) => item.topicId === "advanced")?.priorityScore,
    );
    expect(basics?.reasons.some((reason) => reason.includes("Prerequisite for ADVANCED"))).toBe(
      true,
    );
  });

  it("boosts weak topics with the reasons from debriefs and the diagnostic", () => {
    const output = generateRoadmap(
      baseInput({
        topics: [topic("a"), topic("b")],
        assessedDepth: { b: 1 },
        weakness: { a: { missed: 1, partial: 0, sources: ["Missed in Acme Round 2"] } },
      }),
    );
    const a = output.items.find((item) => item.topicId === "a");
    const b = output.items.find((item) => item.topicId === "b");
    expect(a?.reasons).toContain("Missed in Acme Round 2");
    expect(b?.reasons.some((reason) => reason.includes("Diagnostic shows Know"))).toBe(true);
    // Diagnostic depth halves the remaining work for b (1 of 2 levels done).
    expect(
      output.items
        .filter((item) => item.topicId === "b" && item.kind === "LEARN")
        .reduce((sum, item) => sum + item.hours, 0),
    ).toBe(1);
  });

  it("applies the community boost only when the sample meets the threshold", () => {
    const topics = [topic("a"), topic("b")];
    const below = generateRoadmap(
      baseInput({
        topics,
        community: { topicCounts: { b: 3 }, sampleSize: 3, threshold: 5, rangeLabel: "Sep 2026" },
      }),
    );
    expect(learnOrder(below)).toEqual(["a", "b"]);

    const above = generateRoadmap(
      baseInput({
        topics,
        community: {
          topicCounts: { b: 6 },
          sampleSize: 8,
          threshold: 5,
          rangeLabel: "Aug–Sep 2026",
        },
      }),
    );
    expect(learnOrder(above)).toEqual(["b", "a"]);
    expect(
      above.items
        .find((item) => item.topicId === "b")
        ?.reasons.some((reason) => reason.includes("6 of 8 community reports")),
    ).toBe(true);
  });

  it("skips the lowest priority topics that do not fit, with a reason", () => {
    // 3 days × 2h × 0.85 = 5.1h budget
    const output = generateRoadmap(
      baseInput({
        endDate: "2026-10-07",
        topics: [
          topic("a", { coreImportance: 5, hours: 3 }),
          topic("b", { coreImportance: 4, hours: 2 }),
          topic("c", { coreImportance: 1, hours: 2 }),
        ],
      }),
    );
    expect(output.budgetHours).toBe(5.1);
    expect(learnOrder(output)).toEqual(["a", "b"]);
    expect(output.skipped).toHaveLength(1);
    expect(output.skipped[0]?.topicId).toBe("c");
    expect(output.skipped[0]?.reason).toContain("study budget");
    expect(output.plannedHours).toBeLessThanOrEqual(output.budgetHours);
  });

  it("skips dependents of skipped prerequisites", () => {
    const output = generateRoadmap(
      baseInput({
        endDate: "2026-10-05", // 1 day, 1.7h
        topics: [topic("big", { hours: 10 }), topic("small", { hours: 1 })],
        edges: [{ topicId: "small", prerequisiteId: "big" }],
      }),
    );
    expect(learnOrder(output)).toEqual([]);
    expect(output.skipped.find((item) => item.topicId === "small")?.reason).toContain(
      "prerequisite BIG",
    );
  });

  it("never schedules more learning on a day than the daily capacity", () => {
    const output = generateRoadmap(
      baseInput({
        topics: Array.from({ length: 8 }, (_, index) => topic(`t${index}`, { hours: 2.5 })),
      }),
    );
    const perDay = new Map<string, number>();
    for (const item of output.items.filter((entry) => entry.kind !== "REVISION")) {
      perDay.set(item.scheduledDate, (perDay.get(item.scheduledDate) ?? 0) + item.hours);
    }
    for (const total of perDay.values()) expect(total).toBeLessThanOrEqual(1.7 + 1e-9);
  });

  it("splits long topics across days and numbers the parts", () => {
    const output = generateRoadmap(baseInput({ topics: [topic("long", { hours: 4 })] }));
    const parts = output.items.filter((item) => item.kind === "LEARN");
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.map((item) => item.part)).toEqual(parts.map((_, index) => index + 1));
    expect(parts.every((item) => item.parts === parts.length)).toBe(true);
    expect(parts.reduce((sum, item) => sum + item.hours, 0)).toBe(4);
  });

  it("adds revision slots and weekly self-checks inside the plan window", () => {
    const output = generateRoadmap(baseInput({ topics: [topic("a"), topic("b")] }));
    const revision = output.items.filter((item) => item.kind === "REVISION");
    expect(revision).toHaveLength(2);
    expect(revision[0]?.reasons[0]).toContain("Spaced revision");
    const checks = output.items.filter((item) => item.kind === "SELF_CHECK");
    expect(checks.length).toBeGreaterThanOrEqual(1);
    expect(checks[0]?.scheduledDate).toBe("2026-10-11");
    expect(checks[0]?.coversTopicIds).toEqual(expect.arrayContaining(["a", "b"]));
    for (const item of output.items) {
      expect(item.scheduledDate >= "2026-10-05" && item.scheduledDate <= "2026-10-18").toBe(true);
    }
  });

  it("handles an end date before today as a one-day plan", () => {
    const output = generateRoadmap(baseInput({ endDate: "2026-10-01", topics: [topic("a")] }));
    expect(output.totalDays).toBe(1);
  });
});

describe("findMissedItems", () => {
  it("returns pending items scheduled before today", () => {
    const items = [
      { scheduledDate: "2026-10-01", status: "PENDING" },
      { scheduledDate: "2026-10-01", status: "DONE" },
      { scheduledDate: "2026-10-05", status: "PENDING" },
    ];
    expect(findMissedItems(items, "2026-10-05")).toEqual([items[0]]);
  });
});

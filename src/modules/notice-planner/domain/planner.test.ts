import { describe, expect, it } from "vitest";

import { daysBetween } from "@/lib/local-date";

import { type NoticePlan, NoticePlanInputSchema } from "../schemas";
import { type PlannerContext, computeNoticePlan, lastWorkingDay, splitPhases } from "./planner";

const base: NoticePlan = {
  id: "00000000-0000-4000-8000-000000000001",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  resignationState: "SERVING",
  noticeDays: 60,
  resignationDate: "2026-10-01",
  buyout: "UNSURE",
  earlyRelease: "UNSURE",
  targetJoiningFrom: null,
  targetJoiningTo: null,
};

const ctx = (overrides: Partial<PlannerContext> = {}): PlannerContext => ({
  today: "2026-10-07",
  prepWindowDays: 30,
  scheduledRoundDates: ["2026-10-20"],
  offers: [],
  hasClearedTechnical: false,
  ...overrides,
});

describe("lastWorkingDay and splitPhases", () => {
  it("adds notice days to the resignation date, across months and leap years", () => {
    expect(lastWorkingDay("2026-10-01", 60)).toBe("2026-11-30");
    expect(lastWorkingDay("2028-02-01", 30)).toBe("2028-03-02");
  });

  it("covers the whole span with consecutive phases and a buffer of at least 3 days", () => {
    const phases = splitPhases("2026-10-01", "2026-11-30");
    expect(phases.map((phase) => phase.kind)).toEqual(["PREP", "INTERVIEWS", "OFFER", "BUFFER"]);
    expect(phases[0]?.start).toBe("2026-10-01");
    expect(phases.at(-1)?.end).toBe("2026-11-30");
    for (let i = 1; i < phases.length; i += 1) {
      expect(daysBetween(phases[i - 1]?.end as string, phases[i]?.start as string)).toBe(1);
    }
    const buffer = phases.at(-1);
    expect(daysBetween(buffer?.start as string, buffer?.end as string) + 1).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("handles very short spans", () => {
    const short = splitPhases("2026-10-01", "2026-10-05");
    expect(short.at(-1)?.end).toBe("2026-10-05");
    expect(short.every((phase) => phase.start <= phase.end)).toBe(true);
    expect(splitPhases("2026-10-01", "2026-10-02")).toHaveLength(1);
    expect(splitPhases("2026-10-02", "2026-10-01")).toEqual([]);
  });
});

describe("computeNoticePlan: serving notice", () => {
  it("computes LWD, progress, markers and a prep-phase deadline", () => {
    const outcome = computeNoticePlan(base, ctx());
    expect(outcome.lwd).toBe("2026-11-30");
    expect(outcome.progress).toEqual({ elapsedDays: 6, totalDays: 60, percent: 10 });
    expect(outcome.prepPhaseEnd).toBe(outcome.phases[0]?.end);
    expect(outcome.markers.map((marker) => marker.kind)).toEqual([
      "RESIGNATION",
      "PHASE",
      "PHASE",
      "PHASE",
      "LWD",
    ]);
    expect(outcome.warnings).toEqual([]);
  });

  it("warns when the LWD is near and nothing is scheduled", () => {
    const outcome = computeNoticePlan(base, ctx({ today: "2026-11-10", scheduledRoundDates: [] }));
    expect(outcome.warnings.map((warning) => warning.code)).toEqual(["NO_INTERVIEWS_NEAR_LWD"]);
    expect(outcome.warnings[0]?.message).toContain("20 days");
  });

  it("warns about offers that start before the user is free, and late clusters", () => {
    const outcome = computeNoticePlan(
      base,
      ctx({
        scheduledRoundDates: ["2026-11-20", "2026-11-22", "2026-11-25"],
        offers: [
          { company: "Acme", joiningDate: "2026-11-15" },
          { company: "Globex", joiningDate: "2026-12-01" },
        ],
      }),
    );
    const codes = outcome.warnings.map((warning) => warning.code);
    expect(codes).toContain("INTERVIEWS_CLUSTERED_LATE");
    expect(codes.filter((code) => code === "JOINING_BEFORE_LWD")).toHaveLength(1);
    expect(outcome.warnings.find((w) => w.code === "JOINING_BEFORE_LWD")?.message).toContain(
      "Acme",
    );
  });

  it("flags a passed LWD and drops the prep deadline once the prep phase is over", () => {
    const outcome = computeNoticePlan(base, ctx({ today: "2026-12-05" }));
    expect(outcome.warnings.map((warning) => warning.code)).toEqual(["LWD_PASSED"]);
    expect(outcome.prepPhaseEnd).toBeNull();
    expect(outcome.progress?.percent).toBe(100);
  });

  it("warns when the target joining window starts before the LWD", () => {
    const outcome = computeNoticePlan({ ...base, targetJoiningFrom: "2026-11-15" }, ctx());
    expect(outcome.warnings.map((warning) => warning.code)).toContain("TARGET_BEFORE_LWD");
  });
});

describe("computeNoticePlan: not resigned / relieved", () => {
  const notResigned: NoticePlan = {
    ...base,
    resignationState: "NOT_RESIGNED",
    resignationDate: null,
  };

  it("shows the LWD if resigning today and advises based on progress, without a roadmap deadline", () => {
    const outcome = computeNoticePlan(notResigned, ctx());
    expect(outcome.lwd).toBeNull();
    expect(outcome.lwdIfResignToday).toBe("2026-12-06");
    expect(outcome.prepPhaseEnd).toBeNull();
    expect(outcome.resignationAdvice).toBe("KEEP_INTERVIEWING");
    expect(
      computeNoticePlan(notResigned, ctx({ hasClearedTechnical: true })).resignationAdvice,
    ).toBe("CLEARED_TECHNICAL");
    expect(
      computeNoticePlan(notResigned, ctx({ offers: [{ company: "Acme", joiningDate: null }] }))
        .resignationAdvice,
    ).toBe("OFFER_IN_HAND");
  });

  it("warns when an offer's joining date is earlier than resigning today allows", () => {
    const outcome = computeNoticePlan(
      notResigned,
      ctx({ offers: [{ company: "Acme", joiningDate: "2026-11-01" }] }),
    );
    expect(outcome.warnings.map((warning) => warning.code)).toEqual(["JOINING_BEFORE_LWD"]);
  });

  it("plans toward the target joining date when relieved", () => {
    const relieved: NoticePlan = {
      ...base,
      resignationState: "RELIEVED",
      targetJoiningFrom: "2026-11-06",
    };
    const outcome = computeNoticePlan(relieved, ctx());
    expect(outcome.phases.at(-1)?.end).toBe("2026-11-05");
    expect(outcome.prepPhaseEnd).toBe(outcome.phases[0]?.end);
    expect(outcome.markers.at(-1)).toEqual({
      date: "2026-11-06",
      kind: "TARGET_JOINING",
      label: "Target joining window starts",
    });
  });
});

describe("NoticePlanInputSchema", () => {
  const input = {
    resignationState: "SERVING",
    noticeDays: 60,
    resignationDate: "2026-10-01",
    buyout: "UNSURE",
    earlyRelease: "NO",
    targetJoiningFrom: "",
    targetJoiningTo: "",
  };

  it("requires notice days and a resignation date when serving notice", () => {
    const result = NoticePlanInputSchema.safeParse({
      ...input,
      noticeDays: null,
      resignationDate: "",
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["noticeDays", "resignationDate"]));
  });

  it("turns empty dates into null and rejects an inverted joining window", () => {
    expect(NoticePlanInputSchema.parse(input).targetJoiningFrom).toBeNull();
    expect(
      NoticePlanInputSchema.safeParse({
        ...input,
        targetJoiningFrom: "2026-12-10",
        targetJoiningTo: "2026-12-01",
      }).success,
    ).toBe(false);
    expect(
      NoticePlanInputSchema.safeParse({
        ...input,
        resignationState: "NOT_RESIGNED",
        noticeDays: null,
        resignationDate: "",
      }).success,
    ).toBe(true);
  });
});

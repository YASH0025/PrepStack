import { describe, expect, it } from "vitest";

import { type InterviewReport } from "../schemas";
import { rangeLabel, roleMatches, topTopics, topicFrequency } from "./frequency";

const T1 = "11111111-1111-4111-8111-111111111111";
const T2 = "22222222-2222-4222-8222-222222222222";

let n = 0;
const report = (
  overrides: Partial<InterviewReport> & { topics?: string[] } = {},
): InterviewReport => {
  n += 1;
  const { topics = [T1], ...rest } = overrides;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    companyName: "Acme",
    companySlug: "acme",
    roleTitle: "Frontend Engineer",
    technologies: [],
    experienceBand: "2-4",
    monthYear: "2026-09",
    outcome: "CLEARED",
    overallDifficulty: 3,
    summary: "",
    rounds: [
      {
        type: "TECHNICAL",
        difficulty: 3,
        durationMinutes: null,
        // The same topic twice in one report counts once.
        questions: [...topics, ...topics].map((topicId) => ({
          text: "q",
          type: "CONCEPT" as const,
          topicId,
          topicLabel: null,
        })),
      },
    ],
    status: "PUBLISHED",
    usefulCount: 0,
    publishedAt: "2026-10-01T00:00:00.000Z",
    moderationNote: null,
    ...rest,
  };
};

describe("topicFrequency", () => {
  it("counts each topic once per published report within the scope and range", () => {
    const reports = [
      report({ topics: [T1, T2], monthYear: "2026-03" }),
      report({ topics: [T1], monthYear: "2026-09" }),
      report({ status: "PENDING" }),
      report({ companySlug: "globex", companyName: "Globex" }),
      report({ monthYear: "2023-01" }),
    ];
    const result = topicFrequency(reports, { company: "ACME Pvt Ltd" }, "2026-10-07");
    expect(result).toEqual({
      sampleSize: 2,
      topicCounts: { [T1]: 2, [T2]: 1 },
      from: "2026-03",
      to: "2026-09",
    });
    expect(topTopics(result)).toEqual([
      { topicId: T1, count: 2 },
      { topicId: T2, count: 1 },
    ]);
  });

  it("filters by role specialisation and experience band", () => {
    const reports = [
      report({ roleTitle: "SDE 2 - Front-end" }),
      report({ roleTitle: "Backend Developer" }),
      report({ roleTitle: "UI Engineer (React)", experienceBand: "4-6" }),
    ];
    expect(
      topicFrequency(reports, { roleName: "Frontend Engineer" }, "2026-10-07").sampleSize,
    ).toBe(1);
    expect(
      topicFrequency(reports, { roleName: "Software Engineer", band: "2-4" }, "2026-10-07")
        .sampleSize,
    ).toBe(2);
  });
});

describe("helpers", () => {
  it("matches roles on specialisation words only", () => {
    expect(roleMatches("Senior Front End Developer", "Frontend Engineer")).toBe(true);
    expect(roleMatches("Android Engineer II", "Frontend Engineer")).toBe(false);
    expect(roleMatches("Anything", "Software Engineer")).toBe(true);
  });

  it("formats date ranges", () => {
    expect(rangeLabel("2026-09", "2026-09")).toBe("Sep 2026");
    expect(rangeLabel("2026-01", "2026-09")).toBe("Jan–Sep 2026");
    expect(rangeLabel("2025-11", "2026-09")).toBe("Nov 2025 – Sep 2026");
    expect(rangeLabel(null, null)).toBe("");
  });
});

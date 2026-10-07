import { describe, expect, it } from "vitest";

import { type InterviewReport } from "../schemas";
import { ReportFiltersSchema, monthsAgo, reportTopicIds, searchReports } from "./search";

const TOPIC = "11111111-1111-4111-8111-111111111111";

let counter = 0;
const report = (overrides: Partial<InterviewReport> = {}): InterviewReport => {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    companyName: "Acme Corp",
    companySlug: "acme",
    roleTitle: "Frontend Engineer",
    technologies: ["React", "TypeScript"],
    experienceBand: "2-4",
    monthYear: "2026-09",
    outcome: "CLEARED",
    overallDifficulty: 3,
    summary: "",
    rounds: [
      {
        type: "TECHNICAL",
        difficulty: 3,
        durationMinutes: 60,
        questions: [
          { text: "Explain closures", type: "CONCEPT", topicId: TOPIC, topicLabel: null },
        ],
      },
    ],
    status: "PUBLISHED",
    usefulCount: 0,
    publishedAt: "2026-10-01T00:00:00.000Z",
    moderationNote: null,
    ...overrides,
  };
};

const filters = (input: Record<string, string> = {}) => ReportFiltersSchema.parse(input);

describe("searchReports", () => {
  it("shows only published reports, newest month first", () => {
    const old = report({ monthYear: "2025-01" });
    const fresh = report({ monthYear: "2026-09" });
    const hidden = report({ status: "HIDDEN" });
    const pending = report({ status: "PENDING" });
    const result = searchReports([old, hidden, fresh, pending], filters(), "2026-10-07");
    expect(result.items.map((item) => item.id)).toEqual([fresh.id, old.id]);
    expect(result.total).toBe(2);
  });

  it("filters by company key, role, tech, band, round, topic, difficulty and text", () => {
    const acme = report();
    const other = report({
      companyName: "Globex",
      companySlug: "globex",
      roleTitle: "Backend Engineer",
      technologies: ["Go"],
      experienceBand: "4-6",
      overallDifficulty: 5,
      rounds: [
        {
          type: "SYSTEM_DESIGN",
          difficulty: 5,
          durationMinutes: null,
          questions: [
            {
              text: "Design a URL shortener",
              type: "SYSTEM_DESIGN",
              topicId: null,
              topicLabel: "Hashing",
            },
          ],
        },
      ],
    });
    const all = [acme, other];
    const ids = (input: Record<string, string>) =>
      searchReports(all, filters(input), "2026-10-07").items.map((item) => item.id);
    expect(ids({ company: "ACME corp." })).toEqual([acme.id]);
    expect(ids({ role: "backend" })).toEqual([other.id]);
    expect(ids({ tech: "react" })).toEqual([acme.id]);
    expect(ids({ band: "4-6" })).toEqual([other.id]);
    expect(ids({ round: "SYSTEM_DESIGN" })).toEqual([other.id]);
    expect(ids({ topic: TOPIC })).toEqual([acme.id]);
    expect(ids({ difficulty: "5" })).toEqual([other.id]);
    expect(ids({ q: "hashing" })).toEqual([other.id]);
  });

  it("applies recency inclusively and ignores invalid filter values", () => {
    const july = report({ monthYear: "2026-07" });
    const june = report({ monthYear: "2026-06" });
    const result = searchReports([july, june], filters({ recency: "3" }), "2026-10-07");
    expect(result.items.map((item) => item.id)).toEqual([july.id]);
    expect(filters({ band: "nope", difficulty: "9", recency: "x", sort: "y" })).toMatchObject({
      band: undefined,
      difficulty: undefined,
      recency: "all",
      sort: "recent",
    });
  });

  it("sorts by usefulness when asked and paginates", () => {
    const low = report({ usefulCount: 1 });
    const high = report({ usefulCount: 9, monthYear: "2025-01" });
    expect(searchReports([low, high], filters({ sort: "useful" }), "2026-10-07").items[0]?.id).toBe(
      high.id,
    );
    const many = Array.from({ length: 25 }, () => report());
    const second = searchReports(many, filters({ page: "2" }), "2026-10-07");
    expect([second.items.length, second.pages]).toEqual([5, 2]);
  });
});

describe("helpers", () => {
  it("computes months ago across years", () => {
    expect(monthsAgo("2026-02-15", 3)).toBe("2025-11");
    expect(monthsAgo("2026-10-07", 0)).toBe("2026-10");
  });

  it("lists distinct topic ids", () => {
    expect(reportTopicIds(report())).toEqual([TOPIC]);
  });
});

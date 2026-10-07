import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ReportFiltersSchema } from "./domain/search";
import { type ReportDraft } from "./schemas";
import { getCommunityService } from "./service";

const VOTER = "61616161-6161-4616-8616-616161616161";
const OTHER = "62626262-6262-4626-8626-626262626262";

const draft = (overrides: Partial<ReportDraft> = {}): ReportDraft => ({
  companyName: "Initech Pvt Ltd",
  roleTitle: "SDE 2",
  technologies: ["Java"],
  experienceBand: "2-4",
  monthYear: "2026-09",
  outcome: "REJECTED",
  overallDifficulty: 4,
  summary: "Mail me at someone@example.com",
  rounds: [
    {
      type: "TECHNICAL",
      difficulty: 4,
      durationMinutes: 45,
      questions: [
        { text: "Design an LRU cache", type: "CODING", topicId: null, topicLabel: "Caching" },
      ],
    },
  ],
  ...overrides,
});

describe("CommunityService", () => {
  it("stores submissions as pending, scrubbed and without any author reference", async () => {
    const service = getCommunityService();
    const report = await service.submit(draft());
    expect(report.status).toBe("PENDING");
    expect(report.companySlug).toBe("initech");
    expect(report.summary).toBe("Mail me at [email removed]");
    expect(Object.keys(report)).not.toContain("userId");
    expect(await service.getPublished(report.id)).toBeNull();
    const filters = ReportFiltersSchema.parse({ company: "Initech" });
    expect((await service.search(filters, "2026-10-07")).total).toBe(0);

    await service.approve(report.id);
    expect((await service.search(filters, "2026-10-07")).items.map((item) => item.id)).toEqual([
      report.id,
    ]);
    expect((await service.getPublished(report.id))?.publishedAt).not.toBeNull();
  });

  it("toggles one useful vote per user and keeps the count in sync", async () => {
    const service = getCommunityService();
    const report = await service.approve((await service.submit(draft())).id);
    expect(await service.toggleVote(report.id, VOTER)).toEqual({ voted: true, count: 1 });
    expect(await service.toggleVote(report.id, OTHER)).toEqual({ voted: true, count: 2 });
    expect(await service.toggleVote(report.id, VOTER)).toEqual({ voted: false, count: 1 });
    expect((await service.votedIds(OTHER)).has(report.id)).toBe(true);
    await service.removeUserActivity(OTHER);
    expect((await service.get(report.id))?.usefulCount).toBe(0);
  });

  it("dedupes open flags, resolves them on moderation and removes everything on delete", async () => {
    const service = getCommunityService();
    const report = await service.approve((await service.submit(draft())).id);
    expect(await service.flag(report.id, VOTER, "PERSONAL_INFO", "Has a name")).toEqual({
      created: true,
    });
    expect(await service.flag(report.id, VOTER, "SPAM", "")).toEqual({ created: false });
    let queue = await service.moderationQueue();
    expect(queue.flagged.map((entry) => entry.report.id)).toContain(report.id);

    await service.edit(report.id, draft({ summary: "Call 9876543210" }), "Removed contact");
    const edited = await service.get(report.id);
    expect([edited?.summary, edited?.status]).toEqual(["Call [phone removed]", "PUBLISHED"]);
    queue = await service.moderationQueue();
    expect(queue.flagged.map((entry) => entry.report.id)).not.toContain(report.id);

    await service.hide(report.id, "Duplicate");
    expect(await service.getPublished(report.id)).toBeNull();
    await expect(service.toggleVote(report.id, VOTER)).rejects.toThrow(/not found/);

    expect(await service.remove(report.id)).toBe(true);
    expect(await service.get(report.id)).toBeNull();
  });
});

/** Privacy rule: the community module has no code path to private data. */
describe("community module boundary", () => {
  async function sourceFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return Promise.resolve(
          /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [full] : [],
        );
      }),
    );
    return nested.flat();
  }

  it("never imports private storage or private modules", async () => {
    const files = await sourceFiles(path.join(process.cwd(), "src/modules/community"));
    expect(files.length).toBeGreaterThan(3);
    const forbidden =
      /privatePath|privateUserDir|listPrivateUserIds|@\/modules\/(tracker|profile|progress|roadmap|story-bank|review|notice-planner|revision-sheet|assessment|bookmarks|notifications)/;
    for (const file of files) {
      const source = await readFile(file, "utf8");
      expect(source, path.relative(process.cwd(), file)).not.toMatch(forbidden);
    }
  });
});

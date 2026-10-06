import { beforeAll, describe, expect, it } from "vitest";

import { bandForYears } from "@/lib/domain";
import { getContentService } from "@/modules/content/service";
import { type Profile } from "@/modules/profile/schemas";
import { progressServiceFor } from "@/modules/progress/service";
import { seedContentIfMissing } from "@/seed";

import { roadmapServiceFor, topicsFullyLearned } from "./service";

const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOW = new Date("2026-10-05T04:00:00Z");

let profile: Profile;

beforeAll(async () => {
  await seedContentIfMissing();
  const content = getContentService();
  const [track] = await content.tracks();
  const roles = await content.roles(track?.id);
  const fullstack = roles.find((role) => role.slug === "fullstack");
  if (!track || !fullstack) throw new Error("seed missing");
  profile = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    displayName: "",
    stack: ["React"],
    yearsOfExperience: 3,
    experienceBand: bandForYears(3),
    trackId: track.id,
    targetRoleId: fullstack.id,
    targetCompanies: [],
    prepWindowDays: 30,
    dailyHours: 2,
    timezone: "Asia/Kolkata",
    reminderMinutes: [1440, 60],
    reviewDailyCap: 20,
    onboardingCompletedAt: NOW.toISOString(),
  };
});

describe("RoadmapService with seed content", () => {
  it("builds a plan within budget, inside the window, with reasons", async () => {
    const roadmap = await roadmapServiceFor(USER).regenerate(profile, NOW);
    expect(roadmap.startDate).toBe("2026-10-05");
    expect(roadmap.endDate).toBe("2026-11-03");
    expect(roadmap.deadlineSource).toBe("PREP_WINDOW");
    expect(roadmap.plannedHours).toBeLessThanOrEqual(roadmap.budgetHours);
    const learn = roadmap.items.filter((item) => item.kind === "LEARN");
    expect(learn.length).toBeGreaterThan(10);
    expect(learn.every((item) => item.reasons.length > 0)).toBe(true);
    // 30 days × 2h is not enough for every full-stack topic: honesty about time.
    expect(roadmap.skipped.length).toBeGreaterThan(0);
  });

  it("preserves completed items and syncs topic progress on re-plan", async () => {
    const service = roadmapServiceFor(USER);
    const roadmap = await service.get();
    const first = roadmap?.items.find((item) => item.kind === "LEARN");
    if (!first?.topicId) throw new Error("no learn item");

    await service.completeTopic(first.topicId, NOW);
    const after = await service.get();
    expect(topicsFullyLearned(after?.items ?? []).has(first.topicId)).toBe(true);

    await progressServiceFor(USER).setStatus(first.topicId, "COMPLETED", NOW);
    const replanned = await service.regenerate(profile, new Date("2026-10-07T04:00:00Z"));
    const doneForTopic = replanned.items.filter(
      (item) => item.topicId === first.topicId && item.status === "DONE",
    );
    expect(doneForTopic.length).toBeGreaterThan(0);
    // The completed topic is not scheduled again.
    expect(
      replanned.items.some(
        (item) =>
          item.topicId === first.topicId && item.status === "PENDING" && item.kind === "LEARN",
      ),
    ).toBe(false);
    expect(replanned.startDate).toBe("2026-10-07");
  });

  it("toggles items and reports when a topic becomes fully learned", async () => {
    const service = roadmapServiceFor(USER);
    const roadmap = await service.get();
    const single = roadmap?.items.find(
      (item) => item.kind === "LEARN" && item.status === "PENDING" && item.parts === 1,
    );
    if (!single) throw new Error("no single-part item");
    const result = await service.setItemStatus(single.id, true, NOW);
    expect(result.completedTopicId).toBe(single.topicId);
    const undone = await service.setItemStatus(single.id, false, NOW);
    expect(undone.completedTopicId).toBeNull();
  });
});

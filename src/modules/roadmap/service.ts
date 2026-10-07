import "server-only";

import { randomUUID } from "node:crypto";

import { DEPTH_LEVEL } from "@/lib/domain";
import { todayIn } from "@/lib/local-date";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { getContentService } from "@/modules/content/service";
import { type Profile } from "@/modules/profile/schemas";

import { type DeadlineCandidate, chooseDeadline } from "./domain/deadline";
import { type EngineTopic, findMissedItems, generateRoadmap } from "./domain/engine";
import { type RoadmapRepository } from "./repository";
import { JsonRoadmapRepository } from "./repository.json";
import { type Roadmap, type RoadmapItem } from "./schemas";
import { collectRoadmapSignals } from "./signals";

export class RoadmapService {
  constructor(
    private readonly userId: string,
    private readonly repo: RoadmapRepository,
  ) {}

  get(): Promise<Roadmap | null> {
    return this.repo.get();
  }

  /**
   * (Re-)generates the roadmap from the user's current situation.
   * Completed items are always preserved; everything else is re-planned.
   */
  async regenerate(profile: Profile, now: Date = new Date()): Promise<Roadmap> {
    const today = todayIn(profile.timezone, now);
    const catalog = await getContentService().catalog(profile.trackId);
    if (!catalog) throw new Error("Track not found");

    const topics: EngineTopic[] = catalog.topics
      .map((topic) => {
        const roleImportance =
          topic.roleImportance.find((entry) => entry.roleId === profile.targetRoleId)?.importance ??
          0;
        const band = topic.depthByBand[profile.experienceBand];
        return {
          id: topic.id,
          slug: topic.slug,
          name: topic.name,
          coreImportance: topic.coreImportance,
          roleImportance,
          requiredDepth: DEPTH_LEVEL[band.depth],
          hours: band.hours,
        };
      })
      .filter((topic) => topic.roleImportance > 0);

    const current = await this.repo.get();
    const doneItems = (current?.items ?? []).filter((item) => item.status === "DONE");
    const doneHoursByTopic: Record<string, number> = {};
    for (const item of doneItems) {
      if (item.kind === "LEARN" && item.topicId) {
        doneHoursByTopic[item.topicId] = (doneHoursByTopic[item.topicId] ?? 0) + item.hours;
      }
    }

    const signals = await collectRoadmapSignals(this.userId, profile, catalog, today, now);
    const completedFromPlan = topicsFullyLearned(current?.items ?? []);
    const completedTopicIds = [...new Set([...completedFromPlan, ...signals.completedTopicIds])];

    const deadline = chooseDeadline(today, profile.prepWindowDays, signals.deadlines);
    const assessedDepth = await assessmentServiceFor(this.userId).latestDepths(profile.trackId);

    const output = generateRoadmap({
      today,
      endDate: deadline.endDate,
      dailyHours: profile.dailyHours,
      topics,
      edges: catalog.prerequisites,
      assessedDepth,
      completedTopicIds,
      doneHoursByTopic,
      weakness: signals.weakness,
      community: signals.community,
    });

    const planned: RoadmapItem[] = output.items.map((item) => ({
      ...item,
      id: randomUUID(),
      status: "PENDING",
      completedAt: null,
    }));

    return this.repo.set({
      generatedAt: now.toISOString(),
      startDate: today,
      endDate: deadline.endDate,
      deadlineSource: deadline.source,
      deadlineLabel: deadline.label,
      dailyHours: profile.dailyHours,
      budgetHours: output.budgetHours,
      plannedHours: output.plannedHours,
      items: [...doneItems, ...planned].sort(
        (a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.kind.localeCompare(b.kind),
      ),
      skipped: output.skipped,
      alreadyMet: output.alreadyMet,
    });
  }

  /** Marks one item done or not done. Returns the topic ids whose learning just completed. */
  async setItemStatus(itemId: string, done: boolean, now: Date = new Date()) {
    let completedTopicId: string | null = null;
    const updated = await this.repo.mutate((current) => {
      if (!current) return current;
      const items = current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: done ? ("DONE" as const) : ("PENDING" as const),
              completedAt: done ? now.toISOString() : null,
            }
          : item,
      );
      const target = items.find((item) => item.id === itemId);
      if (done && target?.kind === "LEARN" && target.topicId) {
        if (topicsFullyLearned(items).has(target.topicId)) completedTopicId = target.topicId;
      }
      return { ...current, items };
    });
    return { roadmap: updated, completedTopicId };
  }

  /** Marks every LEARN item of a topic done (when the user completes the topic elsewhere). */
  async completeTopic(topicId: string, now: Date = new Date()): Promise<void> {
    await this.repo.mutate((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) =>
          item.topicId === topicId && item.kind === "LEARN" && item.status !== "DONE"
            ? { ...item, status: "DONE" as const, completedAt: now.toISOString() }
            : item,
        ),
      };
    });
  }

  missedItems(roadmap: Roadmap, today: string): RoadmapItem[] {
    return findMissedItems(roadmap.items, today);
  }
}

/** Topics whose LEARN items in the plan are all done. */
export function topicsFullyLearned(items: RoadmapItem[]): Set<string> {
  const byTopic = new Map<string, { total: number; done: number }>();
  for (const item of items) {
    if (item.kind !== "LEARN" || !item.topicId) continue;
    const entry = byTopic.get(item.topicId) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (item.status === "DONE") entry.done += 1;
    byTopic.set(item.topicId, entry);
  }
  return new Set([...byTopic].filter(([, entry]) => entry.done === entry.total).map(([id]) => id));
}

export function roadmapServiceFor(userId: string): RoadmapService {
  return new RoadmapService(userId, new JsonRoadmapRepository(userId));
}

export type { DeadlineCandidate };

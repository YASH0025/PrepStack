import "server-only";

import { type LocalDateString } from "@/lib/local-date";
import { type ContentCatalog } from "@/modules/content/service";
import { type Profile } from "@/modules/profile/schemas";
import { noticePlannerFor } from "@/modules/notice-planner/service";
import { progressServiceFor } from "@/modules/progress/service";
import { trackerFor } from "@/modules/tracker/service";

import { type DeadlineCandidate, interviewDeadlines } from "./domain/deadline";
import { type CommunitySignal, type WeaknessSignal } from "./domain/engine";

/**
 * Inputs the roadmap takes from other modules. Each module contributes through
 * its own service; the roadmap never reads other modules' files directly.
 */
export interface RoadmapSignals {
  deadlines: DeadlineCandidate[];
  weakness: Record<string, WeaknessSignal>;
  community: CommunitySignal | null;
  /** Topics the user marked completed on topic pages. */
  completedTopicIds: string[];
}

export function addWeakness(
  weakness: Record<string, WeaknessSignal>,
  topicId: string,
  kind: "missed" | "partial",
  source: string,
): void {
  const entry = weakness[topicId] ?? { missed: 0, partial: 0, sources: [] };
  entry[kind] += 1;
  if (!entry.sources.includes(source)) entry.sources.push(source);
  weakness[topicId] = entry;
}

export async function collectRoadmapSignals(
  userId: string,
  profile: Profile,
  catalog: ContentCatalog,
  _today: LocalDateString,
  now: Date = new Date(),
): Promise<RoadmapSignals> {
  const progress = progressServiceFor(userId);
  const known = new Set(catalog.topics.map((topic) => topic.id));
  const weakness: Record<string, WeaknessSignal> = {};

  // Topics the user flagged themselves count as a partial weakness.
  for (const flagged of await progress.flaggedTopicIds()) {
    if (!known.has(flagged.topicId)) continue;
    addWeakness(
      weakness,
      flagged.topicId,
      "partial",
      flagged.status === "DIFFICULT"
        ? "You marked this topic as difficult."
        : "You marked this topic as needing revision.",
    );
  }

  // Upcoming technical interviews become deadlines (the plan finishes the day before).
  const tracker = trackerFor(userId);
  const [rounds, applications] = await Promise.all([
    tracker.listRounds(),
    tracker.listApplications(),
  ]);
  const company = new Map(applications.map((app) => [app.id, app.companyName]));
  const deadlines = interviewDeadlines(
    rounds.map((round) => ({
      startUtc: round.startUtc,
      status: round.status,
      type: round.type,
      companyName: company.get(round.applicationId) ?? "Interview",
    })),
    profile.timezone,
    now,
  );

  // The end of the notice-period prep phase is also a deadline.
  const notice = await noticePlannerFor(userId).outcome(now);
  if (notice?.outcome.prepPhaseEnd) {
    deadlines.push({
      date: notice.outcome.prepPhaseEnd,
      source: "NOTICE_PREP_END",
      label: "End of the prep phase in your notice plan",
    });
  }

  return {
    deadlines,
    weakness,
    community: null,
    completedTopicIds: (await progress.completedTopicIds()).filter((id) => known.has(id)),
  };
}

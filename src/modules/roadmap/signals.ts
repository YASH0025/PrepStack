import "server-only";

import { type LocalDateString } from "@/lib/local-date";
import { type ContentCatalog } from "@/modules/content/service";
import { type Profile } from "@/modules/profile/schemas";
import { progressServiceFor } from "@/modules/progress/service";

import { type DeadlineCandidate } from "./domain/deadline";
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
  _profile: Profile,
  catalog: ContentCatalog,
  _today: LocalDateString,
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

  return {
    deadlines: [],
    weakness,
    community: null,
    completedTopicIds: (await progress.completedTopicIds()).filter((id) => known.has(id)),
  };
}

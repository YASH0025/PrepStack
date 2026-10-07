import "server-only";

import { getContentService } from "@/modules/content/service";
import { getProfile } from "@/modules/profile/service";
import { progressServiceFor } from "@/modules/progress/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";

import { type Round } from "./schemas";

export interface RoundPrep {
  /** Curated questions to ask the interviewer for this round type. */
  interviewerQuestions: string[];
  /** Topics to revise before this round: pending roadmap topics and flagged weak topics. */
  topicsToRevise: { slug: string; name: string; reason: string }[];
}

/**
 * Prep information for a scheduled round, assembled from other modules'
 * services. Returns small, display-ready data for the calendar drawer.
 */
export async function buildRoundPrep(userId: string, round: Round): Promise<RoundPrep> {
  const content = getContentService();
  const [curated, profile] = await Promise.all([
    content.interviewerQuestions(),
    getProfile(userId),
  ]);
  const interviewerQuestions = curated
    .filter((question) => question.roundTypes.includes(round.type))
    .map((question) => question.text);

  if (!profile) return { interviewerQuestions, topicsToRevise: [] };

  const [topics, roadmap, flagged] = await Promise.all([
    content.topics({ trackId: profile.trackId, publishedOnly: true }),
    roadmapServiceFor(userId).get(),
    progressServiceFor(userId).flaggedTopicIds(),
  ]);
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const roundDate = round.startUtc.slice(0, 10);
  const seen = new Set<string>();
  const topicsToRevise: RoundPrep["topicsToRevise"] = [];

  for (const entry of flagged) {
    const topic = byId.get(entry.topicId);
    if (!topic || seen.has(topic.id)) continue;
    seen.add(topic.id);
    topicsToRevise.push({
      slug: topic.slug,
      name: topic.name,
      reason: entry.status === "DIFFICULT" ? "You marked it difficult" : "Needs revision",
    });
  }
  for (const item of roadmap?.items ?? []) {
    if (item.kind !== "LEARN" || item.status !== "PENDING" || !item.topicId) continue;
    if (item.scheduledDate > roundDate) continue;
    const topic = byId.get(item.topicId);
    if (!topic || seen.has(topic.id)) continue;
    seen.add(topic.id);
    topicsToRevise.push({
      slug: topic.slug,
      name: topic.name,
      reason: "Planned before this round, not done yet",
    });
  }

  return { interviewerQuestions, topicsToRevise: topicsToRevise.slice(0, 8) };
}

/**
 * Builds the public passport (PURE) from the owner's own data. Only
 * aggregates leave this function.
 */
import { DEPTH_LEVEL, type DepthLevel, type ExperienceBand } from "@/lib/domain";

import { type PassportData } from "../schemas";

export interface PassportTopic {
  id: string;
  category: string;
  /** Required depth for the owner's band. */
  requiredDepth: keyof typeof DEPTH_LEVEL;
  relevant: boolean;
}

export interface PassportInput {
  displayName: string;
  roleName: string;
  trackName: string;
  band: ExperienceBand;
  topics: PassportTopic[];
  assessedDepth: Record<string, DepthLevel>;
  completedTopicIds: string[];
  plan: { done: number; total: number } | null;
  review: { streakDays: number; mastered: number; reviewedThisWeek: number };
  lastDiagnostic: { completedAt: string } | null;
  /** Public mock score, already filtered by opt-in and minimum sessions. */
  mock: { sessions: number; overall: number; byArea: Record<string, number | null> } | null;
}

export function buildPassport(input: PassportInput): PassportData {
  const relevant = input.topics.filter((topic) => topic.relevant);
  const completed = new Set(input.completedTopicIds);
  const atTarget = (topic: PassportTopic) =>
    completed.has(topic.id) ||
    (input.assessedDepth[topic.id] ?? -1) >= DEPTH_LEVEL[topic.requiredDepth];

  const categories = [...new Set(relevant.map((topic) => topic.category))];
  const byCategory = categories
    .map((category) => {
      const inCategory = relevant.filter((topic) => topic.category === category);
      return {
        category,
        atTarget: inCategory.filter(atTarget).length,
        total: inCategory.length,
      };
    })
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

  const assessed = relevant.filter((topic) => topic.id in input.assessedDepth);
  const diagnosticAtTarget = assessed.filter(
    (topic) => (input.assessedDepth[topic.id] ?? -1) >= DEPTH_LEVEL[topic.requiredDepth],
  ).length;

  return {
    displayName: input.displayName,
    roleName: input.roleName,
    trackName: input.trackName,
    band: input.band,
    plan:
      input.plan && input.plan.total > 0
        ? {
            done: input.plan.done,
            total: input.plan.total,
            progressPct: Math.round((input.plan.done / input.plan.total) * 100),
          }
        : null,
    topics: {
      atTarget: relevant.filter(atTarget).length,
      total: relevant.length,
      byCategory,
    },
    review: input.review,
    diagnostic:
      input.lastDiagnostic && assessed.length > 0
        ? {
            month: input.lastDiagnostic.completedAt.slice(0, 7),
            atTargetPct: Math.round((diagnosticAtTarget / assessed.length) * 100),
          }
        : null,
    mock: input.mock,
  };
}

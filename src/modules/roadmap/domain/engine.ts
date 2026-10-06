/**
 * Rules-based roadmap engine (PURE: no I/O, no clock, deterministic).
 *
 * Given the user's situation it decides which topics to study, in what order,
 * on which days, and explains every decision in plain language:
 *
 *  1. Keep topics required for the target role.
 *  2. Required depth comes from the user's experience band.
 *  3. Drop topics where the diagnostic shows the depth is already met, or the
 *     user already completed the topic.
 *  4. Score: core importance × level weight × role weight
 *            + community frequency boost (only if the sample is big enough)
 *            + weakness boost (diagnostic gap, debrief misses/partials)
 *  5. Prerequisites inherit the priority of what depends on them.
 *  6. Fit to the hour budget; what does not fit is "skipped" with a reason.
 *  7. Order by priority while respecting prerequisites (topological sort).
 *  8. Schedule into days, with revision slots and a weekly self-check.
 */
import { DEPTHS, DEPTH_LABELS, type DepthLevel } from "@/lib/domain";
import { type LocalDateString, addDays, daysBetween } from "@/lib/local-date";

export type ItemKind = "LEARN" | "REVISION" | "SELF_CHECK";

export interface EngineTopic {
  id: string;
  slug: string;
  name: string;
  coreImportance: number;
  /** Importance for the user's target role, 1–5. */
  roleImportance: number;
  /** Depth required at the user's experience band (1–4). */
  requiredDepth: Exclude<DepthLevel, 0>;
  /** Hours to reach the required depth from scratch. */
  hours: number;
}

export interface WeaknessSignal {
  missed: number;
  partial: number;
  /** Human-readable sources, e.g. "Missed in Acme Round 2". */
  sources: string[];
}

export interface CommunitySignal {
  /** Reports mentioning each topic. */
  topicCounts: Record<string, number>;
  sampleSize: number;
  threshold: number;
  /** Date range of the reports, e.g. "Jan–Sep 2026". */
  rangeLabel: string;
}

export interface EngineConfig {
  levelWeight: Record<Exclude<DepthLevel, 0>, number>;
  communityMaxBoost: number;
  weaknessWeights: { missed: number; partial: number; gap: number };
  /** Share of daily time reserved for revision. */
  revisionRatio: number;
  revisionDelayDays: number;
  revisionHours: number;
  selfCheckEveryDays: number;
  selfCheckHours: number;
  /** Smallest chunk of a topic placed on a day. */
  minChunkHours: number;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  levelWeight: { 1: 1, 2: 1.5, 3: 2, 4: 2.5 },
  communityMaxBoost: 4,
  weaknessWeights: { missed: 3, partial: 1.5, gap: 1 },
  revisionRatio: 0.15,
  revisionDelayDays: 3,
  revisionHours: 0.5,
  selfCheckEveryDays: 7,
  selfCheckHours: 0.75,
  minChunkHours: 0.25,
};

export interface EngineInput {
  today: LocalDateString;
  /** Last day of the plan (inclusive). */
  endDate: LocalDateString;
  dailyHours: number;
  topics: EngineTopic[];
  edges: { topicId: string; prerequisiteId: string }[];
  /** Demonstrated depth per topic from the latest diagnostic. Missing = not assessed. */
  assessedDepth: Record<string, DepthLevel>;
  /** Topics the user has fully completed (they stay out of the plan). */
  completedTopicIds: string[];
  /** Hours already studied per topic (DONE learn items), subtracted from the estimate. */
  doneHoursByTopic: Record<string, number>;
  weakness: Record<string, WeaknessSignal>;
  community: CommunitySignal | null;
  config?: Partial<EngineConfig>;
}

export interface PlannedItem {
  topicId: string | null;
  kind: ItemKind;
  scheduledDate: LocalDateString;
  hours: number;
  priorityScore: number;
  reasons: string[];
  requiredDepth: DepthLevel;
  currentDepth: DepthLevel;
  /** For LEARN items split over several days. */
  part: number;
  parts: number;
  /** Topics a SELF_CHECK covers. */
  coversTopicIds: string[];
}

export interface SkippedTopic {
  topicId: string;
  priorityScore: number;
  hours: number;
  reason: string;
}

export interface EngineOutput {
  items: PlannedItem[];
  skipped: SkippedTopic[];
  totalDays: number;
  budgetHours: number;
  plannedHours: number;
  /** Topics excluded because the user already meets the required depth. */
  alreadyMet: { topicId: string; reason: string }[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const roundQuarter = (value: number) => Math.round(value * 4) / 4;

function depthName(level: DepthLevel): string {
  return level === 0
    ? "none yet"
    : DEPTH_LABELS[DEPTHS[level - 1] as (typeof DEPTHS)[number]].label;
}

export function generateRoadmap(input: EngineInput): EngineOutput {
  const config: EngineConfig = { ...DEFAULT_ENGINE_CONFIG, ...input.config };
  const totalDays = Math.max(1, daysBetween(input.today, input.endDate) + 1);
  const topicById = new Map(input.topics.map((topic) => [topic.id, topic]));
  const completed = new Set(input.completedTopicIds);

  /* 1–3. Candidates ------------------------------------------------------- */
  const alreadyMet: EngineOutput["alreadyMet"] = [];
  const candidates: EngineTopic[] = [];
  for (const topic of input.topics) {
    const assessed = input.assessedDepth[topic.id];
    if (completed.has(topic.id)) continue;
    if (assessed !== undefined && assessed >= topic.requiredDepth) {
      alreadyMet.push({
        topicId: topic.id,
        reason: `Diagnostic shows ${depthName(assessed)}; ${depthName(topic.requiredDepth)} is required at your level.`,
      });
      continue;
    }
    candidates.push(topic);
  }

  /* 4. Score ---------------------------------------------------------------- */
  const score = new Map<string, number>();
  const reasons = new Map<string, string[]>();
  const hours = new Map<string, number>();
  const communityActive =
    input.community !== null && input.community.sampleSize >= input.community.threshold;

  for (const topic of candidates) {
    const why: string[] = [];
    let value =
      topic.coreImportance * config.levelWeight[topic.requiredDepth] * (topic.roleImportance / 5);
    why.push(
      `Core importance ${topic.coreImportance}/5 and ${topic.roleImportance}/5 for your target role; ${depthName(topic.requiredDepth)} depth expected at your experience level.`,
    );

    if (communityActive && input.community) {
      const count = input.community.topicCounts[topic.id] ?? 0;
      if (count > 0) {
        value += (count / input.community.sampleSize) * config.communityMaxBoost;
        why.push(
          `Asked in ${count} of ${input.community.sampleSize} community reports for your role and level (${input.community.rangeLabel}).`,
        );
      }
    }

    const assessed = input.assessedDepth[topic.id];
    if (assessed !== undefined) {
      const gap = topic.requiredDepth - assessed;
      value += gap * config.weaknessWeights.gap;
      why.push(
        `Diagnostic shows ${depthName(assessed)}; you need ${depthName(topic.requiredDepth)}.`,
      );
    }

    const weakness = input.weakness[topic.id];
    if (weakness && weakness.missed + weakness.partial > 0) {
      value +=
        weakness.missed * config.weaknessWeights.missed +
        weakness.partial * config.weaknessWeights.partial;
      why.push(...weakness.sources.slice(0, 3));
    }

    // Hours scale with how much depth is still missing, minus time already studied.
    const startDepth = assessed ?? 0;
    const fraction = (topic.requiredDepth - startDepth) / topic.requiredDepth;
    const remaining = topic.hours * fraction - (input.doneHoursByTopic[topic.id] ?? 0);
    hours.set(topic.id, Math.max(config.minChunkHours * 2, roundQuarter(remaining)));
    score.set(topic.id, round2(value));
    reasons.set(topic.id, why);
  }

  /* 5. Prerequisite priority inheritance ----------------------------------- */
  const candidateIds = new Set(candidates.map((topic) => topic.id));
  const prerequisitesOf = new Map<string, string[]>();
  for (const edge of input.edges) {
    if (!candidateIds.has(edge.topicId) || !candidateIds.has(edge.prerequisiteId)) continue;
    const list = prerequisitesOf.get(edge.topicId) ?? [];
    list.push(edge.prerequisiteId);
    prerequisitesOf.set(edge.topicId, list);
  }
  const effective = new Map(score);
  for (const topic of candidates) {
    const own = score.get(topic.id) ?? 0;
    const stack = [...(prerequisitesOf.get(topic.id) ?? [])];
    const seen = new Set<string>();
    while (stack.length) {
      const prerequisite = stack.pop() as string;
      if (seen.has(prerequisite)) continue;
      seen.add(prerequisite);
      if (own > (effective.get(prerequisite) ?? 0)) {
        effective.set(prerequisite, own);
      }
      stack.push(...(prerequisitesOf.get(prerequisite) ?? []));
    }
  }
  for (const topic of candidates) {
    const dependents = candidates.filter((other) =>
      (prerequisitesOf.get(other.id) ?? []).includes(topic.id),
    );
    if (dependents.length > 0) {
      reasons
        .get(topic.id)
        ?.push(`Prerequisite for ${dependents.map((other) => other.name).join(", ")}.`);
    }
  }

  const byPriority = (a: EngineTopic, b: EngineTopic) =>
    (effective.get(b.id) ?? 0) - (effective.get(a.id) ?? 0) ||
    b.coreImportance - a.coreImportance ||
    a.slug.localeCompare(b.slug);

  /* 6. Order: topological sort, highest-priority ready topic first --------- */
  // Prerequisites inherited their dependents' priority, so this order is both
  // dependency-safe and as close to pure priority order as the graph allows.
  const remainingPrerequisites = new Map<string, number>();
  for (const topic of candidates) {
    remainingPrerequisites.set(topic.id, (prerequisitesOf.get(topic.id) ?? []).length);
  }
  const topoOrder: EngineTopic[] = [];
  const ready = candidates.filter((topic) => remainingPrerequisites.get(topic.id) === 0);
  while (ready.length) {
    ready.sort(byPriority);
    const next = ready.shift() as EngineTopic;
    topoOrder.push(next);
    for (const topic of candidates) {
      if ((prerequisitesOf.get(topic.id) ?? []).includes(next.id)) {
        const left = (remainingPrerequisites.get(topic.id) ?? 0) - 1;
        remainingPrerequisites.set(topic.id, left);
        if (left === 0) ready.push(topic);
      }
    }
  }

  /* 7. Fit to budget in that order --------------------------------------- */
  const weeks = Math.floor(totalDays / config.selfCheckEveryDays);
  const learnPerDay = input.dailyHours * (1 - config.revisionRatio);
  const budgetHours = round2(Math.max(0, learnPerDay * totalDays - weeks * config.selfCheckHours));
  const ordered: EngineTopic[] = [];
  const skipped: SkippedTopic[] = [];
  const skippedIds = new Set<string>();
  let used = 0;
  // Fill by priority (highest first) but never keep a topic whose prerequisite was skipped.
  const keptIds = new Set<string>();
  // Ties keep topological order, so a prerequisite is always considered before its dependents.
  const topoIndex = new Map(topoOrder.map((topic, index) => [topic.id, index]));
  const fillOrder = [...topoOrder].sort(
    (a, b) =>
      (effective.get(b.id) ?? 0) - (effective.get(a.id) ?? 0) ||
      (topoIndex.get(a.id) ?? 0) - (topoIndex.get(b.id) ?? 0),
  );
  for (const topic of fillOrder) {
    const topicHours = hours.get(topic.id) ?? 0;
    const prerequisites = prerequisitesOf.get(topic.id) ?? [];
    const missing = prerequisites.find((id) => skippedIds.has(id));
    const unplaced = prerequisites.find((id) => !keptIds.has(id) && !skippedIds.has(id));
    if (missing || unplaced) {
      const blocker = missing ?? unplaced ?? "";
      skippedIds.add(topic.id);
      skipped.push({
        topicId: topic.id,
        priorityScore: effective.get(topic.id) ?? 0,
        hours: topicHours,
        reason: `Its prerequisite ${topicById.get(blocker)?.name ?? "topic"} does not fit in your time.`,
      });
      continue;
    }
    if (used + topicHours <= budgetHours + 1e-9) {
      keptIds.add(topic.id);
      used += topicHours;
    } else {
      skippedIds.add(topic.id);
      skipped.push({
        topicId: topic.id,
        priorityScore: effective.get(topic.id) ?? 0,
        hours: topicHours,
        reason: `Needs ${topicHours}h but only ${round2(Math.max(0, budgetHours - used))}h of your ${budgetHours}h study budget is left; lower priority than the topics kept.`,
      });
    }
  }
  for (const topic of topoOrder) if (keptIds.has(topic.id)) ordered.push(topic);

  /* 8. Schedule ------------------------------------------------------------- */
  const items: PlannedItem[] = [];
  const base = (topic: EngineTopic) => ({
    topicId: topic.id,
    priorityScore: effective.get(topic.id) ?? 0,
    reasons: reasons.get(topic.id) ?? [],
    requiredDepth: topic.requiredDepth,
    currentDepth: (input.assessedDepth[topic.id] ?? 0) as DepthLevel,
    coversTopicIds: [],
  });

  // Learn capacity per day; self-check days give up some of it.
  const capacity: number[] = Array.from({ length: totalDays }, (_, day) => {
    const isCheckDay = (day + 1) % config.selfCheckEveryDays === 0;
    return Math.max(0, learnPerDay - (isCheckDay ? config.selfCheckHours : 0));
  });

  let day = 0;
  const learnedOnDay = new Map<number, string[]>();
  for (const topic of ordered) {
    let left = hours.get(topic.id) ?? 0;
    const chunks: { day: number; hours: number }[] = [];
    while (left > 1e-9 && day < totalDays) {
      const free = capacity[day] ?? 0;
      if (free < config.minChunkHours) {
        day += 1;
        continue;
      }
      // Round DOWN to a quarter hour so a chunk never exceeds the day's free time.
      const take = Math.min(left, Math.floor(free * 4) / 4);
      if (take <= 0) {
        day += 1;
        continue;
      }
      chunks.push({ day, hours: round2(take) });
      capacity[day] = round2(free - take);
      left = round2(left - take);
      if ((capacity[day] ?? 0) < config.minChunkHours) day += 1;
    }
    chunks.forEach((chunk, index) => {
      items.push({
        ...base(topic),
        kind: "LEARN",
        scheduledDate: addDays(input.today, chunk.day),
        hours: chunk.hours,
        part: index + 1,
        parts: chunks.length,
      });
    });
    const last = chunks.at(-1);
    if (last) {
      const list = learnedOnDay.get(last.day) ?? [];
      list.push(topic.id);
      learnedOnDay.set(last.day, list);
      const revisionDay = last.day + config.revisionDelayDays;
      if (revisionDay < totalDays) {
        items.push({
          ...base(topic),
          kind: "REVISION",
          scheduledDate: addDays(input.today, revisionDay),
          hours: config.revisionHours,
          reasons: [`Spaced revision ${config.revisionDelayDays} days after you finish the topic.`],
          part: 1,
          parts: 1,
        });
      }
    }
  }

  // Weekly self-check covering the topics finished that week.
  for (
    let checkDay = config.selfCheckEveryDays - 1;
    checkDay < totalDays;
    checkDay += config.selfCheckEveryDays
  ) {
    const covered: string[] = [];
    for (let d = checkDay - config.selfCheckEveryDays + 1; d <= checkDay; d += 1) {
      covered.push(...(learnedOnDay.get(d) ?? []));
    }
    if (covered.length === 0) continue;
    items.push({
      topicId: null,
      kind: "SELF_CHECK",
      scheduledDate: addDays(input.today, checkDay),
      hours: config.selfCheckHours,
      priorityScore: 0,
      reasons: ["Weekly self-check on the topics you finished this week."],
      requiredDepth: 0,
      currentDepth: 0,
      part: 1,
      parts: 1,
      coversTopicIds: covered,
    });
  }

  const kindOrder: Record<ItemKind, number> = { REVISION: 0, LEARN: 1, SELF_CHECK: 2 };
  items.sort(
    (a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) || kindOrder[a.kind] - kindOrder[b.kind],
  );

  skipped.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    items,
    skipped,
    totalDays,
    budgetHours,
    plannedHours: round2(
      items.filter((item) => item.kind === "LEARN").reduce((sum, item) => sum + item.hours, 0),
    ),
    alreadyMet,
  };
}

/** Pending items scheduled before today: the "missed day" re-plan trigger. */
export function findMissedItems<T extends { scheduledDate: string; status: string }>(
  items: T[],
  today: LocalDateString,
): T[] {
  return items.filter((item) => item.status === "PENDING" && item.scheduledDate < today);
}

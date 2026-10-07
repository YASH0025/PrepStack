/**
 * Last-24-hours revision sheet generator (PURE, rules-based, no AI).
 *
 * Builds a one-page summary for one upcoming round from data the app already
 * has. Every checkable item has a stable key, so check state survives
 * regeneration as the underlying data changes.
 */
import { type RoundType } from "@/lib/domain";

export type Mode = "VIDEO" | "PHONE" | "ONSITE";

/** Topic categories relevant to each round type. `null` = every technical category. */
export const ROUND_TOPIC_CATEGORIES: Record<RoundType, readonly string[] | null> = {
  TECHNICAL: null,
  CODING: null,
  TAKE_HOME: null,
  OTHER: null,
  SYSTEM_DESIGN: ["Engineering", "Databases", "Node.js"],
  MANAGERIAL: ["Engineering"],
  BEHAVIORAL: [],
  HR: [],
  RECRUITER_SCREEN: [],
};

export const PEOPLE_ROUNDS: readonly RoundType[] = [
  "BEHAVIORAL",
  "HR",
  "MANAGERIAL",
  "RECRUITER_SCREEN",
];

export const MAX_WEAK_TOPICS = 5;
export const MAX_QUESTIONS = 10;

export interface SheetTopic {
  id: string;
  slug: string;
  name: string;
  category: string;
  keyConcepts: string[];
  /** Required depth (1–4) for the user's experience band. */
  requiredDepth: number;
}

export interface RevisionSheetInput {
  round: {
    id: string;
    type: RoundType;
    title: string | null;
    startUtc: string;
    endUtc: string;
    mode: Mode;
    meetingLink: string | null;
    location: string | null;
  };
  company: string;
  jobTitle: string;
  /** Topics in the user's target role. */
  topics: SheetTopic[];
  /** Latest diagnostic depth per topic (0–4); missing = not assessed. */
  assessedDepth: Record<string, number>;
  flagged: { topicId: string; status: "DIFFICULT" | "NEEDS_REVISION" }[];
  /** Roadmap topics planned before this round but not done yet. */
  pendingBeforeRound: string[];
  /** Missed/partial answers per topic from the user's debriefs. */
  debriefWeakness: Record<string, { missed: number; partial: number }>;
  savedQuestions: { id: string; topicId: string; prompt: string }[];
  /** Review cards the user struggles with (box 1–2, not mastered). */
  difficultCards: { id: string; topicId: string | null; prompt: string }[];
  community: {
    topics: { topicId: string; count: number }[];
    sampleSize: number;
    from: string;
    to: string;
  } | null;
  minCommunitySample: number;
  earlierQuestions: {
    id: string;
    text: string;
    roundLabel: string;
    date: string;
    rating: string;
  }[];
  stories: { id: string; title: string; competencies: string[] }[];
  hrQuestions: { id: string; text: string; guidance: string }[];
  interviewerQuestions: { curated: string[]; own: string[] };
  checkedKeys: string[];
}

export interface CheckItem {
  key: string;
  checked: boolean;
}

export interface WeakTopicItem extends CheckItem {
  topicId: string;
  slug: string;
  name: string;
  keyPoints: string[];
  reasons: string[];
  score: number;
}

export interface QuestionItem extends CheckItem {
  text: string;
  source: "SAVED" | "DIFFICULT";
}

export interface RevisionSheet {
  roundId: string;
  isPeopleRound: boolean;
  weakTopics: WeakTopicItem[];
  questions: QuestionItem[];
  community:
    | {
        status: "SHOWN";
        sampleSize: number;
        from: string;
        to: string;
        topics: (CheckItem & { name: string; slug: string; count: number })[];
      }
    | { status: "NOT_ENOUGH_DATA"; sampleSize: number }
    | { status: "NONE" };
  earlierQuestions: (CheckItem & {
    text: string;
    roundLabel: string;
    date: string;
    rating: string;
  })[];
  stories: (CheckItem & { id: string; title: string; competencies: string[] })[];
  hrQuestions: (CheckItem & { text: string; guidance: string })[];
  interviewerQuestions: (CheckItem & { text: string; own: boolean })[];
  logistics: (CheckItem & { label: string })[];
  progress: { done: number; total: number };
}

const LOGISTICS: Record<Mode, { key: string; label: string }[]> = {
  VIDEO: [
    { key: "logistics:link", label: "Meeting link opens and you can join" },
    { key: "logistics:av", label: "Camera, microphone and headphones tested" },
    { key: "logistics:network", label: "Stable internet, with a phone hotspot as backup" },
    { key: "logistics:environment", label: "Quiet room, good light, notifications off" },
    { key: "logistics:editor", label: "Code editor or whiteboard tool ready" },
    { key: "logistics:documents", label: "Resume and job description open" },
  ],
  PHONE: [
    { key: "logistics:phone", label: "Phone charged, ringer on, good signal" },
    { key: "logistics:environment", label: "Quiet place, headphones ready" },
    { key: "logistics:documents", label: "Resume, job description and notes in front of you" },
  ],
  ONSITE: [
    { key: "logistics:route", label: "Route, travel time and building entry checked" },
    { key: "logistics:id", label: "Government ID and printed resume packed" },
    { key: "logistics:arrive", label: "Plan to arrive 15 minutes early" },
    { key: "logistics:documents", label: "Job description and notes reviewed" },
  ],
};

/** Weakness score per topic, with human-readable reasons. */
export function scoreWeakness(
  input: RevisionSheetInput,
  topic: SheetTopic,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const assessed = input.assessedDepth[topic.id];
  if (assessed !== undefined && assessed < topic.requiredDepth) {
    const gap = topic.requiredDepth - assessed;
    score += gap * 2;
    reasons.push(`Diagnostic: ${gap} depth level${gap === 1 ? "" : "s"} below what is expected`);
  }
  const debrief = input.debriefWeakness[topic.id];
  if (debrief?.missed) {
    score += debrief.missed * 3;
    reasons.push(
      `Missed in ${debrief.missed} earlier interview question${debrief.missed === 1 ? "" : "s"}`,
    );
  }
  if (debrief?.partial) {
    score += debrief.partial * 1.5;
    reasons.push(
      `Partly answered ${debrief.partial} time${debrief.partial === 1 ? "" : "s"} before`,
    );
  }
  const flag = input.flagged.find((entry) => entry.topicId === topic.id);
  if (flag) {
    score += flag.status === "DIFFICULT" ? 2 : 1;
    reasons.push(
      flag.status === "DIFFICULT" ? "You marked it difficult" : "You marked it for revision",
    );
  }
  if (input.pendingBeforeRound.includes(topic.id)) {
    score += 1;
    reasons.push("Planned before this round, not done yet");
  }
  return { score, reasons };
}

export function buildRevisionSheet(input: RevisionSheetInput): RevisionSheet {
  const checked = new Set(input.checkedKeys);
  const item = (key: string): CheckItem => ({ key, checked: checked.has(key) });
  const allowed = ROUND_TOPIC_CATEGORIES[input.round.type];
  const isPeopleRound = PEOPLE_ROUNDS.includes(input.round.type);
  const relevant = input.topics.filter(
    (topic) => allowed === null || allowed.includes(topic.category),
  );

  // 2. Weak topics.
  const weakTopics: WeakTopicItem[] = relevant
    .map((topic) => ({ topic, ...scoreWeakness(input, topic) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.topic.name.localeCompare(b.topic.name))
    .slice(0, MAX_WEAK_TOPICS)
    .map(({ topic, score, reasons }) => ({
      ...item(`topic:${topic.id}`),
      topicId: topic.id,
      slug: topic.slug,
      name: topic.name,
      keyPoints: topic.keyConcepts.slice(0, 4),
      reasons,
      score,
    }));
  const weakIds = new Set(weakTopics.map((topic) => topic.topicId));

  // 3. Saved and difficult questions on those topics.
  const questions: QuestionItem[] = [];
  const seenText = new Set<string>();
  for (const question of input.savedQuestions) {
    if (!weakIds.has(question.topicId) || seenText.has(question.prompt)) continue;
    seenText.add(question.prompt);
    questions.push({ ...item(`question:${question.id}`), text: question.prompt, source: "SAVED" });
  }
  for (const card of input.difficultCards) {
    if (!card.topicId || !weakIds.has(card.topicId) || seenText.has(card.prompt)) continue;
    seenText.add(card.prompt);
    questions.push({ ...item(`card:${card.id}`), text: card.prompt, source: "DIFFICULT" });
  }

  // 4. Community topics (only with enough reports).
  const topicById = new Map(input.topics.map((topic) => [topic.id, topic]));
  let community: RevisionSheet["community"] = { status: "NONE" };
  if (input.community && input.community.sampleSize > 0) {
    community =
      input.community.sampleSize < input.minCommunitySample
        ? { status: "NOT_ENOUGH_DATA", sampleSize: input.community.sampleSize }
        : {
            status: "SHOWN",
            sampleSize: input.community.sampleSize,
            from: input.community.from,
            to: input.community.to,
            topics: input.community.topics
              .filter((entry) => topicById.has(entry.topicId))
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
              .map((entry) => {
                const topic = topicById.get(entry.topicId) as SheetTopic;
                return {
                  ...item(`community:${entry.topicId}`),
                  name: topic.name,
                  slug: topic.slug,
                  count: entry.count,
                };
              }),
          };
  }

  // 5. Questions from the user's own earlier rounds at this company.
  const earlierQuestions = input.earlierQuestions.slice(0, 10).map((question) => ({
    ...item(`earlier:${question.id}`),
    text: question.text,
    roundLabel: question.roundLabel,
    date: question.date,
    rating: question.rating,
  }));

  // 6. Stories and HR questions for people rounds.
  const stories = isPeopleRound
    ? input.stories.map((story) => ({ ...item(`story:${story.id}`), ...story }))
    : [];
  const hrQuestions =
    input.round.type === "HR" || input.round.type === "RECRUITER_SCREEN"
      ? input.hrQuestions.slice(0, 8).map((question) => ({
          ...item(`hr:${question.id}`),
          text: question.text,
          guidance: question.guidance,
        }))
      : [];

  // 7. Questions to ask the interviewer.
  const interviewerQuestions = [
    ...input.interviewerQuestions.curated.slice(0, 4).map((text) => ({ text, own: false })),
    ...input.interviewerQuestions.own.map((text) => ({ text, own: true })),
  ].map((entry) => ({ ...item(`ask:${entry.text}`), ...entry }));

  // 8. Logistics.
  const logistics = LOGISTICS[input.round.mode].map((entry) => ({
    ...item(entry.key),
    label: entry.label,
  }));

  const limitedQuestions = questions.slice(0, MAX_QUESTIONS);
  const checkables: CheckItem[] = [
    ...weakTopics,
    ...limitedQuestions,
    ...(community.status === "SHOWN" ? community.topics : []),
    ...earlierQuestions,
    ...stories,
    ...hrQuestions,
    ...logistics,
  ];
  return {
    roundId: input.round.id,
    isPeopleRound,
    weakTopics,
    questions: limitedQuestions,
    community,
    earlierQuestions,
    stories,
    hrQuestions,
    interviewerQuestions,
    logistics,
    progress: {
      done: checkables.filter((entry) => entry.checked).length,
      total: checkables.length,
    },
  };
}

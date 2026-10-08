import {
  CODING_TOPICS,
  type CodingSkill,
  type CodingTopic,
  DIFFICULTIES,
  type Difficulty,
  type ProblemProgress,
  type ProblemSummary,
} from "../schemas";

export type ProblemStatus = "SOLVED" | "ATTEMPTED" | "TODO";

export function statusOf(progress: ProblemProgress | undefined): ProblemStatus {
  return progress?.status ?? "TODO";
}

export interface TopicStat {
  topic: CodingTopic;
  total: number;
  solved: number;
  /** Attempted but not solved yet. */
  stuck: number;
  /** Shown as "Needs work". */
  weak: boolean;
}

/**
 * A topic needs work when the user is stuck on at least two of its problems,
 * or solved fewer than half of the ones they tried (after three tries).
 */
export function isWeak(stat: Pick<TopicStat, "solved" | "stuck">): boolean {
  const tried = stat.solved + stat.stuck;
  return stat.stuck >= 2 || (tried >= 3 && stat.solved / tried < 0.5);
}

export function topicStats(
  problems: ProblemSummary[],
  progress: Map<string, ProblemProgress>,
): TopicStat[] {
  return CODING_TOPICS.map((topic) => {
    const inTopic = problems.filter((problem) => problem.topics.includes(topic));
    const solved = inTopic.filter((p) => statusOf(progress.get(p.slug)) === "SOLVED").length;
    const stuck = inTopic.filter((p) => statusOf(progress.get(p.slug)) === "ATTEMPTED").length;
    return { topic, total: inTopic.length, solved, stuck, weak: isWeak({ solved, stuck }) };
  }).filter((stat) => stat.total > 0);
}

export function difficultyStats(
  problems: ProblemSummary[],
  progress: Map<string, ProblemProgress>,
): Record<Difficulty, { total: number; solved: number }> {
  const out = {} as Record<Difficulty, { total: number; solved: number }>;
  for (const difficulty of DIFFICULTIES) {
    const list = problems.filter((problem) => problem.difficulty === difficulty);
    out[difficulty] = {
      total: list.length,
      solved: list.filter((p) => statusOf(progress.get(p.slug)) === "SOLVED").length,
    };
  }
  return out;
}

export const DEFAULT_SET: Record<Difficulty, number> = { EASY: 3, MEDIUM: 2, HARD: 1 };

/**
 * Today's practice set: unsolved problems, problems the user is stuck on
 * first, then in catalogue order, `counts` per difficulty. When a difficulty
 * runs out, nothing replaces it (the set just gets shorter).
 */
export function practiceSet(
  problems: ProblemSummary[],
  progress: Map<string, ProblemProgress>,
  options: { skill?: CodingSkill; topic?: CodingTopic; counts?: Record<Difficulty, number> } = {},
): ProblemSummary[] {
  const counts = options.counts ?? DEFAULT_SET;
  const pool = problems.filter(
    (problem) =>
      (!options.skill || problem.skill === options.skill) &&
      (!options.topic || problem.topics.includes(options.topic)) &&
      statusOf(progress.get(problem.slug)) !== "SOLVED",
  );
  const rank = (problem: ProblemSummary) =>
    statusOf(progress.get(problem.slug)) === "ATTEMPTED" ? 0 : 1;
  return DIFFICULTIES.flatMap((difficulty) =>
    pool
      .filter((problem) => problem.difficulty === difficulty)
      .map((problem, index) => ({ problem, index }))
      .sort((a, b) => rank(a.problem) - rank(b.problem) || a.index - b.index)
      .slice(0, counts[difficulty])
      .map(({ problem }) => problem),
  );
}

export interface ProblemFilter {
  topic?: CodingTopic;
  difficulty?: Difficulty;
  status?: ProblemStatus;
  skill?: CodingSkill;
  q?: string;
}

export function filterProblems(
  problems: ProblemSummary[],
  progress: Map<string, ProblemProgress>,
  filter: ProblemFilter,
): ProblemSummary[] {
  const query = filter.q?.trim().toLowerCase();
  return problems.filter(
    (problem) =>
      (!filter.topic || problem.topics.includes(filter.topic)) &&
      (!filter.difficulty || problem.difficulty === filter.difficulty) &&
      (!filter.skill || problem.skill === filter.skill) &&
      (!filter.status || statusOf(progress.get(problem.slug)) === filter.status) &&
      (!query || problem.title.toLowerCase().includes(query)),
  );
}

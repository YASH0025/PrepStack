/**
 * Story-bank logic (PURE): competency coverage and matching stories to
 * behavioral questions.
 */

interface CoverageStory {
  id: string;
  status: "DRAFT" | "READY" | "PRACTICED";
  competencies: string[];
}

export type CoverageLevel = "COVERED" | "DRAFT_ONLY" | "MISSING";

export interface CompetencyCoverage {
  slug: string;
  name: string;
  level: CoverageLevel;
  /** Ready or practiced stories. */
  ready: number;
  drafts: number;
}

/** For each competency: whether a Ready/Practiced story covers it. */
export function competencyCoverage(
  competencies: { slug: string; name: string }[],
  stories: CoverageStory[],
): CompetencyCoverage[] {
  return competencies.map(({ slug, name }) => {
    const tagged = stories.filter((story) => story.competencies.includes(slug));
    const ready = tagged.filter((story) => story.status !== "DRAFT").length;
    const drafts = tagged.length - ready;
    return {
      slug,
      name,
      ready,
      drafts,
      level: ready > 0 ? "COVERED" : drafts > 0 ? "DRAFT_ONLY" : "MISSING",
    };
  });
}

export function coverageSummary(coverage: CompetencyCoverage[]) {
  const covered = coverage.filter((entry) => entry.level === "COVERED").length;
  return {
    covered,
    total: coverage.length,
    percent: coverage.length ? Math.round((covered / coverage.length) * 100) : 0,
  };
}

interface MatchStory extends CoverageStory {
  title: string;
  usage: { usedAt: string }[];
}

/**
 * Stories that fit a question's competencies, best first: more shared
 * competencies, then ready before draft, then less-used stories (so you do
 * not tell the same story in every round), then title.
 */
export function matchStories<T extends MatchStory>(
  questionCompetencies: string[],
  stories: T[],
  limit = 3,
): T[] {
  if (questionCompetencies.length === 0) return [];
  const wanted = new Set(questionCompetencies);
  return stories
    .map((story) => ({
      story,
      shared: story.competencies.filter((slug) => wanted.has(slug)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        Number(a.story.status === "DRAFT") - Number(b.story.status === "DRAFT") ||
        a.story.usage.length - b.story.usage.length ||
        a.story.title.localeCompare(b.story.title),
    )
    .slice(0, limit)
    .map((entry) => entry.story);
}

/**
 * Stories to suggest before a behavioral/HR round: one strong story per
 * competency, covering as many competencies as possible.
 */
export function suggestStoriesForRound<T extends MatchStory>(stories: T[], limit = 4): T[] {
  const usable = stories.filter((story) => story.status !== "DRAFT");
  const picked: T[] = [];
  const covered = new Set<string>();
  const ranked = [...usable].sort(
    (a, b) =>
      b.competencies.length - a.competencies.length ||
      a.usage.length - b.usage.length ||
      a.title.localeCompare(b.title),
  );
  for (const story of ranked) {
    if (picked.length >= limit) break;
    if (story.competencies.some((slug) => !covered.has(slug))) {
      picked.push(story);
      story.competencies.forEach((slug) => covered.add(slug));
    }
  }
  return picked;
}

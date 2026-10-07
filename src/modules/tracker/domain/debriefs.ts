/**
 * Debrief-derived signals (PURE): weakness per topic for the roadmap and the
 * revision sheet, and questions asked in earlier rounds at a company.
 */

interface RatedQuestion {
  id: string;
  text: string;
  topicId: string | null;
  selfRating: "NAILED" | "PARTIAL" | "MISSED";
}

export interface TopicWeakness {
  missed: number;
  partial: number;
}

/** Missed and partial answers per skill-graph topic, across all debriefs. */
export function weaknessByTopic(
  debriefs: { questions: RatedQuestion[] }[],
): Record<string, TopicWeakness> {
  const result: Record<string, TopicWeakness> = {};
  for (const debrief of debriefs) {
    for (const question of debrief.questions) {
      if (!question.topicId || question.selfRating === "NAILED") continue;
      const entry = (result[question.topicId] ??= { missed: 0, partial: 0 });
      if (question.selfRating === "MISSED") entry.missed += 1;
      else entry.partial += 1;
    }
  }
  return result;
}

export interface EarlierQuestion {
  id: string;
  text: string;
  roundLabel: string;
  date: string;
  rating: string;
}

/**
 * Questions from the user's own debriefs of OTHER rounds at the same company
 * (matched by normalised company key), most recent round first.
 */
export function earlierQuestionsAtCompany(
  current: { roundId: string; companyKey: string },
  rounds: { id: string; companyKey: string; label: string; date: string; startUtc: string }[],
  debriefs: { roundId: string; questions: RatedQuestion[] }[],
  limit = 10,
): EarlierQuestion[] {
  const byRound = new Map(debriefs.map((debrief) => [debrief.roundId, debrief]));
  return rounds
    .filter((round) => round.id !== current.roundId && round.companyKey === current.companyKey)
    .sort((a, b) => b.startUtc.localeCompare(a.startUtc))
    .flatMap((round) =>
      (byRound.get(round.id)?.questions ?? []).map((question) => ({
        id: question.id,
        text: question.text,
        roundLabel: round.label,
        date: round.date,
        rating: question.selfRating,
      })),
    )
    .slice(0, limit);
}

/** Questions flagged "need a story" that are not yet linked to one. */
export function questionsNeedingStories<
  T extends { needsStory: boolean; linkedStoryId: string | null },
>(debriefs: { roundId: string; questions: T[] }[]): (T & { roundId: string })[] {
  return debriefs.flatMap((debrief) =>
    debrief.questions
      .filter((question) => question.needsStory && !question.linkedStoryId)
      .map((question) => ({ ...question, roundId: debrief.roundId })),
  );
}

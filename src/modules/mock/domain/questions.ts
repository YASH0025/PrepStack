/**
 * Question picking for a mock interview (PURE). Open questions from the
 * topics the interviewee chose, shuffled deterministically per session so a
 * refresh shows the same set.
 */
export interface PickableQuestion {
  id: string;
  topicId: string;
}

export const QUESTIONS_PER_INTERVIEWEE = 4;

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable order for a seed: questions sorted by hash(seed + id). */
export function seededOrder<T extends PickableQuestion>(questions: T[], seed: string): T[] {
  return [...questions].sort(
    (a, b) => hash(seed + a.id) - hash(seed + b.id) || a.id.localeCompare(b.id),
  );
}

/**
 * Picks up to `count` questions, spreading across the chosen topics (round
 * robin in the order given) before taking a second from any topic.
 */
export function pickQuestions<T extends PickableQuestion>(
  questions: T[],
  topicIds: string[],
  seed: string,
  count = QUESTIONS_PER_INTERVIEWEE,
): T[] {
  const byTopic = topicIds.map((topicId) =>
    seededOrder(
      questions.filter((question) => question.topicId === topicId),
      `${seed}:${topicId}`,
    ),
  );
  const picked: T[] = [];
  for (let round = 0; picked.length < count; round += 1) {
    let added = false;
    for (const list of byTopic) {
      const question = list[round];
      if (question && picked.length < count) {
        picked.push(question);
        added = true;
      }
    }
    if (!added) break;
  }
  return picked;
}

/** Replaces one question with the next unused one from the same topic (or any chosen topic). */
export function swapQuestion<T extends PickableQuestion>(
  questions: T[],
  current: string[],
  replaceId: string,
  topicIds: string[],
  seed: string,
): string[] {
  const index = current.indexOf(replaceId);
  if (index === -1) return current;
  const replaced = questions.find((question) => question.id === replaceId);
  const unused = (topicId?: string) =>
    seededOrder(
      questions.filter(
        (question) =>
          !current.includes(question.id) &&
          topicIds.includes(question.topicId) &&
          (topicId === undefined || question.topicId === topicId),
      ),
      `${seed}:swap:${current.length}:${replaceId}`,
    )[0];
  const next = unused(replaced?.topicId) ?? unused();
  if (!next) return current;
  const updated = [...current];
  updated[index] = next.id;
  return updated;
}

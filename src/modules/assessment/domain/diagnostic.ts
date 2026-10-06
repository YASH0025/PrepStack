/**
 * Diagnostic logic (PURE). Selects questions, grades answers and estimates a
 * demonstrated depth per topic. The estimate deliberately needs evidence:
 * a topic is only removed from the roadmap when answers show the depth.
 */
import { DEPTH_LEVEL, type DepthLevel } from "@/lib/domain";
import { type Question, type Topic } from "@/modules/content/schemas";

import { type AttemptAnswer, type SelfGrade, type TopicDepthResult } from "../schemas";

export const DEFAULT_DIAGNOSTIC_LIMIT = 25;

/**
 * Picks diagnostic questions for topics in the target role, most important
 * topics first (role importance, then core importance), up to `limit`.
 * At most two questions per topic so the diagnostic stays broad.
 */
export function selectDiagnosticQuestions(
  topics: Topic[],
  questions: Question[],
  roleId: string,
  limit = DEFAULT_DIAGNOSTIC_LIMIT,
): Question[] {
  const roleImportance = (topic: Topic) =>
    topic.roleImportance.find((entry) => entry.roleId === roleId)?.importance ?? 0;
  const ranked = topics
    .filter((topic) => roleImportance(topic) > 0)
    .sort(
      (a, b) =>
        roleImportance(b) - roleImportance(a) ||
        b.coreImportance - a.coreImportance ||
        a.slug.localeCompare(b.slug),
    );

  const selected: Question[] = [];
  for (const topic of ranked) {
    const topicQuestions = questions
      .filter((question) => question.topicId === topic.id && question.diagnostic)
      .sort((a, b) => DEPTH_LEVEL[a.depth] - DEPTH_LEVEL[b.depth] || a.id.localeCompare(b.id))
      .slice(0, 2);
    for (const question of topicQuestions) {
      if (selected.length >= limit) return selected;
      selected.push(question);
    }
  }
  return selected;
}

export interface RawAnswer {
  questionId: string;
  response: string;
  selfGrade?: SelfGrade | null;
}

/**
 * Grades answers against the question bank. Unknown question ids are ignored.
 * MCQ: correct when the chosen index matches. Open: correct only when the user
 * judged their answer as matching the model answer ("YES").
 */
export function gradeAnswers(questions: Question[], raw: RawAnswer[]): AttemptAnswer[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  const graded: AttemptAnswer[] = [];
  for (const answer of raw) {
    const question = byId.get(answer.questionId);
    if (!question || seen.has(answer.questionId)) continue;
    seen.add(answer.questionId);
    const response = answer.response.trim();
    if (question.format === "MCQ") {
      const chosen = response === "" ? NaN : Number(response);
      graded.push({
        questionId: question.id,
        response,
        correct: Number.isInteger(chosen) && chosen === question.correctIndex,
        selfGrade: null,
      });
    } else {
      const selfGrade = response === "" ? "NO" : (answer.selfGrade ?? "NO");
      graded.push({ questionId: question.id, response, correct: selfGrade === "YES", selfGrade });
    }
  }
  return graded;
}

/**
 * Estimated depth per answered topic:
 * - every answer correct → the deepest depth answered;
 * - otherwise → the deepest correct depth BELOW the shallowest mistake (0 if none).
 * Topics without answers get no estimate (they are "not assessed", not "zero").
 */
export function estimateTopicDepths(
  questions: Question[],
  answers: AttemptAnswer[],
): TopicDepthResult[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const perTopic = new Map<string, { depth: number; correct: boolean }[]>();
  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) continue;
    const list = perTopic.get(question.topicId) ?? [];
    list.push({ depth: DEPTH_LEVEL[question.depth], correct: answer.correct });
    perTopic.set(question.topicId, list);
  }

  const results: TopicDepthResult[] = [];
  for (const [topicId, list] of perTopic) {
    const wrongDepths = list.filter((entry) => !entry.correct).map((entry) => entry.depth);
    const shallowestMistake = wrongDepths.length ? Math.min(...wrongDepths) : Infinity;
    const correctBelow = list
      .filter((entry) => entry.correct && entry.depth < shallowestMistake)
      .map((entry) => entry.depth);
    const estimatedDepth = (correctBelow.length ? Math.max(...correctBelow) : 0) as DepthLevel;
    results.push({ topicId, estimatedDepth });
  }
  return results.sort((a, b) => a.topicId.localeCompare(b.topicId));
}

/** Model answer to show for self-grading an open question. */
export function modelAnswerFor(question: Question): string | null {
  if (question.format === "MCQ") return null;
  return (
    question.answers.find((answer) => answer.level === "MID")?.answer ??
    question.answers[0]?.answer ??
    (question.explanation || null)
  );
}

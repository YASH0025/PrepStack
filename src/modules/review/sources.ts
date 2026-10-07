import "server-only";

import { type Level } from "@/lib/domain";
import { type Question } from "@/modules/content/schemas";
import { type Story } from "@/modules/story-bank/schemas";

import { type NewCardFromSource } from "./service";

/*
 * Builders that turn content from other modules into review cards. Card text
 * is a snapshot, so later content edits never change what the user studied.
 */

/** A topic question → card. Open questions use the answer for the user's level. */
export function cardFromQuestion(
  question: Question,
  level: Level,
  sourceType: "SAVED_QUESTION" | "SELF_CHECK",
): NewCardFromSource {
  if (question.format === "MCQ") {
    const options = question.options.map((option, index) => `${index + 1}. ${option}`).join("\n");
    const correct =
      question.correctIndex !== null ? question.options[question.correctIndex] : undefined;
    return {
      sourceType,
      sourceId: question.id,
      topicId: question.topicId,
      prompt: `${question.prompt}\n\n${options}`,
      answer: [correct ? `**${correct}**` : "", question.explanation].filter(Boolean).join("\n\n"),
    };
  }
  const answer =
    question.answers.find((entry) => entry.level === level) ??
    question.answers.find((entry) => entry.level === "MID") ??
    question.answers[0];
  return {
    sourceType,
    sourceId: question.id,
    topicId: question.topicId,
    prompt: question.prompt,
    answer: answer?.answer ?? question.explanation,
  };
}

/** A story → card: prompt names the competencies, answer is the STAR outline. */
export function cardFromStory(
  story: Story,
  competencyNames: Map<string, string>,
): NewCardFromSource {
  const competencies = story.competencies.map((slug) => competencyNames.get(slug) ?? slug);
  const prompt = competencies.length
    ? `Tell your story that shows ${competencies.join(", ")}.\n\nHint: “${story.title}”`
    : `Tell your story “${story.title}” in STAR form.`;
  const answer = [
    story.situation && `**Situation:** ${story.situation}`,
    story.task && `**Task:** ${story.task}`,
    story.action && `**Action:** ${story.action}`,
    story.result && `**Result:** ${story.result}`,
    story.impact && `**Impact:** ${story.impact}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { sourceType: "STORY", sourceId: story.id, topicId: null, prompt, answer };
}

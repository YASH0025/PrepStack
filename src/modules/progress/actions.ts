"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";

import { TopicStatusSchema } from "./schemas";
import { progressServiceFor } from "./service";

const IdSchema = z.uuid();

/** Sets a topic's status. Completing a topic also completes its roadmap learn items. */
export async function setTopicStatusAction(topicId: string, status: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = IdSchema.safeParse(topicId);
  const parsedStatus = TopicStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return fail("Invalid topic status");
  if (!(await getContentService().topic(parsedId.data))) return fail("Topic not found");

  await progressServiceFor(user.id).setStatus(parsedId.data, parsedStatus.data);
  if (parsedStatus.data === "COMPLETED") {
    await roadmapServiceFor(user.id).completeTopic(parsedId.data);
  }
  revalidatePath("/", "layout");
  return ok();
}

export async function toggleSavedQuestionAction(
  questionId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const user = await requireUser();
  const parsed = IdSchema.safeParse(questionId);
  if (!parsed.success) return fail("Invalid question");
  if (!(await getContentService().question(parsed.data))) return fail("Question not found");
  const saved = await progressServiceFor(user.id).toggleSaved(parsed.data);
  revalidatePath("/practice", "layout");
  return ok({ saved });
}

const NoteSchema = z.object({ questionId: z.uuid(), note: z.string().max(2000) });

export async function updateSavedNoteAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = NoteSchema.safeParse(input);
  if (!parsed.success) return fail("Note is too long");
  const updated = await progressServiceFor(user.id).updateSavedNote(
    parsed.data.questionId,
    parsed.data.note.trim(),
  );
  if (!updated) return fail("Save the question first");
  revalidatePath("/practice/saved");
  return ok();
}

/**
 * Checks a self-check answer on the server, so answer keys (shared with the
 * diagnostic) never sit in the page source.
 */
export async function checkSelfCheckAction(
  questionId: string,
  chosenIndex: number,
): Promise<ActionResult<{ correct: boolean; correctIndex: number; explanation: string }>> {
  await requireUser();
  const parsed = z.object({ questionId: z.uuid(), chosenIndex: z.number().int().min(0).max(5) });
  const input = parsed.safeParse({ questionId, chosenIndex });
  if (!input.success) return fail("Invalid answer");
  const question = await getContentService().question(input.data.questionId);
  if (
    !question ||
    question.format !== "MCQ" ||
    !question.selfCheck ||
    question.correctIndex === null
  ) {
    return fail("Question not found");
  }
  const correct = input.data.chosenIndex === question.correctIndex;
  return ok({ correct, correctIndex: question.correctIndex, explanation: question.explanation });
}

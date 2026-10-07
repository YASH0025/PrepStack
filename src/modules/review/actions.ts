"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { levelForBand } from "@/lib/domain";
import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { getProfile } from "@/modules/profile/service";
import { storyBankFor } from "@/modules/story-bank/service";

import { type ReviewCard, ManualCardInputSchema, RatingSchema } from "./schemas";
import { ReviewError, reviewServiceFor } from "./service";
import { cardFromQuestion, cardFromStory } from "./sources";

const Id = z.uuid();

function refresh() {
  revalidatePath("/practice/review");
  revalidatePath("/today");
}

/** "Add to review" on a topic question. Idempotent. */
export async function addQuestionToReviewAction(
  questionId: string,
): Promise<ActionResult<{ created: boolean }>> {
  const user = await requireUser();
  const parsed = Id.safeParse(questionId);
  if (!parsed.success) return fail("Invalid question");
  const [question, profile] = await Promise.all([
    getContentService().question(parsed.data),
    getProfile(user.id),
  ]);
  if (!question) return fail("Question not found");
  const level = levelForBand(profile?.experienceBand ?? "2-4");
  const { created } = await reviewServiceFor(user.id).addFromSource(
    cardFromQuestion(question, level, "SAVED_QUESTION"),
  );
  refresh();
  return ok({ created });
}

/** "Add to review" on a story. Idempotent. */
export async function addStoryToReviewAction(
  storyId: string,
): Promise<ActionResult<{ created: boolean }>> {
  const user = await requireUser();
  const parsed = Id.safeParse(storyId);
  if (!parsed.success) return fail("Invalid story");
  const [story, competencies] = await Promise.all([
    storyBankFor(user.id).get(parsed.data),
    getContentService().competencies(),
  ]);
  if (!story) return fail("Story not found");
  if (!story.situation && !story.action && !story.result) {
    return fail("Write the story first, then add it to review");
  }
  const names = new Map(competencies.map((item) => [item.slug, item.name]));
  const { created } = await reviewServiceFor(user.id).addFromSource(cardFromStory(story, names));
  refresh();
  return ok({ created });
}

export async function addManualCardAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ManualCardInputSchema.safeParse(input);
  if (!parsed.success)
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  await reviewServiceFor(user.id).addManual(parsed.data);
  refresh();
  return ok();
}

export async function reviewCardAction(
  cardId: string,
  rating: unknown,
): Promise<ActionResult<Pick<ReviewCard, "box" | "dueDate" | "mastered">>> {
  const user = await requireUser();
  const id = Id.safeParse(cardId);
  const parsedRating = RatingSchema.safeParse(rating);
  if (!id.success || !parsedRating.success) return fail("Invalid review");
  try {
    const card = await reviewServiceFor(user.id).review(id.data, parsedRating.data);
    return ok({ box: card.box, dueDate: card.dueDate, mastered: card.mastered });
  } catch (error) {
    if (error instanceof ReviewError) return fail(error.message);
    throw error;
  }
}

/** Called when a session ends, so lists and counts refresh once instead of per card. */
export async function finishReviewSessionAction(): Promise<void> {
  await requireUser();
  refresh();
}

export async function resetCardDueAction(cardId: string): Promise<ActionResult> {
  const user = await requireUser();
  const id = Id.safeParse(cardId);
  if (!id.success) return fail("Invalid card");
  await reviewServiceFor(user.id).resetDue(id.data);
  refresh();
  return ok();
}

export async function deleteCardAction(cardId: string): Promise<ActionResult> {
  const user = await requireUser();
  const id = Id.safeParse(cardId);
  if (!id.success) return fail("Invalid card");
  await reviewServiceFor(user.id).delete(id.data);
  refresh();
  return ok();
}

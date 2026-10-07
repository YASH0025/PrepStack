"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";

import { StoryInputSchema, StoryStatusSchema } from "./schemas";
import { StoryError, storyBankFor } from "./service";

const Id = z.uuid();

function handle(error: unknown): ActionResult<never> {
  if (error instanceof StoryError) {
    return fail(error.message, error.field ? { [error.field]: [error.message] } : undefined);
  }
  throw error;
}

export async function saveStoryAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = StoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  }
  if (id !== null && !Id.safeParse(id).success) return fail("Invalid story");
  try {
    const service = storyBankFor(user.id);
    const story = id ? await service.update(id, parsed.data) : await service.create(parsed.data);
    revalidatePath("/practice/stories");
    return ok({ id: story.id });
  } catch (error) {
    return handle(error);
  }
}

export async function setStoryStatusAction(id: string, status: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsedId = Id.safeParse(id);
  const parsedStatus = StoryStatusSchema.safeParse(status);
  if (!parsedId.success || !parsedStatus.success) return fail("Invalid request");
  try {
    await storyBankFor(user.id).setStatus(parsedId.data, parsedStatus.data);
    revalidatePath("/practice/stories");
    return ok();
  } catch (error) {
    return handle(error);
  }
}

export async function deleteStoryAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = Id.safeParse(id);
  if (!parsed.success) return fail("Invalid story");
  await storyBankFor(user.id).delete(parsed.data);
  revalidatePath("/practice/stories");
  return ok();
}

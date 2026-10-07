"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";
import { getProfile } from "@/modules/profile/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";

import { NoticePlanInputSchema } from "./schemas";
import { noticePlannerFor } from "./service";

/** The notice timeline is a roadmap constraint: re-plan when it changes. */
async function replanRoadmap(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.onboardingCompletedAt) return;
  const roadmap = roadmapServiceFor(userId);
  if (await roadmap.get()) await roadmap.regenerate(profile);
}

export async function saveNoticePlanAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = NoticePlanInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  }
  await noticePlannerFor(user.id).save(parsed.data);
  await replanRoadmap(user.id);
  revalidatePath("/", "layout");
  return ok();
}

export async function clearNoticePlanAction(): Promise<ActionResult> {
  const user = await requireUser();
  await noticePlannerFor(user.id).clear();
  await replanRoadmap(user.id);
  revalidatePath("/", "layout");
  return ok();
}

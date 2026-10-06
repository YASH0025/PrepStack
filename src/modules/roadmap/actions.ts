"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";

import { roadmapServiceFor } from "./service";
import { afterTopicLearned } from "./hooks";

/** Re-plans the roadmap from the current situation, keeping completed items. */
export async function regenerateRoadmapAction(): Promise<void> {
  const user = await requireUser();
  const profile = await requireProfile(user.id);
  await roadmapServiceFor(user.id).regenerate(profile);
  revalidatePath("/", "layout");
}

/** Used at the end of onboarding when the user skips the diagnostic. */
export async function buildRoadmapAndContinueAction(): Promise<void> {
  const user = await requireUser();
  const profile = await requireProfile(user.id);
  await roadmapServiceFor(user.id).regenerate(profile);
  revalidatePath("/", "layout");
  redirect("/today?welcome=1");
}

export async function setRoadmapItemStatusAction(itemId: string, done: boolean): Promise<void> {
  const user = await requireUser();
  const id = z.uuid().parse(itemId);
  const { completedTopicId } = await roadmapServiceFor(user.id).setItemStatus(id, done === true);
  if (completedTopicId) await afterTopicLearned(user.id, completedTopicId);
  revalidatePath("/", "layout");
}

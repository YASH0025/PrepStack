"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";

import { SubmitDiagnosticInputSchema } from "./schemas";
import { assessmentServiceFor } from "./service";

/**
 * Grades the diagnostic on the server, stores the attempt (history is kept)
 * and re-plans the roadmap so it reflects what the user already knows.
 */
export async function submitDiagnosticAction(
  input: unknown,
): Promise<ActionResult<{ attemptId: string }>> {
  const user = await requireUser();
  const profile = await requireProfile(user.id);
  const parsed = SubmitDiagnosticInputSchema.safeParse(input);
  if (!parsed.success)
    return fail("Could not submit the diagnostic", fieldErrorsFrom(parsed.error));

  const attempt = await assessmentServiceFor(user.id).submit(profile, parsed.data);
  await roadmapServiceFor(user.id).regenerate(profile);
  revalidatePath("/", "layout");
  return ok({ attemptId: attempt.id });
}

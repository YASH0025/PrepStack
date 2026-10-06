"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";

import { ProfileInputSchema, ReminderSettingsSchema } from "./schemas";
import { ProfileValidationError, profileServiceFor } from "./service";

/**
 * Saves the profile. Called from React Hook Form with a typed object, but the
 * input is validated again here because server actions are public endpoints.
 */
export async function saveProfileAction(
  input: unknown,
  options: { completeOnboarding?: boolean } = {},
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ProfileInputSchema.safeParse(input);
  if (!parsed.success)
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  try {
    await profileServiceFor(user.id).save(parsed.data, {
      completeOnboarding: options.completeOnboarding === true,
    });
  } catch (error) {
    if (error instanceof ProfileValidationError) {
      return fail(error.message, error.field ? { [error.field]: [error.message] } : undefined);
    }
    throw error;
  }
  revalidatePath("/", "layout");
  return ok();
}

export async function saveReminderSettingsAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ReminderSettingsSchema.safeParse(input);
  if (!parsed.success)
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  const saved = await profileServiceFor(user.id).saveReminderSettings(parsed.data);
  if (!saved) return fail("Complete onboarding first");
  revalidatePath("/profile");
  return ok();
}

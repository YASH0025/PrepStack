"use server";

import { redirect } from "next/navigation";

import { type ActionResult, fail, fieldErrorsFrom } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { endSession, getAuthCore, requireUser } from "@/modules/auth/service";

import { type DeleteAccountInput, DeleteAccountInputSchema } from "./schemas";
import { deleteAccount } from "./service";

/** Permanently deletes the signed-in user's account after re-checking the password. */
export async function deleteAccountAction(input: DeleteAccountInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = DeleteAccountInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  if (!rateLimit(`delete-account:${user.id}`, RATE_LIMITS.deleteAccount).ok) {
    return fail("Too many attempts. Try again in a few minutes.");
  }
  if (!(await getAuthCore().verifyCurrentPassword(user.id, parsed.data.password))) {
    return fail("Check the form", { password: ["Password is incorrect"] });
  }
  await deleteAccount(user.id, { reports: parsed.data.reports });
  await endSession();
  redirect("/?deleted=1");
}

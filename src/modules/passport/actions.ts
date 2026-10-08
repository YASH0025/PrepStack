"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/modules/auth/service";

import { PassportNameInputSchema } from "./schemas";
import { passportFor } from "./service";

function refresh() {
  revalidatePath("/profile/passport");
}

export async function createPassportLinkAction(): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  if (!(await rateLimit(`passport:${user.id}`, RATE_LIMITS.export)).ok) {
    return fail("Too many changes. Try again later.");
  }
  await passportFor(user.id).createLink();
  refresh();
  return ok();
}

export async function refreshPassportAction(): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  if (!(await rateLimit(`passport:${user.id}`, RATE_LIMITS.export)).ok) {
    return fail("Too many updates. Try again later.");
  }
  await passportFor(user.id).refresh();
  refresh();
  return ok();
}

export async function disablePassportAction(): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  if (!(await rateLimit(`passport:${user.id}`, RATE_LIMITS.export)).ok) {
    return fail("Too many changes. Try again later.");
  }
  await passportFor(user.id).disable();
  refresh();
  return ok();
}

export async function setPassportNameAction(input: unknown): Promise<ActionResult<undefined>> {
  const user = await requireUser();
  const parsed = PassportNameInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  if (!(await rateLimit(`passport:${user.id}`, RATE_LIMITS.export)).ok) {
    return fail("Too many changes. Try again later.");
  }
  await passportFor(user.id).setDisplayName(parsed.data.displayName);
  refresh();
  return ok();
}

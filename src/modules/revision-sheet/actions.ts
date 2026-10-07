"use server";

import { type ActionResult, fail, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";
import { trackerFor } from "@/modules/tracker/service";

import { ToggleItemInputSchema } from "./schemas";
import { revisionSheetFor } from "./service";

/** Saves the checked state of one revision-sheet item. */
export async function toggleSheetItemAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ToggleItemInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid item");
  // Only the owner's own rounds can have sheet state.
  if (!(await trackerFor(user.id).getRound(parsed.data.roundId))) return fail("Round not found");
  await revisionSheetFor(user.id).setChecked(
    parsed.data.roundId,
    parsed.data.key,
    parsed.data.checked,
  );
  return ok();
}

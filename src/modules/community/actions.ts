"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/modules/auth/service";

import { type FlagInput, FlagInputSchema } from "./schemas";
import { CommunityError, getCommunityService } from "./service";

const Id = z.uuid();

/** "Useful" vote toggle. One vote per user per report. */
export async function toggleVoteAction(
  reportId: string,
): Promise<ActionResult<{ voted: boolean; count: number }>> {
  const user = await requireUser();
  if (!Id.safeParse(reportId).success) return fail("Invalid report");
  if (!(await rateLimit(`vote:${user.id}`, RATE_LIMITS.vote)).ok) {
    return fail("Too many votes. Try again later.");
  }
  try {
    const result = await getCommunityService().toggleVote(reportId, user.id);
    revalidatePath(`/intel/reports/${reportId}`);
    return ok(result);
  } catch (error) {
    if (error instanceof CommunityError) return fail(error.message);
    throw error;
  }
}

/** Reports a report for moderation. */
export async function flagReportAction(
  reportId: string,
  input: FlagInput,
): Promise<ActionResult<{ created: boolean }>> {
  const user = await requireUser();
  if (!Id.safeParse(reportId).success) return fail("Invalid report");
  const parsed = FlagInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  if (!(await rateLimit(`flag:${user.id}`, RATE_LIMITS.flag)).ok) {
    return fail("You have reported a lot today. Try again tomorrow.");
  }
  try {
    const result = await getCommunityService().flag(
      reportId,
      user.id,
      parsed.data.reason,
      parsed.data.note,
    );
    revalidatePath("/admin/moderation");
    return ok(result);
  } catch (error) {
    if (error instanceof CommunityError) return fail(error.message);
    throw error;
  }
}

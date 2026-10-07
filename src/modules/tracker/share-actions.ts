"use server";

import { isDeepStrictEqual } from "node:util";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/modules/auth/service";
import { type Finding } from "@/modules/community/domain/anonymizer";
import { type ReportDraft, ReportDraftSchema } from "@/modules/community/schemas";
import { getCommunityService } from "@/modules/community/service";

import { debriefsFor } from "./debrief-service";
import { ShareError, companyMismatch, scrubEditedDraft, shareContext } from "./share";

const Id = z.uuid();

export interface ShareFindingSummary {
  kind: Finding["kind"];
  count: number;
}

function summarize(findings: Finding[]): ShareFindingSummary[] {
  const counts = new Map<Finding["kind"], number>();
  for (const finding of findings) counts.set(finding.kind, (counts.get(finding.kind) ?? 0) + 1);
  return [...counts].map(([kind, count]) => ({ kind, count }));
}

async function load(roundId: string) {
  const user = await requireUser();
  if (!Id.safeParse(roundId).success) throw new ShareError("Invalid round");
  return { user, context: await shareContext(user, roundId) };
}

/**
 * Scrubs the edited draft and returns the EXACT public version for preview.
 * Nothing is stored.
 */
export async function previewShareAction(
  roundId: string,
  input: ReportDraft,
): Promise<ActionResult<{ draft: ReportDraft; removed: ShareFindingSummary[] }>> {
  const parsed = ReportDraftSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields", fieldErrorsFrom(parsed.error));
  try {
    const { context } = await load(roundId);
    const mismatch = companyMismatch(context, parsed.data);
    if (mismatch) return fail(mismatch, { companyName: [mismatch] });
    const { draft, findings } = scrubEditedDraft(context, parsed.data);
    return ok({ draft, removed: summarize(findings) });
  } catch (error) {
    if (error instanceof ShareError) return fail(error.message);
    throw error;
  }
}

/**
 * Publishes the previewed draft as a NEW community report (pending moderation).
 * The draft must already be clean: if the scrub would still change anything,
 * the user is sent back to the preview so what they confirmed is exactly what
 * gets published. The public record has no reference to the user or debrief;
 * only the user's private debrief remembers the report id.
 */
export async function publishShareAction(
  roundId: string,
  input: ReportDraft,
): Promise<ActionResult<{ reportId: string }>> {
  const parsed = ReportDraftSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields", fieldErrorsFrom(parsed.error));
  try {
    const { user, context } = await load(roundId);
    if (context.debrief.publishedReportIds.length >= 10) {
      return fail("You have already shared this round several times");
    }
    const mismatch = companyMismatch(context, parsed.data);
    if (mismatch) return fail(mismatch, { companyName: [mismatch] });
    const { draft, findings } = scrubEditedDraft(context, parsed.data);
    if (findings.length > 0 || !isDeepStrictEqual(draft, parsed.data)) {
      return fail("We found more personal details. Review the preview again before publishing.");
    }
    const limit = rateLimit(`publish:${user.id}`, RATE_LIMITS.publish);
    if (!limit.ok) return fail("You have published a lot today. Try again tomorrow.");

    const report = await getCommunityService().submit(draft);
    await debriefsFor(user.id).markPublished(roundId, report.id);
    revalidatePath(`/interviews/rounds/${roundId}/share`);
    revalidatePath("/interviews/calendar");
    return ok({ reportId: report.id });
  } catch (error) {
    if (error instanceof ShareError) return fail(error.message);
    throw error;
  }
}

/** Removes one of the user's own shared reports. Ownership comes from their private debrief. */
export async function unpublishReportAction(
  roundId: string,
  reportId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!Id.safeParse(roundId).success || !Id.safeParse(reportId).success) {
    return fail("Invalid report");
  }
  const debriefs = debriefsFor(user.id);
  const debrief = await debriefs.get(roundId);
  if (!debrief?.publishedReportIds.includes(reportId)) return fail("Report not found");
  await getCommunityService().remove(reportId);
  await debriefs.unmarkPublished(reportId);
  revalidatePath(`/interviews/rounds/${roundId}/share`);
  revalidatePath("/intel");
  return ok();
}

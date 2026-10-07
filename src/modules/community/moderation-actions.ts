"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { audit } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/auth/service";

import { ModerationNoteSchema, type ReportDraft, ReportDraftSchema } from "./schemas";
import { CommunityError, getCommunityService } from "./service";

const Id = z.uuid();

function refresh(reportId: string) {
  revalidatePath("/admin/moderation");
  revalidatePath("/intel");
  revalidatePath(`/intel/reports/${reportId}`);
}

async function moderate(
  reportId: string,
  action: string,
  details: string,
  run: () => Promise<unknown>,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!Id.safeParse(reportId).success) return fail("Invalid report");
  try {
    await run();
  } catch (error) {
    if (error instanceof CommunityError) return fail(error.message);
    throw error;
  }
  await audit({
    actorUserId: admin.id,
    action,
    entityType: "interview-report",
    entityId: reportId,
    details,
  });
  refresh(reportId);
  return ok();
}

export async function approveReportAction(reportId: string): Promise<ActionResult> {
  return moderate(reportId, "report.approve", "", () => getCommunityService().approve(reportId));
}

export async function hideReportAction(reportId: string, note: string): Promise<ActionResult> {
  const parsed = ModerationNoteSchema.safeParse(note);
  if (!parsed.success) return fail("Keep the note under 500 characters");
  return moderate(reportId, "report.hide", parsed.data, () =>
    getCommunityService().hide(reportId, parsed.data),
  );
}

export async function dismissFlagsAction(reportId: string): Promise<ActionResult> {
  return moderate(reportId, "report.dismiss-flags", "", () =>
    getCommunityService().dismissFlags(reportId),
  );
}

export async function deleteReportAction(reportId: string): Promise<ActionResult> {
  return moderate(reportId, "report.delete", "", () => getCommunityService().remove(reportId));
}

/** Edit for anonymity. The edited text is pattern-scrubbed again by the service. */
export async function editReportAction(
  reportId: string,
  input: ReportDraft,
  note: string,
): Promise<ActionResult> {
  const parsed = ReportDraftSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields", fieldErrorsFrom(parsed.error));
  const parsedNote = ModerationNoteSchema.safeParse(note);
  if (!parsedNote.success) return fail("Keep the note under 500 characters");
  return moderate(reportId, "report.edit", parsedNote.data, () =>
    getCommunityService().edit(reportId, parsed.data, parsedNote.data),
  );
}

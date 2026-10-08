"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, ok } from "@/lib/forms";
import { audit } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/auth/service";

import { MockError, mockModeration } from "./service";

const Id = z.uuid();

/**
 * Closes a mock interview report. `pauseDays` > 0 pauses the reported user's
 * booking, 0 just dismisses, -1 lifts an existing pause.
 */
export async function resolveMockReportAction(
  reportId: string,
  pauseDays: number,
  note: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!Id.safeParse(reportId).success) return fail("Invalid report");
  const days = z.number().int().min(0).max(90).safeParse(pauseDays);
  if (!days.success) return fail("Pause must be 0–90 days");
  const resolution =
    note.trim().slice(0, 200) || (days.data ? `Paused ${days.data} days` : "Dismissed");
  try {
    const report = await mockModeration.resolve(reportId, resolution);
    if (days.data !== 0) {
      await mockModeration.suspend(report.reportedUserId, Math.max(0, days.data));
    }
    await audit({
      actorUserId: admin.id,
      action:
        days.data > 0
          ? "mock.pause-user"
          : days.data < 0
            ? "mock.lift-pause"
            : "mock.dismiss-report",
      entityType: "mock-report",
      entityId: reportId,
      details: resolution,
    });
  } catch (error) {
    if (error instanceof MockError) return fail(error.message);
    throw error;
  }
  revalidatePath("/admin/moderation");
  return ok();
}

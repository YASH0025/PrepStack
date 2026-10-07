"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";
import { getCommunityService } from "@/modules/community/service";

import { reportBookmarksFor } from "./service";

/** Private bookmark toggle for a public report. */
export async function toggleBookmarkAction(
  reportId: string,
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const user = await requireUser();
  if (!z.uuid().safeParse(reportId).success) return fail("Invalid report");
  const bookmarks = reportBookmarksFor(user.id);
  // Removing is always allowed (the report may have been hidden since).
  if (
    !(await bookmarks.ids()).has(reportId) &&
    !(await getCommunityService().getPublished(reportId))
  ) {
    return fail("Report not found");
  }
  const bookmarked = await bookmarks.toggle(reportId);
  revalidatePath("/intel");
  return ok({ bookmarked });
}

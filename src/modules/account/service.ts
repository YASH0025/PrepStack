import "server-only";

import { getStorageService } from "@/lib/services/file-storage";
import { deletePrivateUserDir } from "@/lib/storage/paths";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { getAuth } from "@/modules/auth/service";
import { reportBookmarksFor } from "@/modules/bookmarks/service";
import { codingFor } from "@/modules/coding/service";
import { getCommunityService } from "@/modules/community/service";
import { mockFor } from "@/modules/mock/service";
import { passportFor } from "@/modules/passport/service";
import { noticePlannerFor } from "@/modules/notice-planner/service";
import { notificationsFor } from "@/modules/notifications/service";
import { profileServiceFor } from "@/modules/profile/service";
import { progressServiceFor } from "@/modules/progress/service";
import { reviewServiceFor } from "@/modules/review/service";
import { revisionSheetFor } from "@/modules/revision-sheet/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";
import { storyBankFor } from "@/modules/story-bank/service";
import { debriefsFor } from "@/modules/tracker/debrief-service";
import { deleteAttachmentFiles } from "@/modules/tracker/hooks";
import { trackerFor } from "@/modules/tracker/service";

import { type DeleteAccountInput } from "./schemas";

/**
 * Everything stored about the user, decrypted, for their own download. Built
 * only from the authenticated user's id; contains no other user's data.
 */
export async function buildAccountExport(userId: string) {
  const user = await (await getAuth()).getAccount(userId);
  const tracker = trackerFor(userId);
  const progress = progressServiceFor(userId);
  const debriefs = debriefsFor(userId);
  const [
    profile,
    assessments,
    roadmap,
    topicProgress,
    savedQuestions,
    applications,
    rounds,
    customFields,
    debriefList,
    stories,
    reviewCards,
    noticePlan,
    sheetState,
    bookmarks,
    notifications,
    coding,
    systemDesign,
  ] = await Promise.all([
    profileServiceFor(userId).get(),
    assessmentServiceFor(userId).history(),
    roadmapServiceFor(userId).get(),
    progress.all(),
    progress.savedQuestions(),
    tracker.listApplications(),
    tracker.listRounds(),
    tracker.listCustomFields(),
    debriefs.list(),
    storyBankFor(userId).list(),
    reviewServiceFor(userId).list(),
    noticePlannerFor(userId).get(),
    revisionSheetFor(userId).listState(),
    reportBookmarksFor(userId).list(),
    notificationsFor(userId).list(),
    codingFor(userId).list(),
    codingFor(userId).listDesign(),
  ]);
  const sharedIds = debriefList.flatMap((debrief) => debrief.publishedReportIds);
  const sharedReports = await getCommunityService().getMany(sharedIds);
  return {
    exportedAt: new Date().toISOString(),
    format: "prepstack-export/v1",
    account: user
      ? {
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        }
      : null,
    profile,
    assessments,
    roadmap,
    topicProgress,
    savedQuestions,
    applications,
    // Attachment files are not included; their names and sizes are.
    rounds,
    customFields,
    debriefs: debriefList,
    stories,
    reviewCards,
    noticePlan,
    revisionSheetChecks: sheetState,
    bookmarkedReportIds: bookmarks,
    notifications,
    codingProgress: coding,
    systemDesignPractice: systemDesign,
    sharedReports,
  };
}

/**
 * Deletes the account and ALL private data. Published reports carry no link
 * to the user; with "REMOVE" the ones they shared (known only from their
 * private debriefs) are deleted too, with "ANONYMIZE" they stay as they are.
 */
export async function deleteAccount(
  userId: string,
  input: Pick<DeleteAccountInput, "reports">,
): Promise<void> {
  const community = getCommunityService();
  const [debriefList, rounds] = await Promise.all([
    debriefsFor(userId).list(),
    trackerFor(userId).listRounds(),
  ]);
  if (input.reports === "REMOVE") {
    for (const reportId of debriefList.flatMap((debrief) => debrief.publishedReportIds)) {
      await community.remove(reportId);
    }
  }
  await community.removeUserActivity(userId);
  await mockFor(userId).removeAllMyData();
  await passportFor(userId).removeAll();
  await deleteAttachmentFiles(
    rounds.flatMap((round) => round.attachments.map((attachment) => attachment.storageKey)),
  );
  // Also catches files no round points at any more (failed deletes, avatars).
  const storage = getStorageService();
  if (storage.enabled) await storage.deleteAllForOwner(userId);
  await deletePrivateUserDir(userId);
  await (await getAuth()).deleteUser(userId);
}

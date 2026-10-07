import "server-only";

import { getStorageService } from "@/lib/services/file-storage";
import { getProfile } from "@/modules/profile/service";
import { revisionSheetFor } from "@/modules/revision-sheet/service";
import { reviewServiceFor } from "@/modules/review/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";
import { storyBankFor } from "@/modules/story-bank/service";

import { type SavedDebrief, debriefsFor } from "./debrief-service";
import { type DeletedRound } from "./service";

/**
 * Cross-module reactions to tracker changes. Each module is updated through
 * its own service, never by touching its files.
 */

/** Re-plans the roadmap if the user has one (interview dates and debriefs feed it). */
async function replanRoadmap(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.onboardingCompletedAt) return;
  const roadmap = roadmapServiceFor(userId);
  if (await roadmap.get()) await roadmap.regenerate(profile);
}

/** An interview was added, moved, cancelled or completed: the roadmap deadline may change. */
export async function afterInterviewScheduleChanged(userId: string): Promise<void> {
  await replanRoadmap(userId);
}

/** Deletes uploaded files from storage. Failures are logged, never thrown. */
export async function deleteAttachmentFiles(storageKeys: string[]): Promise<void> {
  const storage = getStorageService();
  if (!storage.enabled) return;
  for (const key of storageKeys) {
    try {
      await storage.delete(key);
    } catch (error) {
      console.error("[tracker] could not delete an attachment from storage:", error);
    }
  }
}

/** Cleans up everything deleted rounds leave behind in other modules. */
export async function afterRoundsDeleted(userId: string, rounds: DeletedRound[]): Promise<void> {
  if (rounds.length === 0) return;
  const ids = rounds.map((round) => round.id);
  await deleteAttachmentFiles(rounds.flatMap((round) => round.storageKeys));
  await debriefsFor(userId).deleteForRounds(ids);
  await revisionSheetFor(userId).deleteForRounds(ids);
  const stories = storyBankFor(userId);
  for (const id of ids) await stories.removeUsageForRound(id);
}

/**
 * A debrief was saved: partial/missed questions the user selected go into
 * review, story usage is updated, and weak topics feed the roadmap.
 */
export async function afterDebriefSaved(
  userId: string,
  roundId: string,
  saved: SavedDebrief,
  companyName: string,
): Promise<{ cardsAdded: number }> {
  const review = reviewServiceFor(userId);
  let cardsAdded = 0;
  for (const question of saved.reviewQuestions) {
    const { created } = await review.addFromSource({
      sourceType: "DEBRIEF_QUESTION",
      sourceId: question.id,
      topicId: question.topicId,
      prompt: `${question.text}\n\n_Asked at ${companyName}._`,
      answer: question.answerNotes,
    });
    if (created) cardsAdded += 1;
  }

  const stories = storyBankFor(userId);
  await stories.removeUsageForRound(roundId);
  for (const question of saved.debrief.questions) {
    if (!question.linkedStoryId) continue;
    try {
      await stories.recordUsage(question.linkedStoryId, roundId, question.id);
    } catch {
      // The story was deleted since the form loaded; nothing to link.
    }
  }

  await replanRoadmap(userId);
  return { cardsAdded };
}

import "server-only";

import { getStorageService } from "@/lib/services/file-storage";
import { getProfile } from "@/modules/profile/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";

import { type DeletedRound } from "./service";

/**
 * Cross-module reactions to tracker changes. Each module is updated through
 * its own service, never by touching its files.
 */

/** An interview was added, moved, cancelled or completed: the roadmap deadline may change. */
export async function afterInterviewScheduleChanged(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.onboardingCompletedAt) return;
  const roadmap = roadmapServiceFor(userId);
  if (await roadmap.get()) await roadmap.regenerate(profile);
}

/** Cleans up what deleted rounds leave behind: uploaded attachments in file storage. */
export async function afterRoundsDeleted(_userId: string, rounds: DeletedRound[]): Promise<void> {
  const storage = getStorageService();
  if (!storage.enabled) return;
  for (const round of rounds) {
    for (const key of round.storageKeys) {
      try {
        await storage.delete(key);
      } catch (error) {
        console.error(`[tracker] could not delete attachment for round ${round.id}:`, error);
      }
    }
  }
}

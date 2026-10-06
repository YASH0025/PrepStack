import "server-only";

import { progressServiceFor } from "@/modules/progress/service";

/**
 * When every LEARN item of a topic is done on the roadmap, the topic counts as
 * completed in topic progress too (unless the user flagged it as difficult).
 */
export async function afterTopicLearned(userId: string, topicId: string): Promise<void> {
  const progress = progressServiceFor(userId);
  const status = await progress.statusOf(topicId);
  if (status !== "DIFFICULT" && status !== "NEEDS_REVISION") {
    await progress.setStatus(topicId, "COMPLETED");
  }
}

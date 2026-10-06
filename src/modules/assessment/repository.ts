import { type CrudRepository } from "@/lib/storage/repository";

import { type AssessmentAttempt } from "./schemas";

export interface AssessmentRepository extends CrudRepository<AssessmentAttempt> {
  /** Most recent attempt for a track, or null. */
  latestForTrack(trackId: string): Promise<AssessmentAttempt | null>;
}

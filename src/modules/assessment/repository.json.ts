import "server-only";

import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";

import { type AssessmentRepository } from "./repository";
import { type AssessmentAttempt, AssessmentAttemptSchema } from "./schemas";

export class JsonAssessmentRepository
  extends JsonRepository<AssessmentAttempt>
  implements AssessmentRepository
{
  constructor(userId: string) {
    super(
      new JsonCollection<AssessmentAttempt>({
        filePath: privatePath(userId, "assessments.json"),
        recordSchema: AssessmentAttemptSchema,
        schemaVersion: 1,
      }),
    );
  }

  async latestForTrack(trackId: string): Promise<AssessmentAttempt | null> {
    const attempts = await this.collection.find((attempt) => attempt.trackId === trackId);
    return attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ?? null;
  }
}

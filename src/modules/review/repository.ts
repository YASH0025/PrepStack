import { type CrudRepository } from "@/lib/storage/repository";
import { type NewRecord } from "@/lib/storage/types";

import { type ReviewCard } from "./schemas";

export interface ReviewCardRepository extends CrudRepository<ReviewCard> {
  /**
   * Creates the card unless one already exists for the same source
   * (sourceType + sourceId). Returns the existing or new card.
   */
  createUnique(input: NewRecord<ReviewCard>): Promise<{ card: ReviewCard; created: boolean }>;
}

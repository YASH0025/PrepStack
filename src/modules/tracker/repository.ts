import { type CrudRepository } from "@/lib/storage/repository";

import { type ApplicationRecord, type CustomField, type RoundRecord } from "./schemas";

export interface ApplicationRepository extends CrudRepository<ApplicationRecord> {
  /** Moves an application to a status column at a position (kanban). */
  move(
    id: string,
    status: ApplicationRecord["status"],
    order: number,
  ): Promise<ApplicationRecord | null>;
}

export interface RoundRepository extends CrudRepository<RoundRecord> {
  listForApplication(applicationId: string): Promise<RoundRecord[]>;
  deleteForApplication(applicationId: string): Promise<number>;
  /** Atomically marks a round rescheduled and creates its replacement. */
  reschedule(
    oldId: string,
    replacement: Omit<RoundRecord, "id" | "createdAt" | "updatedAt">,
    patchOld: Partial<RoundRecord>,
  ): Promise<{ oldRound: RoundRecord; newRound: RoundRecord } | null>;
}

export type CustomFieldRepository = CrudRepository<CustomField>;

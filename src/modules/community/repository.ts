import { type CrudRepository } from "@/lib/storage/repository";

import { type InterviewReport, type ReportFlag } from "./schemas";

export type ReportRepository = CrudRepository<InterviewReport>;

export interface VoteRepository {
  /** Adds or removes the user's "useful" vote. Returns whether it is now set. */
  toggle(reportId: string, userId: string): Promise<boolean>;
  countFor(reportId: string): Promise<number>;
  reportIdsVotedBy(userId: string): Promise<Set<string>>;
  deleteForReport(reportId: string): Promise<void>;
  deleteForUser(userId: string): Promise<void>;
}

export interface FlagRepository extends CrudRepository<ReportFlag> {
  /** True when the user already has an OPEN flag on the report. */
  hasOpenFlag(reportId: string, userId: string): Promise<boolean>;
  resolveForReport(reportId: string, resolution: string): Promise<number>;
  deleteForReport(reportId: string): Promise<void>;
  deleteForUser(userId: string): Promise<void>;
}

import "server-only";

import { randomUUID } from "node:crypto";

import { JsonCollection } from "@/lib/storage/json-collection";
import { communityPath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";

import { type FlagRepository, type ReportRepository, type VoteRepository } from "./repository";
import {
  type InterviewReport,
  InterviewReportSchema,
  type ReportFlag,
  ReportFlagSchema,
  type ReportVote,
  ReportVoteSchema,
} from "./schemas";

/**
 * PUBLIC community storage. Only ever reads and writes data/community/*.json —
 * never anything under data/private/.
 */
export class JsonReportRepository
  extends JsonRepository<InterviewReport>
  implements ReportRepository
{
  constructor() {
    super(
      new JsonCollection<InterviewReport>({
        filePath: communityPath("reports.json"),
        recordSchema: InterviewReportSchema,
        schemaVersion: 1,
      }),
    );
  }
}

export class JsonVoteRepository implements VoteRepository {
  private readonly collection = new JsonCollection<ReportVote>({
    filePath: communityPath("votes.json"),
    recordSchema: ReportVoteSchema,
    schemaVersion: 1,
  });

  toggle(reportId: string, userId: string): Promise<boolean> {
    return this.collection.transaction((records) => {
      const existing = records.find(
        (record) => record.reportId === reportId && record.userId === userId,
      );
      if (existing) {
        return { records: records.filter((record) => record !== existing), result: false };
      }
      const now = new Date().toISOString();
      const vote = ReportVoteSchema.parse({
        id: randomUUID(),
        reportId,
        userId,
        createdAt: now,
        updatedAt: now,
      });
      return { records: [...records, vote], result: true };
    });
  }

  async countFor(reportId: string): Promise<number> {
    return (await this.collection.list()).filter((record) => record.reportId === reportId).length;
  }

  async reportIdsVotedBy(userId: string): Promise<Set<string>> {
    const records = await this.collection.list();
    return new Set(
      records.filter((record) => record.userId === userId).map((record) => record.reportId),
    );
  }

  deleteForReport(reportId: string): Promise<void> {
    return this.collection.transaction((records) => ({
      records: records.filter((record) => record.reportId !== reportId),
      result: undefined,
    }));
  }

  deleteForUser(userId: string): Promise<void> {
    return this.collection.transaction((records) => ({
      records: records.filter((record) => record.userId !== userId),
      result: undefined,
    }));
  }
}

export class JsonFlagRepository extends JsonRepository<ReportFlag> implements FlagRepository {
  constructor() {
    super(
      new JsonCollection<ReportFlag>({
        filePath: communityPath("flags.json"),
        recordSchema: ReportFlagSchema,
        schemaVersion: 1,
      }),
    );
  }

  async hasOpenFlag(reportId: string, userId: string): Promise<boolean> {
    return (await this.list()).some(
      (flag) => flag.reportId === reportId && flag.userId === userId && flag.status === "OPEN",
    );
  }

  resolveForReport(reportId: string, resolution: string): Promise<number> {
    return this.collection.transaction((records) => {
      let count = 0;
      const now = new Date().toISOString();
      const next = records.map((record) => {
        if (record.reportId !== reportId || record.status !== "OPEN") return record;
        count += 1;
        return { ...record, status: "RESOLVED" as const, resolution, updatedAt: now };
      });
      return { records: next, result: count };
    });
  }

  deleteForReport(reportId: string): Promise<void> {
    return this.collection.transaction((records) => ({
      records: records.filter((record) => record.reportId !== reportId),
      result: undefined,
    }));
  }

  deleteForUser(userId: string): Promise<void> {
    return this.collection.transaction((records) => ({
      records: records.filter((record) => record.userId !== userId),
      result: undefined,
    }));
  }
}

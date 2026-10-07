import "server-only";

import { randomUUID } from "node:crypto";

import { JsonSingleton } from "@/lib/storage/json-singleton";
import { privatePath } from "@/lib/storage/paths";

import { type ReportBookmarkRepository } from "./repository";
import { type ReportBookmarks, ReportBookmarksSchema } from "./schemas";

const MAX = 500;

export class JsonReportBookmarkRepository implements ReportBookmarkRepository {
  private readonly file: JsonSingleton<ReportBookmarks>;

  constructor(userId: string) {
    this.file = new JsonSingleton<ReportBookmarks>({
      filePath: privatePath(userId, "report-bookmarks.json"),
      recordSchema: ReportBookmarksSchema,
      schemaVersion: 1,
    });
  }

  async list(): Promise<string[]> {
    return (await this.file.get())?.reportIds ?? [];
  }

  async toggle(reportId: string): Promise<boolean> {
    let added = false;
    await this.file.mutate((current) => {
      const ids = current?.reportIds ?? [];
      added = !ids.includes(reportId);
      const next = added ? [reportId, ...ids].slice(0, MAX) : ids.filter((id) => id !== reportId);
      const now = new Date().toISOString();
      return ReportBookmarksSchema.parse({
        id: current?.id ?? randomUUID(),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
        reportIds: next,
      });
    });
    return added;
  }

  async remove(reportIds: string[]): Promise<void> {
    const drop = new Set(reportIds);
    await this.file.mutate((current) =>
      current
        ? { ...current, reportIds: current.reportIds.filter((id) => !drop.has(id)) }
        : current,
    );
  }
}

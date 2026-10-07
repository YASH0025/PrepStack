import "server-only";

import { type ReportBookmarkRepository } from "./repository";
import { JsonReportBookmarkRepository } from "./repository.json";

export class ReportBookmarkService {
  constructor(private readonly repo: ReportBookmarkRepository) {}

  async ids(): Promise<Set<string>> {
    return new Set(await this.repo.list());
  }

  /** Newest first. */
  list(): Promise<string[]> {
    return this.repo.list();
  }

  toggle(reportId: string): Promise<boolean> {
    return this.repo.toggle(reportId);
  }

  /** Drops bookmarks of reports that no longer exist or are no longer public. */
  prune(reportIds: string[]): Promise<void> {
    return reportIds.length ? this.repo.remove(reportIds) : Promise.resolve();
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function reportBookmarksFor(userId: string): ReportBookmarkService {
  return new ReportBookmarkService(new JsonReportBookmarkRepository(userId));
}

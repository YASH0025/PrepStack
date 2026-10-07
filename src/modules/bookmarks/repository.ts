export interface ReportBookmarkRepository {
  list(): Promise<string[]>;
  /** Adds or removes a report id. Returns whether it is now bookmarked. */
  toggle(reportId: string): Promise<boolean>;
  remove(reportIds: string[]): Promise<void>;
}

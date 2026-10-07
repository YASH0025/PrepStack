import "server-only";

import { env } from "@/lib/env";
import { companyKey, slugify } from "@/lib/domain";

import { scrubDraft } from "./domain/anonymizer";
import { type FrequencyScope, type TopicFrequency, topicFrequency } from "./domain/frequency";
import { type ReportFilters, searchReports } from "./domain/search";
import { type FlagRepository, type ReportRepository, type VoteRepository } from "./repository";
import { JsonFlagRepository, JsonReportRepository, JsonVoteRepository } from "./repository.json";
import {
  type FlagReason,
  type InterviewReport,
  type ReportDraft,
  ReportDraftSchema,
  type ReportFlag,
} from "./schemas";

export class CommunityError extends Error {}

export function slugForCompany(name: string): string {
  return companyKey(name) || slugify(name) || "company";
}

/**
 * PUBLIC community data: reports, votes and flags. This service has no access
 * to any user's private data — callers hand it an already-anonymized draft.
 * Reports carry no author id; authors keep the link privately (debriefs).
 */
export class CommunityService {
  constructor(
    private readonly reports: ReportRepository,
    private readonly votes: VoteRepository,
    private readonly flags: FlagRepository,
  ) {}

  /**
   * Stores a new report for moderation. The draft is validated and pattern-
   * scrubbed once more (emails, phones, links, amounts, dates) as a last line
   * of defence; personal names were removed by the caller's anonymizer pass.
   */
  async submit(input: ReportDraft): Promise<InterviewReport> {
    const draft = scrubDraft(ReportDraftSchema.parse(input), []).draft;
    return this.reports.create({
      ...draft,
      companySlug: slugForCompany(draft.companyName),
      status: "PENDING",
      usefulCount: 0,
      publishedAt: null,
      moderationNote: null,
    });
  }

  async search(filters: ReportFilters, today: string) {
    return searchReports(await this.reports.list(), filters, today);
  }

  async listPublished(): Promise<InterviewReport[]> {
    return (await this.reports.list()).filter((report) => report.status === "PUBLISHED");
  }

  /** A report visible to everyone, or null (pending and hidden reports are not public). */
  async getPublished(id: string): Promise<InterviewReport | null> {
    const report = await this.reports.getById(id);
    return report?.status === "PUBLISHED" ? report : null;
  }

  /** Any report regardless of status. For moderators and for authors via their private links. */
  get(id: string): Promise<InterviewReport | null> {
    return this.reports.getById(id);
  }

  /** Status of several reports (authors' "my reports" list). */
  async getMany(ids: string[]): Promise<InterviewReport[]> {
    const wanted = new Set(ids);
    return (await this.reports.list()).filter((report) => wanted.has(report.id));
  }

  async companies(): Promise<string[]> {
    const names = new Map<string, string>();
    for (const report of await this.listPublished()) {
      if (!names.has(report.companySlug)) names.set(report.companySlug, report.companyName);
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }

  async recentForCompanies(slugs: string[], limit = 5): Promise<InterviewReport[]> {
    const wanted = new Set(slugs);
    return (await this.listPublished())
      .filter((report) => wanted.has(report.companySlug))
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, limit);
  }

  /**
   * Topic frequency for a scope. Callers must compare `sampleSize` with
   * `minSample` and show "Not enough data yet" below it.
   */
  async topicFrequency(
    scope: FrequencyScope,
    today: string,
  ): Promise<TopicFrequency & { minSample: number }> {
    return {
      ...topicFrequency(await this.reports.list(), scope, today),
      minSample: env.COMMUNITY_MIN_SAMPLE,
    };
  }

  async toggleVote(reportId: string, userId: string): Promise<{ voted: boolean; count: number }> {
    if (!(await this.getPublished(reportId))) throw new CommunityError("Report not found");
    const voted = await this.votes.toggle(reportId, userId);
    const count = await this.votes.countFor(reportId);
    await this.reports.update(reportId, { usefulCount: count });
    return { voted, count };
  }

  votedIds(userId: string): Promise<Set<string>> {
    return this.votes.reportIdsVotedBy(userId);
  }

  async flag(
    reportId: string,
    userId: string,
    reason: FlagReason,
    note: string,
  ): Promise<{ created: boolean }> {
    if (!(await this.getPublished(reportId))) throw new CommunityError("Report not found");
    if (await this.flags.hasOpenFlag(reportId, userId)) return { created: false };
    await this.flags.create({
      reportId,
      userId,
      reason,
      note: note.trim().slice(0, 500),
      status: "OPEN",
      resolution: null,
    });
    return { created: true };
  }

  /** Permanently removes a report with its votes and flags. */
  async remove(reportId: string): Promise<boolean> {
    await this.votes.deleteForReport(reportId);
    await this.flags.deleteForReport(reportId);
    return this.reports.delete(reportId);
  }

  /** Votes and flags are tied to accounts; drop them when an account is deleted. */
  async removeUserActivity(userId: string): Promise<void> {
    const voted = await this.votes.reportIdsVotedBy(userId);
    await this.votes.deleteForUser(userId);
    await this.flags.deleteForUser(userId);
    for (const reportId of voted) {
      await this.reports.update(reportId, { usefulCount: await this.votes.countFor(reportId) });
    }
  }

  /* ----------------------------- moderation ----------------------------- */

  async moderationQueue(): Promise<{
    pending: InterviewReport[];
    flagged: { report: InterviewReport; flags: ReportFlag[] }[];
    hidden: InterviewReport[];
  }> {
    const [reports, flags] = await Promise.all([this.reports.list(), this.flags.list()]);
    const openFlags = new Map<string, ReportFlag[]>();
    for (const flag of flags) {
      if (flag.status !== "OPEN") continue;
      const list = openFlags.get(flag.reportId) ?? [];
      list.push(flag);
      openFlags.set(flag.reportId, list);
    }
    const byCreated = (a: InterviewReport, b: InterviewReport) =>
      a.createdAt.localeCompare(b.createdAt);
    return {
      pending: reports.filter((report) => report.status === "PENDING").sort(byCreated),
      flagged: reports
        .filter((report) => openFlags.has(report.id) && report.status !== "PENDING")
        .map((report) => ({ report, flags: openFlags.get(report.id) ?? [] })),
      hidden: reports
        .filter((report) => report.status === "HIDDEN")
        .sort(byCreated)
        .reverse(),
    };
  }

  async openFlagsFor(reportId: string): Promise<ReportFlag[]> {
    return (await this.flags.list()).filter(
      (flag) => flag.reportId === reportId && flag.status === "OPEN",
    );
  }

  async approve(reportId: string): Promise<InterviewReport> {
    const report = await this.requireReport(reportId);
    const updated = await this.reports.update(reportId, {
      status: "PUBLISHED",
      publishedAt: report.publishedAt ?? new Date().toISOString(),
      moderationNote: null,
    });
    await this.flags.resolveForReport(reportId, "Approved");
    return updated as InterviewReport;
  }

  async hide(reportId: string, note: string): Promise<InterviewReport> {
    await this.requireReport(reportId);
    const updated = await this.reports.update(reportId, {
      status: "HIDDEN",
      moderationNote: note.trim().slice(0, 500) || null,
    });
    await this.flags.resolveForReport(reportId, "Hidden");
    return updated as InterviewReport;
  }

  /** Moderator edit for anonymity. Status is unchanged; patterns are scrubbed again. */
  async edit(reportId: string, input: ReportDraft, note: string): Promise<InterviewReport> {
    await this.requireReport(reportId);
    const draft = scrubDraft(ReportDraftSchema.parse(input), []).draft;
    const updated = await this.reports.update(reportId, {
      ...draft,
      companySlug: slugForCompany(draft.companyName),
      moderationNote: note.trim().slice(0, 500) || null,
    });
    await this.flags.resolveForReport(reportId, "Edited");
    return updated as InterviewReport;
  }

  async dismissFlags(reportId: string): Promise<number> {
    return this.flags.resolveForReport(reportId, "Dismissed");
  }

  private async requireReport(reportId: string): Promise<InterviewReport> {
    const report = await this.reports.getById(reportId);
    if (!report) throw new CommunityError("Report not found");
    return report;
  }
}

let instance: CommunityService | null = null;

export function getCommunityService(): CommunityService {
  instance ??= new CommunityService(
    new JsonReportRepository(),
    new JsonVoteRepository(),
    new JsonFlagRepository(),
  );
  return instance;
}

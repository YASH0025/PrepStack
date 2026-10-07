/**
 * Interview Intel search (PURE): filters and sorts published reports.
 */
import { z } from "zod";

import { ExperienceBandSchema, RoundTypeSchema, companyKey } from "@/lib/domain";

import { type InterviewReport } from "../schemas";

export const RECENCY_OPTIONS = ["3", "6", "12", "all"] as const;
export const SORT_OPTIONS = ["recent", "useful"] as const;

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankToUndefined, schema.optional()).catch(undefined);

/** Parsed from URL search params; anything invalid is ignored rather than erroring. */
export const ReportFiltersSchema = z.object({
  q: optional(z.string().trim().max(100)),
  company: optional(z.string().trim().max(120)),
  role: optional(z.string().trim().max(120)),
  tech: optional(z.string().trim().max(40)),
  band: optional(ExperienceBandSchema),
  round: optional(RoundTypeSchema),
  topic: optional(z.uuid()),
  difficulty: optional(z.coerce.number().int().min(1).max(5)),
  recency: z.enum(RECENCY_OPTIONS).catch("all").default("all"),
  sort: z.enum(SORT_OPTIONS).catch("recent").default("recent"),
  page: z.coerce.number().int().min(1).max(1000).catch(1).default(1),
});
export type ReportFilters = z.infer<typeof ReportFiltersSchema>;

export const PAGE_SIZE = 20;

const includes = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase());

/** "yyyy-MM" `months` months before the month of `today` ("yyyy-MM-dd"). */
export function monthsAgo(today: string, months: number): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const total = year * 12 + (month - 1) - months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function matchesFilters(
  report: InterviewReport,
  filters: ReportFilters,
  today: string,
): boolean {
  if (filters.company && companyKey(filters.company) !== report.companySlug) {
    if (!includes(report.companyName, filters.company)) return false;
  }
  if (filters.role && !includes(report.roleTitle, filters.role)) return false;
  if (filters.tech && !report.technologies.some((tech) => includes(tech, filters.tech ?? ""))) {
    return false;
  }
  if (filters.band && report.experienceBand !== filters.band) return false;
  if (filters.round && !report.rounds.some((round) => round.type === filters.round)) return false;
  if (
    filters.topic &&
    !report.rounds.some((round) => round.questions.some((q) => q.topicId === filters.topic))
  ) {
    return false;
  }
  if (filters.difficulty && report.overallDifficulty !== filters.difficulty) return false;
  if (filters.recency !== "all") {
    // Inclusive: "last 3 months" in October covers July–October.
    if (report.monthYear < monthsAgo(today, Number(filters.recency))) return false;
  }
  if (filters.q) {
    const text = [
      report.companyName,
      report.roleTitle,
      report.summary,
      ...report.technologies,
      ...report.rounds.flatMap((round) =>
        round.questions.flatMap((question) => [question.text, question.topicLabel ?? ""]),
      ),
    ].join("\n");
    if (!includes(text, filters.q)) return false;
  }
  return true;
}

export function searchReports(
  reports: InterviewReport[],
  filters: ReportFilters,
  today: string,
): { items: InterviewReport[]; total: number; pages: number } {
  const matched = reports
    .filter((report) => report.status === "PUBLISHED")
    .filter((report) => matchesFilters(report, filters, today))
    .sort((a, b) => {
      if (filters.sort === "useful" && a.usefulCount !== b.usefulCount) {
        return b.usefulCount - a.usefulCount;
      }
      if (a.monthYear !== b.monthYear) return a.monthYear < b.monthYear ? 1 : -1;
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    });
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  return {
    items: matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: matched.length,
    pages,
  };
}

/** All distinct topic ids mentioned in a report, in order of appearance. */
export function reportTopicIds(report: Pick<InterviewReport, "rounds">): string[] {
  const ids = new Set<string>();
  for (const round of report.rounds) {
    for (const question of round.questions) if (question.topicId) ids.add(question.topicId);
  }
  return [...ids];
}

/**
 * Aggregated topic frequency (PURE). How many published reports in a scope
 * (company, role, experience band) mention each topic. Each report counts a
 * topic at most once. Callers must only show or use the numbers when
 * `sampleSize` reaches the configured threshold, and always with the sample
 * size and date range.
 */
import { type ExperienceBand, companyKey } from "@/lib/domain";

import { type InterviewReport } from "../schemas";
import { monthsAgo, reportTopicIds } from "./search";

export interface FrequencyScope {
  /** Company name or key; matched with the normalised company key. */
  company?: string;
  /** Target role name from the catalog, e.g. "Frontend Engineer". */
  roleName?: string;
  band?: ExperienceBand;
  /** Only reports from the last N months (default 24). */
  months?: number;
}

export interface TopicFrequency {
  sampleSize: number;
  /** Reports mentioning each topic id. */
  topicCounts: Record<string, number>;
  /** Earliest and latest report month ("yyyy-MM"), or null with no reports. */
  from: string | null;
  to: string | null;
}

/** Words that say nothing about the specialisation of a role. */
const GENERIC = new Set([
  "software",
  "engineer",
  "engineering",
  "developer",
  "development",
  "dev",
  "sde",
  "swe",
  "senior",
  "sr",
  "junior",
  "jr",
  "lead",
  "staff",
  "principal",
  "associate",
  "intern",
  "trainee",
  "member",
  "technical",
  "of",
  "the",
  "and",
  "i",
  "ii",
  "iii",
  "iv",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/front[\s-]+end/g, "frontend")
    .replace(/back[\s-]+end/g, "backend")
    .replace(/full[\s-]+stack/g, "fullstack")
    .split(/[^a-z0-9.+#]+/)
    .filter((token) => token && !GENERIC.has(token) && !/^\d+$/.test(token));
}

/**
 * Whether a free-text report role matches a catalog role: any specialisation
 * word of the catalog role ("frontend", "android", "data") appears in the
 * report's role title. A catalog role with only generic words matches all.
 */
export function roleMatches(reportRole: string, roleName: string): boolean {
  const wanted = tokens(roleName);
  if (wanted.length === 0) return true;
  const have = new Set(tokens(reportRole));
  return wanted.some((token) => have.has(token));
}

export function topicFrequency(
  reports: InterviewReport[],
  scope: FrequencyScope,
  today: string,
): TopicFrequency {
  const since = monthsAgo(today, scope.months ?? 24);
  const key = scope.company ? companyKey(scope.company) : null;
  const matching = reports.filter(
    (report) =>
      report.status === "PUBLISHED" &&
      report.monthYear >= since &&
      (key === null || report.companySlug === key) &&
      (!scope.roleName || roleMatches(report.roleTitle, scope.roleName)) &&
      (!scope.band || report.experienceBand === scope.band),
  );
  const topicCounts: Record<string, number> = {};
  let from: string | null = null;
  let to: string | null = null;
  for (const report of matching) {
    for (const topicId of reportTopicIds(report))
      topicCounts[topicId] = (topicCounts[topicId] ?? 0) + 1;
    if (from === null || report.monthYear < from) from = report.monthYear;
    if (to === null || report.monthYear > to) to = report.monthYear;
  }
  return { sampleSize: matching.length, topicCounts, from, to };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(monthYear: string): { month: string; year: string } {
  return { month: MONTHS[Number(monthYear.slice(5, 7)) - 1] ?? "", year: monthYear.slice(0, 4) };
}

/** "yyyy-MM" → "Sep 2026". */
export function monthYearLabel(monthYear: string): string {
  const { month, year } = monthLabel(monthYear);
  return `${month} ${year}`;
}

/** "Sep 2026", "Jan–Sep 2026" or "Nov 2025 – Sep 2026". */
export function rangeLabel(from: string | null, to: string | null): string {
  if (!from || !to) return "";
  const a = monthLabel(from);
  const b = monthLabel(to);
  if (from === to) return `${a.month} ${a.year}`;
  if (a.year === b.year) return `${a.month}–${b.month} ${b.year}`;
  return `${a.month} ${a.year} – ${b.month} ${b.year}`;
}

/** Topics sorted by count (then id for stability), limited to `limit`. */
export function topTopics(
  frequency: TopicFrequency,
  limit = 10,
): { topicId: string; count: number }[] {
  return Object.entries(frequency.topicCounts)
    .map(([topicId, count]) => ({ topicId, count }))
    .sort((a, b) => b.count - a.count || a.topicId.localeCompare(b.topicId))
    .slice(0, limit);
}

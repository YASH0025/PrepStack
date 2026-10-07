import Link from "next/link";
import { Bookmark, Gauge, ThumbsUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BAND_LABELS, ROUND_TYPE_LABELS } from "@/lib/domain";

import { reportTopicIds } from "../domain/search";
import { type InterviewReport } from "../schemas";
import { OutcomeBadge, formatMonthYear } from "./report-view";

/** Compact search result. */
export function ReportCard({
  report,
  topicNames,
  bookmarked = false,
  hrefBase = "/intel/reports",
}: {
  report: InterviewReport;
  topicNames: Record<string, string>;
  bookmarked?: boolean;
  /** "/reports" on public pages. */
  hrefBase?: string;
}) {
  const topics = [
    ...reportTopicIds(report).map((id) => topicNames[id]),
    ...report.rounds.flatMap((round) => round.questions.map((question) => question.topicLabel)),
  ].filter((name): name is string => Boolean(name));
  const uniqueTopics = [...new Set(topics)];
  const questionCount = report.rounds.reduce((sum, round) => sum + round.questions.length, 0);
  return (
    <li className="relative grid gap-2 rounded-lg border p-4 transition-colors hover:bg-accent/40">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <Link
          href={`${hrefBase}/${report.id}`}
          className="font-medium after:absolute after:inset-0 hover:underline"
        >
          {report.companyName}
        </Link>
        <span className="text-sm text-muted-foreground">· {report.roleTitle}</span>
        {bookmarked && (
          <Bookmark className="ml-auto size-4 fill-current text-primary" aria-label="Saved" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <OutcomeBadge outcome={report.outcome} />
        <span>{formatMonthYear(report.monthYear)}</span>
        <span>· {BAND_LABELS[report.experienceBand]}</span>
        <span>· {report.rounds.map((round) => ROUND_TYPE_LABELS[round.type]).join(", ")}</span>
        <span className="inline-flex items-center gap-1">
          · <Gauge className="size-3.5" aria-hidden /> {report.overallDifficulty}/5
        </span>
        <span>
          · {questionCount} question{questionCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1">
          · <ThumbsUp className="size-3.5" aria-hidden /> {report.usefulCount}
          <span className="sr-only">found this useful</span>
        </span>
      </div>
      {uniqueTopics.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
          {uniqueTopics.slice(0, 6).map((topic) => (
            <li key={topic}>
              <Badge variant="secondary">{topic}</Badge>
            </li>
          ))}
          {uniqueTopics.length > 6 && (
            <li className="text-xs text-muted-foreground">+{uniqueTopics.length - 6} more</li>
          )}
        </ul>
      )}
    </li>
  );
}

export function CommunityDisclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      Reports are shared by candidates and anonymized before publishing. They describe personal
      experiences — not official or guaranteed questions.
    </p>
  );
}
